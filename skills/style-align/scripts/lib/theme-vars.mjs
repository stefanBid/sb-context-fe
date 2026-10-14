// The logic of contrast.mjs, without I/O: custom properties per theme, var() resolution,
// the standard role pairs and their evaluation.

import { parseColor, contrast, toOklch, toHex } from '../color.mjs';

/** Mini parser: every block with its chain of preludes and the custom properties it declares. */
export function parseBlocks(text) {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack = [];
  const blocks = []; // { context: [preludes], decls: Map }
  let buf = '';
  let current = null;
  const flushDecl = () => {
    const m = buf.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m && current) current.decls.set(m[1], m[2]);
  };
  for (const ch of css) {
    if (ch === '{') {
      stack.push(buf.trim());
      buf = '';
      current = { context: [...stack], decls: new Map() };
      blocks.push(current);
    } else if (ch === '}') {
      flushDecl();
      stack.pop();
      buf = '';
      current = blocks.findLast((b) => b.context.length === stack.length && b.context.every((p, i) => p === stack[i])) || null;
    } else if (ch === ';') {
      flushDecl();
      buf = '';
    } else {
      buf += ch;
    }
  }
  return blocks;
}

/** 'light', 'dark' or null (not a theme block: @theme tokens, component rules). */
export function themeOf(context) {
  const joined = context.join(' | ');
  if (/prefers-color-scheme:\s*dark/.test(joined)) return 'dark';
  const sel = context[context.length - 1] || '';
  if (/\[data-theme=["']?dark["']?\]|\.dark\b/.test(sel)) return 'dark';
  if (/@theme/.test(joined)) return null; // Tailwind tokens are not theme values
  if (/:root|^html\b|\[data-theme=["']?light["']?\]/.test(sel)) return 'light';
  return null;
}

/** { light, dark, hasDark }: the dark map inherits every light variable it does not redefine. */
export function themeVars(text) {
  const themes = { light: new Map(), dark: new Map() };
  for (const b of parseBlocks(text)) {
    const t = themeOf(b.context);
    if (!t) continue;
    for (const [k, v] of b.decls) themes[t].set(k, v);
  }
  const hasDark = themes.dark.size > 0;
  return { light: themes.light, dark: new Map([...themes.light, ...themes.dark]), hasDark };
}

export function resolveVars(map, value, depth = 0) {
  if (!value || depth > 20) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, name, fallback) => {
    if (map.has(name)) return resolveVars(map, map.get(name), depth + 1);
    return fallback ? resolveVars(map, fallback, depth + 1) : `var(${name})`;
  });
}

export const TEXT = 4.5;
export const UI = 3;
const softs = ['primary-soft', 'success-soft', 'error-soft', 'warning-soft', 'info-soft'];
// [fg role, bg role, minimum, use, level?]
export const STANDARD_PAIRS = [
  ...['bg', 'surface', 'surface-2', ...softs].map((bg) => ['ink', bg, TEXT, 'body text']),
  ...['bg', 'surface', 'surface-2', 'primary-soft'].map((bg) => ['ink-muted', bg, TEXT, 'secondary text']),
  ...['bg', 'surface', 'surface-2', 'primary-soft'].map((bg) => ['primary', bg, TEXT, 'links and actions as text']),
  ['on-primary', 'primary', TEXT, 'text on primary fill'],
  ['on-primary', 'primary-hover', TEXT, 'text on primary hover'],
  ['on-accent', 'accent', TEXT, 'text on accent fill'],
  ['on-accent', 'accent-hover', TEXT, 'text on accent hover'],
  ['accent-ink', 'bg', TEXT, 'accent as text'],
  ['accent-ink', 'surface', TEXT, 'accent as text'],
  ...['success', 'error', 'warning', 'info'].flatMap((s) => [
    [s, 'surface', TEXT, `${s} state as text`],
    [s, `${s}-soft`, TEXT, `${s} state on its tint`],
  ]),
  ['border-strong', 'surface', UI, 'control border'],
  ['border-strong', 'bg', UI, 'control border when a field sits directly on bg', 'warning'],
  ['focus-ring', 'bg', UI, 'focus ring'],
  ['focus-ring', 'surface', UI, 'focus ring'],
];

export const varName = (role, prefix) => (prefix ? `--${prefix}-${role}` : `--${role}`);

/** The standard pairs as variable names: [fg, bg, min, note, level]. */
export const standardPairs = (prefix) => STANDARD_PAIRS.map(([fg, bg, min, note, level]) => [varName(fg, prefix), varName(bg, prefix), min, note, level ?? 'required']);

/** Pairs from a pairs.json list. */
export const customPairs = (list) => list.map((p) => [p.fg, p.bg, p.min ?? TEXT, p.note ?? '', p.level ?? 'required']);

export function evaluate(map, pairs, themeName) {
  const rows = [];
  const missing = new Set();
  for (const [fgName, bgName, min, note, level] of pairs) {
    const fgRaw = map.get(fgName);
    const bgRaw = map.get(bgName);
    if (fgRaw === undefined) missing.add(fgName);
    if (bgRaw === undefined) missing.add(bgName);
    if (fgRaw === undefined || bgRaw === undefined) continue;
    const fgVal = resolveVars(map, fgRaw);
    const bgVal = resolveVars(map, bgRaw);
    const fg = parseColor(fgVal);
    const bg = parseColor(bgVal);
    if (!fg || !bg) {
      rows.push({ theme: themeName, fg: fgName, bg: bgName, min, note, error: `unreadable value (${fgVal} / ${bgVal})` });
      continue;
    }
    const ratio = contrast(fg, bg);
    rows.push({ theme: themeName, fg: fgName, bg: bgName, fgVal, bgVal, ratio: +ratio.toFixed(2), min, ok: ratio >= min, level, note });
  }
  return { rows, missing: [...missing] };
}

/** OKLCH of the surface and text roles, for the lightness table. */
export function surfaces(map, themeName, prefix) {
  const roles = ['bg', 'surface', 'surface-2', 'border', 'border-strong', 'ink', 'ink-muted', 'primary', 'primary-soft', 'accent'];
  const out = [];
  for (const role of roles) {
    const name = varName(role, prefix);
    if (!map.has(name)) continue;
    const c = parseColor(resolveVars(map, map.get(name)));
    if (!c) continue;
    const { L, C, H } = toOklch(c);
    out.push({ theme: themeName, role, hex: toHex(c), L: +L.toFixed(3), C: +C.toFixed(3), H: Math.round(H) });
  }
  return out;
}

/** Observations (never failures) on the lightness order of the surfaces. */
export function surfaceNotes(surf, themeName) {
  const get = (r) => surf.find((s) => s.role === r);
  const notes = [];
  const bg = get('bg'), s1 = get('surface'), s2 = get('surface-2');
  if (bg && s1 && s2) {
    if (themeName === 'light' && !(s1.L >= bg.L && bg.L > s2.L))
      notes.push('Light surface order is not surface ≥ bg > surface-2 in lightness (information only; check it is intentional).');
    if (themeName === 'dark' && !(bg.L < s1.L && s1.L < s2.L))
      notes.push('Dark surface order is not bg < surface < surface-2 in lightness (information only; check it is intentional).');
  }
  return notes;
}
