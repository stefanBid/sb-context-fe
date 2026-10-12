#!/usr/bin/env node
// Converts the `project/tokens.json` of a claude.ai "Design System" artifact into a
// DESIGN.md for the project root: the values contract that style-align reads.
//
// Usage:
//   node "${CLAUDE_SKILL_DIR}/scripts/tokens-to-design.mjs" --tokens <tokens.json> \
//        [--readme <README.md>] [--source <artifact url>] [--version <artifact version>] \
//        [--out DESIGN.md] [--force]
//
// Deterministic: no interpretation. It normalizes values, derives a *suggested* prefix
// (always asked later), lists the gaps, and removes eyebrow usage (always overridden).
// Never overwrites an existing file without --force.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const get = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const tokensPath = get('--tokens');
if (!tokensPath) {
  console.error('Pass --tokens <path to project/tokens.json>.');
  process.exit(2);
}
const out = resolve(get('--out') || 'DESIGN.md');
if (existsSync(out) && !argv.includes('--force')) {
  console.error(`${out} already exists: not overwritten. Write to another path with --out and compare, or pass --force.`);
  process.exit(3);
}

let t;
try {
  t = JSON.parse(readFileSync(tokensPath, 'utf8'));
} catch (e) {
  console.error(`Cannot read ${tokensPath}: ${e.message}`);
  process.exit(2);
}
const readme = get('--readme') && existsSync(get('--readme')) ? readFileSync(get('--readme'), 'utf8') : '';

const gaps = [];
const overrides = [];

// ---------------------------------------------------------------------------
// Eyebrows: never allowed, even if the design documents them
// ---------------------------------------------------------------------------
const EYEBROW = /\b(occhielli|occhiello|eyebrows?|kickers?)\b(\s*,\s*|\s+e\s+|\s+and\s+)?/gi;
const hasEyebrow = (s) => /\b(occhielli|occhiello|eyebrows?|kickers?)\b/i.test(s);
function clean(text, where) {
  if (!text || !hasEyebrow(text)) return text;
  const cleaned = text.replace(EYEBROW, '').replace(/\s{2,}/g, ' ').replace(/^\s*[,:]\s*/, '').trim();
  const final = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  overrides.push(`${where}: "${text}" → "${final}"`);
  return final;
}

// ---------------------------------------------------------------------------
// Suggested prefix: initials of the design system name (a proposal, always asked)
// ---------------------------------------------------------------------------
const RESERVED = new Set(['p', 'm', 'w', 'h', 'bg', 'text', 'font', 'border', 'rounded', 'shadow', 'flex', 'grid', 'gap', 'ring', 'top', 'size', 'col', 'row', 'sr', 'dark', 'ease', 'animate', 'inset', 'space', 'divide', 'outline', 'fill', 'stroke']);
function suggestPrefix(name) {
  const words = String(name || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z]+/)
    .filter(Boolean);
  if (!words.length) return null;
  let p = words.length === 1 ? words[0].slice(0, 2) : words.map((w) => w[0]).join('').slice(0, 4);
  p = p.toLowerCase();
  if (p.length < 2) p = (words[0] + 'x').slice(0, 2).toLowerCase();
  if (RESERVED.has(p)) p = (p + (words[0][1] ?? 'x')).slice(0, 4).toLowerCase();
  return p;
}
const name = t.name ?? 'Design system';
const suggestedPrefix = suggestPrefix(name);

// ---------------------------------------------------------------------------
// Normalize
// ---------------------------------------------------------------------------
const themes = (t.color?.themes ?? [{ id: 'light' }, { id: 'dark' }]).map((x) => x.id);
const colors = {};
for (const c of t.color?.tokens ?? []) {
  const v = typeof c.value === 'string' ? { [themes[0]]: c.value } : c.value;
  for (const th of themes) if (v[th] === undefined) v[th] = v[themes[0]];
  colors[c.name] = { ...v, usage: clean(c.usage ?? '', `color ${c.name}`) };
}
const ROLES = ['bg', 'surface', 'surface-2', 'border', 'border-strong', 'ink', 'ink-muted', 'primary', 'primary-hover', 'on-primary', 'primary-soft', 'accent', 'accent-hover', 'on-accent', 'accent-ink', 'success', 'success-soft', 'error', 'error-soft', 'warning', 'warning-soft', 'info', 'info-soft', 'focus-ring'];
const extraColors = Object.keys(colors).filter((n) => !ROLES.includes(n));
if (extraColors.length) gaps.push(`Colors without a matching role (kept with their own name, to agree on): ${extraColors.join(', ')}.`);
for (const must of ['bg', 'surface', 'border', 'ink', 'ink-muted', 'primary', 'on-primary', 'focus-ring'])
  if (!colors[must]) gaps.push(`Recommended base color \`${must}\` is missing: derive it minimally, provisional.`);
if (themes.length < 2) gaps.push('Only one theme: the missing theme is derived minimally, provisional.');

const fams = t.type?.families ?? {};
const fonts = { display: fams.display ?? fams.heading ?? null, body: fams.body ?? fams.sans ?? null, mono: fams.mono ?? null };
if (!fonts.display || !fonts.body) gaps.push('Families: `display` and `body` are not both declared (one family may serve both): confirm.');
const fontFiles = (t.type?.fonts ?? []).map((f) => f.file ?? f.family);

const type = {};
const weightSet = new Set();
for (const g of t.type?.groups ?? []) {
  for (const s of g.styles ?? []) {
    const usage = s.usage ?? '';
    const m = usage.match(/Mobile:\s*([\d.]+)px\s*\/\s*([\d.]+)px/i);
    const w = s.fontWeight;
    if (typeof w === 'number') weightSet.add(w);
    else if (typeof w === 'string') for (const x of w.match(/\d+/g) ?? []) weightSet.add(+x);
    type[s.name] = {
      family: g.family ?? null,
      size: s.fontSize,
      lineHeight: s.lineHeight ?? null,
      weight: w,
      ...(s.letterSpacing ? { letterSpacing: s.letterSpacing } : {}),
      ...(m ? { mobile: { size: `${m[1]}px`, lineHeight: `${m[2]}px` } } : {}),
      usage: clean(usage.replace(/\s*Mobile:\s*[\d.]+px\s*\/\s*[\d.]+px\.?/i, '').trim(), `type ${s.name}`),
    };
  }
}
const ROLE_TYPES = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'body-strong', 'label', 'small', 'overline'];
for (const r of ROLE_TYPES) if (!type[r]) gaps.push(`Type role \`${r}\` is missing: map from the project's current sizes, or derive minimally (provisional).`);
for (const r of ['display', 'h1', 'h2'])
  if (type[r] && !type[r].mobile) gaps.push(`\`${r}\` has no mobile values (the design only gives them in prose, if at all): ask, or derive minimally (provisional).`);
for (const r of Object.keys(type)) if (!ROLE_TYPES.includes(r) && r !== 'hero') gaps.push(`Type style \`${r}\` is not a role of the fixed set: map it to a role or absorb it.`);
for (const [r, s] of Object.entries(type)) {
  const px = parseFloat(s.size) * (/rem$/.test(s.size) ? 16 : 1);
  if (['body', 'body-strong'].includes(r) && px < 16) gaps.push(`\`${r}\` is ${px}px: running text and inputs are never below 16px (guard rail).`);
  if (r === 'display' && px > 96) gaps.push('`display` is above 6rem (guard rail).');
}

const mapFamily = (fam, obj) => Object.fromEntries((obj?.tokens ?? []).map((x) => [x.name.replace(new RegExp(`^${fam}-`), ''), x.value]));
const radius = mapFamily('radius', t.radius);
delete radius.full;
delete radius.none;
const spacing = Object.fromEntries((t.spacing?.tokens ?? []).map((x) => [x.name, x.value]));
const shadow = {};
for (const s of t.shadow?.tokens ?? []) shadow[s.name.replace(/^shadow-/, '')] = typeof s.value === 'string' ? { [themes[0]]: s.value } : s.value;
const breakpoints = Object.fromEntries((t.breakpoint?.tokens ?? []).map((x) => [x.name.replace(/^bp-/, ''), x.value]));
const FIXED_BP = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };
for (const [k, v] of Object.entries(breakpoints)) if (FIXED_BP[k] && FIXED_BP[k] !== v) overrides.push(`breakpoint ${k}: design says ${v}, the plugin fixes ${FIXED_BP[k]}`);
for (const k of Object.keys(breakpoints)) if (!FIXED_BP[k]) overrides.push(`breakpoint ${k} (${breakpoints[k]}): only sm, md, lg, xl exist`);
if (Object.keys(radius).length < 2) gaps.push('Fewer than 2 radii declared.');

gaps.push('Motion: the design system has no motion family. Defaults from `style-align` references/motion.md apply, marked provisional.');
if (!Object.keys(shadow).length) gaps.push('No shadows declared: three levels derived minimally, provisional.');

const data = {
  themes,
  colors,
  fonts: { ...fonts, files: fontFiles },
  weights: [...weightSet].sort((a, b) => a - b),
  type,
  radius,
  shadow,
  spacing,
  breakpoints,
  motion: null,
};

// ---------------------------------------------------------------------------
// Prose: keep the brand book, remove only the eyebrow wording
// ---------------------------------------------------------------------------
const prose = readme
  .split('\n')
  .map((line) => {
    if (!hasEyebrow(line)) return line;
    const cleaned = line.replace(EYEBROW, '').replace(/\s{2,}/g, ' ');
    overrides.push(`README: "${line.trim().slice(0, 120)}" → "${cleaned.trim().slice(0, 120)}"`);
    return cleaned;
  })
  .join('\n')
  .trim();

const md = `---
name: ${name}
source: ${get('--source') ?? 'unknown'}
sourceVersion: ${get('--version') ?? 'unknown'}
importedAt: ${new Date().toISOString().slice(0, 10)}
suggestedPrefix: ${suggestedPrefix ?? ''}
---

# ${name} — design

Values contract for \`style-align\`. Imported from a claude.ai Design System artifact by \`design-import\`; the artifact stays the source, this file is the project's snapshot. Regenerate it with \`/sb-context-nuxt:design-import\` when the design changes. Do not hand-edit the \`tokens\` block: it is machine-read.

\`suggestedPrefix\` is only a proposal: \`style-align\` always asks which prefix to use and the answer wins.

## Rules that override this document

- No eyebrows: \`overline\` is for badges, tags, counters, table headers and metadata, never a kicker above a heading.
- Breakpoints are fixed to sm 640 / md 768 / lg 1024 / xl 1280.
- Running text and inputs are never below 16px.

## Tokens

\`\`\`json tokens
${JSON.stringify(data, null, 2)}
\`\`\`

## Overrides applied during import

${overrides.length ? overrides.map((o) => `- ${o}`).join('\n') : 'None.'}

## Gaps to resolve in style-align

${gaps.map((g) => `- ${g}`).join('\n')}

## Brand book

${prose || '_No README provided._'}
`;
writeFileSync(out, md);
console.log(`Written ${out}`);
console.log(`Name: ${name} · suggested prefix: ${suggestedPrefix} · colors: ${Object.keys(colors).length} · type styles: ${Object.keys(type).length} · radii: ${Object.keys(radius).length} · shadows: ${Object.keys(shadow).length}`);
console.log(`Overrides: ${overrides.length} · gaps: ${gaps.length}`);
for (const o of overrides) console.log(`  override: ${o}`);
for (const g of gaps) console.log(`  gap: ${g}`);
