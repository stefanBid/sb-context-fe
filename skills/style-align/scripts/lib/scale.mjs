// The analysis of inventory.mjs, without I/O: sizes in px, the font shorthand, the project's
// type scale (tokens or clusters) and media query widths.

import { dirname, sep } from 'node:path';

/** CSS length → { px, unit }; a unitless number → { px: null, ratio }; anything else → null. resolve expands var(). */
export function toPx(raw, resolve = (v) => v) {
  const v = resolve(String(raw)).trim();
  const m = v.match(/^(-?[\d.]+)(px|rem|em|%)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2] ?? '';
  if (u === 'px') return { px: n, unit: 'px' };
  if (u === 'rem') return { px: n * 16, unit: 'rem' };
  if (u === 'em') return { px: n * 16, unit: 'em' };
  if (u === '%') return { px: (n / 100) * 16, unit: '%' };
  return { px: null, ratio: n, unit: '' };
}

/** `font: italic 700 1rem/1.5 Inter, sans-serif` → { weight, size, lineHeight, family }, or null. */
export function parseFontShorthand(v) {
  const m = v.match(/^(?:(?:italic|oblique|normal)\s+)?(?:small-caps\s+)?(?:(\d{3}|bold|normal|lighter|bolder)\s+)?([\d.]+(?:px|rem|em|%)|var\([^)]+\))(?:\s*\/\s*([\d.]+(?:px|rem|em|%)?|var\([^)]+\)))?\s+(.+)$/);
  if (!m) return null;
  return { weight: m[1] ?? null, size: m[2], lineHeight: m[3] ?? null, family: m[4] };
}

/** scale: [[px, role], …]. The nearest step to px; two steps at the same distance are both named. */
export function nearestStep(scale, px) {
  if (!scale.length) return { step: null, role: null, offset: null, equidistant: false };
  let best = scale[0];
  for (const s of scale) if (Math.abs(s[0] - px) < Math.abs(best[0] - px)) best = s;
  const tie = scale.find((s) => s !== best && Math.abs(Math.abs(s[0] - px) - Math.abs(best[0] - px)) < 0.01);
  return {
    step: tie ? `${best[0]} / ${tie[0]}` : best[0],
    role: tie ? `${best[1]} or ${tie[1]}: the role decides` : best[1],
    offset: +(px - best[0]).toFixed(2),
    equidistant: Boolean(tie),
  };
}

/** The scale from --text-<role> tokens ({ px, selector: '--text-<role>' }): roles of the same size share a step. */
export function scaleFromTokens(tokens) {
  const byPx = new Map();
  for (const t of tokens) {
    const role = t.selector.replace(/^--text-/, '');
    byPx.set(t.px, [...(byPx.get(t.px) ?? []), role]);
  }
  return [...byPx.entries()].sort((a, b) => a[0] - b[0]).map(([px, roles]) => [px, roles.join(' / ')]);
}

/**
 * Without tokens: the distinct sizes (px values, repeated as often as they occur) grouped within 1px,
 * or 2px above 24px, measured from the first member. The most frequent member is the proposal.
 */
export function clusterSizes(pxs) {
  const counts = new Map();
  for (const px of pxs) counts.set(px, (counts.get(px) ?? 0) + 1);
  const clusters = [];
  for (const [px, n] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
    const last = clusters[clusters.length - 1];
    const tol = px > 24 ? 2 : 1;
    if (last && px - last.members[0].px <= tol) last.members.push({ px, n });
    else clusters.push({ members: [{ px, n }] });
  }
  for (const c of clusters) {
    c.count = c.members.reduce((s, m) => s + m.n, 0);
    c.proposed = c.members.reduce((a, b) => (b.n > a.n ? b : a)).px;
  }
  return clusters;
}

export const scaleFromClusters = (clusters) => clusters.map((c) => [c.proposed, c.members.length > 1 ? `cluster ${c.members.map((m) => m.px).join('/')}` : 'single value']);

/** Widths in a media query, in px: [{ px, max }] (max: a max-width / width <= condition). */
export function mediaWidths(query) {
  const out = [];
  for (const w of query.matchAll(/(?:min|max)-width\s*:\s*([\d.]+)(px|rem|em)|width\s*[<>]=?\s*([\d.]+)(px|rem|em)/g)) {
    const n = parseFloat(w[1] ?? w[3]);
    const u = w[2] ?? w[4];
    out.push({ px: Math.round(u === 'px' ? n : n * 16), max: /max-width|width\s*<=?/.test(w[0]) });
  }
  return out;
}

/** The deepest folder that contains every path (for display), or fallback when there are none. */
export function commonDir(paths, fallback) {
  if (!paths.length) return fallback;
  let dir = dirname(paths[0]);
  const holds = (p) => p.startsWith(dir.endsWith(sep) ? dir : dir + sep);
  while (!paths.every(holds)) {
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return dir;
}
