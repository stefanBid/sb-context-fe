// The analysis of template.mjs that does not need Tailwind: class anatomy, nearest theme
// roles (colors, text sizes) and the heading outline.

import { toOklch } from '../color.mjs';

/** "md:hover:!bg-[#fff]" → { variants: ['md', 'hover'], utility: 'bg-[#fff]' } (colons inside [] kept). */
export function splitVariants(cls) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of cls) {
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ':' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  const utility = parts.pop();
  return { variants: parts, utility: utility.replace(/^!/, '').replace(/!$/, '') };
}

// longest roots first: "border-t-red-500" is border-t, "rounded-tl-lg" is rounded-tl
export const ROOTS = ['inset-shadow', 'drop-shadow', 'text-shadow', 'ring-offset', 'border-x', 'border-y', 'border-t', 'border-r', 'border-b', 'border-l', 'border-s', 'border-e',
  'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br', 'rounded-ss', 'rounded-se', 'rounded-es', 'rounded-ee', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-s', 'rounded-e',
  'placeholder', 'decoration', 'outline', 'divide', 'accent', 'stroke', 'rounded', 'shadow', 'caret', 'ring', 'fill', 'from', 'text', 'font', 'ease', 'animate', 'border', 'bg', 'via', 'to'];

/** "-mt-4" → { root: null, value: 'mt-4' }; "border-t-red-500" → { root: 'border-t', value: 'red-500' }. */
export function rootOf(utility) {
  const u = utility.replace(/^-/, '');
  for (const r of ROOTS) {
    if (u === r) return { root: r, value: '' };
    if (u.startsWith(r + '-')) return { root: r, value: u.slice(r.length + 1) };
  }
  return { root: null, value: u };
}

export const COLOR_ROOTS = new Set(['bg', 'text', 'border', 'border-x', 'border-y', 'border-t', 'border-r', 'border-b', 'border-l', 'border-s', 'border-e', 'ring', 'ring-offset', 'outline', 'fill', 'stroke', 'divide', 'from', 'via', 'to', 'decoration', 'accent', 'caret', 'placeholder', 'shadow', 'inset-shadow', 'drop-shadow', 'text-shadow']);

/** The string literals of a :class expression, split into classes. */
export function classesFromExpression(exp) {
  const out = [];
  for (const m of exp.matchAll(/'([^']*)'|"([^"]*)"|`([^`$]*)`/g)) out.push(...(m[1] ?? m[2] ?? m[3]).split(/\s+/).filter(Boolean));
  return out;
}

/** "1.5rem" or "24px" → 24; anything else → null. */
export const remPx = (v) => {
  const m = String(v).trim().match(/^([\d.]+)(rem|px)$/);
  return m ? parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : null;
};

// ---------------------------------------------------------------------------
// Colors: distance in OKLab
// ---------------------------------------------------------------------------
export const lab = (c) => {
  const { L, C, H } = toOklch(c);
  const h = (H * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Role preferences: among the nearest colors, those suited to the property come first. */
export const PREF = {
  text: ['ink', 'ink-muted', 'primary', 'accent-ink', 'on-primary', 'on-accent', 'on-error'],
  bg: ['bg', 'surface', 'surface-2', 'primary-soft'],
  bgAction: ['primary', 'primary-hover', 'accent', 'accent-hover'],
  border: ['border', 'border-strong', 'primary', 'focus-ring'],
};

/** themeColors: [{ name, lab }]. The n nearest of the 6 nearest, preferred roles first. */
export function nearestColors(themeColors, c, n = 3, pref = null) {
  const l = lab(c);
  let list = themeColors.map((t) => ({ name: t.name, d: dist(l, t.lab) })).sort((a, b) => a.d - b.d).slice(0, 6).map((t) => t.name);
  if (pref) list = [...list.filter((x) => pref.includes(x)), ...list.filter((x) => !pref.includes(x))];
  return list.slice(0, n);
}

// ---------------------------------------------------------------------------
// Typographic roles: headings and text, as in the method
// ---------------------------------------------------------------------------
const HEADING_ROLES = new Set(['hero', 'display', 'h1', 'h2', 'h3', 'h4']);

/**
 * textRoles: [{ name, px, clamp }]. ctx: { tag, weight, uppercase, display }.
 * Headings (h1–h6, font-display, or heavy and ≥ 17px) pick among heading roles, the rest among text
 * roles; overline only for uppercase text ≤ 13px. Roles of the same size are told apart by tag and weight.
 */
export function nearestTextRole(textRoles, px, ctx = {}) {
  const fixed = textRoles.filter((r) => r.px && !r.clamp);
  const max = Math.max(...fixed.map((r) => r.px));
  if (px > max) {
    const hero = textRoles.find((r) => r.clamp);
    return hero ? [hero.name] : [fixed.find((r) => r.px === max)?.name];
  }
  const tag = (ctx.tag ?? '').toLowerCase();
  const heavy = ctx.weight >= 600;
  const group = /^h[1-6]$/.test(tag) || ctx.display || (heavy && px >= 17) ? 'headings' : 'text';
  let pool = fixed.filter((r) => (group === 'headings' ? HEADING_ROLES.has(r.name) : !HEADING_ROLES.has(r.name)));
  if (group === 'text' && !ctx.uppercase) pool = pool.filter((r) => r.name !== 'overline');
  if (group === 'text' && ctx.uppercase && px <= 13) return ['overline'];
  if (!pool.length) pool = fixed;
  let best = Infinity;
  for (const r of pool) best = Math.min(best, Math.abs(r.px - px));
  const near = pool.filter((r) => Math.abs(Math.abs(r.px - px) - best) < 0.01);
  // same size (label/small, body/body-strong): the weight or the tag decides
  const byPx = new Map();
  for (const r of near) byPx.set(r.px, [...(byPx.get(r.px) ?? []), r.name]);
  const out = [];
  for (const names of byPx.values()) {
    if (names.length === 1) out.push(names[0]);
    else if (tag === 'label' && names.includes('label')) out.push('label');
    else if (tag === 'button' && names.includes('body-strong')) out.push('body-strong');
    else {
      const strong = names.find((n) => /strong|label/.test(n));
      const plain = names.find((n) => !/strong|label/.test(n));
      out.push(heavy ? strong ?? names[0] : plain ?? names[0]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------
/** headings: [{ line, level }] in document order. One h1 per page; no skipped level. */
export function headingIssues(headings, isPage) {
  const issues = [];
  const h1 = headings.filter((h) => h.level === 1);
  if (isPage && h1.length > 1) issues.push(`${h1.length} h1 in the page (lines ${h1.map((h) => h.line).join(', ')}): one per page.`);
  for (let i = 1; i < headings.length; i++)
    if (headings[i].level > headings[i - 1].level + 1)
      issues.push(`Line ${headings[i].line}: h${headings[i].level} after h${headings[i - 1].level}, a level is skipped.`);
  return issues;
}
