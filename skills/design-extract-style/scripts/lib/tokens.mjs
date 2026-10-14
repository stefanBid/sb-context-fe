// The logic of tokens-to-source.mjs, without I/O: eyebrow removal, color normalization,
// mobile sizes and the role map.

// The plugin's fixed roles
export const ROLES = ['bg', 'surface', 'surface-2', 'border', 'border-strong', 'ink', 'ink-muted', 'primary', 'primary-hover', 'on-primary', 'primary-soft', 'accent', 'accent-hover', 'on-accent', 'accent-ink', 'success', 'success-soft', 'error', 'error-soft', 'warning', 'warning-soft', 'info', 'info-soft', 'focus-ring'];
export const ROLE_TYPES = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'body-strong', 'label', 'small', 'overline'];

// ---------------------------------------------------------------------------
// Eyebrows: never allowed, even if the design documents them
// ---------------------------------------------------------------------------
const EYEBROW = /\b(occhielli|occhiello|eyebrows?|kickers?)\b(\s*,\s*|\s+e\s+|\s+and\s+)?/gi;
const hasEyebrow = (s) => /\b(occhielli|occhiello|eyebrows?|kickers?)\b/i.test(s);

/** clean(text) for one-line usage texts, cleanBlock(text) for READMEs; each change is pushed to overrides. */
export function eyebrowCleaner(overrides) {
  const clean = (text, where) => {
    if (!text || !hasEyebrow(text)) return text;
    const cleaned = text.replace(EYEBROW, '').replace(/\s{2,}/g, ' ').replace(/^\s*[,:]\s*/, '').trim();
    const final = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    overrides.push(`${where}: "${text}" → "${final}"`);
    return final;
  };
  const cleanBlock = (text, where) =>
    text
      .split('\n')
      .map((line) => {
        if (!hasEyebrow(line)) return line;
        const c = line.replace(EYEBROW, '').replace(/\s{2,}/g, ' ');
        overrides.push(`${where}: "${line.trim().slice(0, 100)}" → "${c.trim().slice(0, 100)}"`);
        return c;
      })
      .join('\n');
  return { clean, cleanBlock };
}

// ---------------------------------------------------------------------------
// Colors: one value per theme, aliases ({primary}) resolved
// ---------------------------------------------------------------------------
const COLOR_OK = /^(#[0-9a-f]{3,8}|rgba?\(.+\)|hsla?\(.+\)|oklch\(.+\)|oklab\(.+\)|color\(.+\))$/i;

/**
 * tokens: tokens.json `color.tokens`. Every theme gets a value (the first theme's when missing);
 * an alias is replaced by its target's value and kept in `alias`. Returns { colors, gaps }.
 * clean (optional) normalizes the usage texts.
 */
export function normalizeColors(tokens, themes, clean = (t) => t) {
  const [light] = themes;
  const gaps = [];
  const colors = {};
  for (const c of tokens) {
    const v = typeof c.value === 'string' ? { [light]: c.value } : { ...c.value };
    for (const th of themes) if (v[th] === undefined) v[th] = v[light];
    colors[c.name] = { values: v, usage: clean(c.usage ?? '', `color ${c.name}`) };
  }
  for (const [n, c] of Object.entries(colors)) {
    for (const th of themes) {
      const val = c.values[th];
      const m = /^\{([\w-]+)\}$/.exec(val);
      if (m) {
        const target = colors[m[1]]?.values?.[th];
        if (target && !/^\{/.test(target)) {
          (c.alias ??= {})[th] = m[1];
          c.values[th] = target;
        } else gaps.push(`Color \`${n}\` (${th}) is an alias of \`${m[1]}\` that cannot be resolved: ask.`);
      } else if (!COLOR_OK.test(String(val).trim())) gaps.push(`Color \`${n}\` (${th}) has a value that is not a color literal: "${val}".`);
    }
  }
  for (const [n, c] of Object.entries(colors)) c.inFixedSet = ROLES.includes(n);
  return { colors, gaps };
}

// ---------------------------------------------------------------------------
// Type: the Design System type gives mobile sizes only in the usage prose
// ---------------------------------------------------------------------------
/** "Page title. Mobile: 30px / 36px." → { mobile: { size, lineHeight }, usage: 'Page title.' } */
export function splitMobile(usage = '') {
  const m = usage.match(/Mobile:\s*([\d.]+)px\s*\/\s*([\d.]+)px/i);
  return {
    mobile: m ? { size: `${m[1]}px`, lineHeight: `${m[2]}px` } : null,
    usage: usage.replace(/\s*Mobile:\s*[\d.]+px\s*\/\s*[\d.]+px\.?/i, '').trim(),
  };
}

/** Numeric weights in a fontWeight value: 700, "600", "400 700". */
export const weightsOf = (w) => (typeof w === 'number' ? [w] : typeof w === 'string' ? (w.match(/\d+/g) ?? []).map(Number) : []);

/** A font size in px ("18px", "1.125rem"). */
export const sizePx = (size) => parseFloat(size) * (/rem$/.test(size) ? 16 : 1);

// ---------------------------------------------------------------------------
// Role map: design names → the plugin's roles. Same name does not mean same meaning
// (a design's `surface` can be the page background, which is the plugin's `bg`).
// ---------------------------------------------------------------------------
const CORE = ['bg', 'surface', 'ink', 'primary'];
// hints only read how a usage text BEGINS: "Page background." says bg, "Cards, menus…" says surface
const COLOR_HINTS = [
  [/^(page|app) background|^sfondo (della )?(pagina|app)/i, 'bg'],
  [/^(cards?|panels?|menus?|pannelli)\b/i, 'surface'],
  [/^(keyboard )?focus ring|^anello di focus|^keyboard focus/i, 'focus-ring'],
];
const TYPE_HINTS = { title: 'h2', heading: 'h2', subtitle: 'h3', headline: 'h2', paragraph: 'body', text: 'body', caption: 'small', meta: 'small', helper: 'small', button: 'label', eyebrow: 'overline', overline: 'overline' };

/** colors: name → { usage }; type: name → anything. Returns { roleMap, coreMissing, typeMissing }. */
export function buildRoleMap(colors, type) {
  const roleMap = { status: 'identity', colors: {}, type: {} };
  for (const n of Object.keys(colors)) {
    const sugg = COLOR_HINTS.find(([re, r]) => re.test(colors[n].usage) && r && r !== n)?.[1] ?? null;
    roleMap.colors[n] = { role: ROLES.includes(n) ? n : null, suggested: ROLES.includes(n) ? null : sugg, ...(ROLES.includes(n) && sugg && sugg !== n ? { suspicious: sugg } : {}) };
  }
  for (const n of Object.keys(type)) roleMap.type[n] = { role: ROLE_TYPES.includes(n) ? n : null, suggested: ROLE_TYPES.includes(n) ? null : TYPE_HINTS[n] ?? null };
  const coreMissing = CORE.filter((r) => !colors[r]);
  const typeMissing = ['h1', 'body'].filter((r) => !type[r]);
  if (coreMissing.length || typeMissing.length || Object.values(roleMap.colors).some((c) => c.suspicious)) roleMap.status = 'needs-confirmation';
  return { roleMap, coreMissing, typeMissing };
}

// headings of the design's READMEs move down so they sit below the section that contains them
// (h1 of the brand README under "## Brand guide" becomes ###), never deeper than h6
export const demote = (md, levels = 1) => md.replace(/^(#{1,6}) /gm, (_, h) => `${'#'.repeat(Math.min(6, h.length + levels))} `);
