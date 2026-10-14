// The logic of sync-values.mjs, without I/O: value normalizers, finding a declaration in the
// CSS ("slot") and rewriting it in place, the role map.

// ---------------------------------------------------------------------------
// Normalizers: two values are the same when their normal forms are equal
// ---------------------------------------------------------------------------
export const nHex = (v) => {
  v = String(v).trim().toLowerCase();
  const m = /^#([0-9a-f]{3})$/.exec(v);
  return m ? '#' + [...m[1]].map((c) => c + c).join('') : v;
};
export const nShadow = (v) =>
  String(v)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(\d*\.\d+)/g, (x) => String(parseFloat(x)))
    .replace(/\s*,\s*/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
export const nFamily = (v) =>
  String(v || '')
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
/** px → rem as a number; rem and em stay as they are; anything else is returned as a trimmed string. */
export const toRem = (v) => {
  if (v == null) return null;
  const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(String(v).trim());
  if (!m) return String(v).trim();
  const n = parseFloat(m[1]);
  return m[2] === 'px' ? n / 16 : n;
};
export const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : a === b);
export const pxLabel = (v) => (typeof v === 'number' ? `${Math.round(v * 16 * 100) / 100}px` : String(v));
export const remStr = (v) => {
  const n = toRem(v);
  return typeof n === 'number' ? `${+n.toFixed(4)}rem` : String(v);
};

// ---------------------------------------------------------------------------
// Slots: where a value lives in the text, so it can be rewritten in place
// ---------------------------------------------------------------------------
/** The range inside the braces of the first block whose opening matches selectorRe. */
export function blockOf(text, selectorRe) {
  const m = selectorRe.exec(text);
  if (!m) return null;
  const open = text.indexOf('{', m.index);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { start: open + 1, end: i };
  }
  return null;
}

const declRe = (name) => new RegExp(`(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)([^;]+?)(\\s*;)([ \\t]*)(\\/\\*[^*]*\\*\\/)?`);

/** The declaration `name: value;` (and its trailing comment) in text, or inside range. */
export function findSlot(text, name, range = null, file = null) {
  const hay = range ? text.slice(range.start, range.end) : text;
  const m = declRe(name).exec(hay);
  if (!m) return null;
  const abs = (range ? range.start : 0) + m.index;
  return { file, name, value: m[2].trim(), comment: m[5] ?? null, index: abs, length: m[0].length, pre: m[1], post: m[3], gap: m[4] ?? '' };
}

/** Replaces the slot's value; a px comment next to a size ("/* 56 *\/") is updated to the new value. */
export function writeSlot(text, s, val) {
  let comment = s.comment ? `${s.gap || ' '}${s.comment}` : '';
  if (s.comment && /^\/\*\s*\d/.test(s.comment) && /--text-|font-size|line-height/.test(s.name)) {
    const px = pxLabel(toRem(val)).replace('px', '');
    comment = `${s.gap || ' '}${s.comment.replace(/\d+(\.\d+)?/, px)}`;
  }
  return text.slice(0, s.index) + `${s.pre}${val}${s.post}${comment}` + text.slice(s.index + s.length);
}

/** Applies several edits ({ slot, value }) to one text, from the end so earlier offsets stay valid. */
export const writeSlots = (text, edits) => [...edits].sort((a, b) => b.slot.index - a.slot.index).reduce((t, e) => writeSlot(t, e.slot, e.value), text);

/** "/* mobile 30 / 36 *\/" next to the mobile font-size of display/h1/h2 says what the code says. */
export function refreshMobileComments(text, prefix, typeByRole) {
  for (const role of ['display', 'h1', 'h2']) {
    const m = typeByRole[role]?.mobile;
    if (!m) continue;
    const num = (v) => +(parseFloat(v) * (/rem$/.test(v) ? 16 : 1)).toFixed(2);
    const re = new RegExp(`(@utility\\s+${prefix}-${role}\\s*\\{[^}]*?font-size:\\s*[^;]+;[ \\t]*)/\\*\\s*mobile\\s*[\\d.]+\\s*/\\s*[\\d.]+\\s*\\*/`);
    text = text.replace(re, `$1/* mobile ${num(m.size)} / ${num(m.lineHeight)} */`);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Role map
// ---------------------------------------------------------------------------
/** "colors.surface=bg" → { kind, name, role } (role null for "null"), or null when malformed. */
export function parseMapArg(a) {
  const mm = /^(colors|type)\.(.+)=(.+)$/.exec(a);
  return mm ? { kind: mm[1], name: mm[2], role: mm[3] === 'null' ? null : mm[3] } : null;
}

/** Design values keyed by plugin role (design name in __name); throws when two names share a role. */
export function byRole(map, src) {
  const out = {};
  for (const [n, r] of Object.entries(map)) {
    if (!r) continue;
    if (out[r]) throw new Error(`Two design names map to the same role "${r}" (${out[r].__name} and ${n}). Fix the mapping with --map.`);
    out[r] = { ...src[n], __name: n };
  }
  return out;
}
