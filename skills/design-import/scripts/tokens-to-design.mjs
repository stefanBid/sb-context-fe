#!/usr/bin/env node
// Converts the `project/tokens.json` of a claude.ai "Design System" artifact into a
// DESIGN.md for the project root: the values contract that style-align reads.
// The file follows the DESIGN.md spec (github.com/google-labs-code/design.md): YAML
// frontmatter with colors/typography/rounded/spacing, the standard body sections in
// order. What the spec cannot express (dark theme, mobile sizes, shadows, breakpoints,
// provenance) goes in an extra `## style-align extension` section with a JSON block.
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

// ---------------------------------------------------------------------------
// DESIGN.md (spec) + extension block
// ---------------------------------------------------------------------------
const q = (v) => JSON.stringify(String(v));
const ref = (v) => (/^\{[\w.-]+\}$/.test(v) ? `{colors.${v.slice(1, -1)}}` : v);
const firstFamily = (stack) => (stack ? String(stack).split(',')[0].trim().replace(/^["']|["']$/g, '') : null);
const numWeight = (w) => (typeof w === 'number' ? w : parseInt(String(w).match(/\d+/)?.[0] ?? '400', 10));
const light = themes[0];
const dark = themes[1] ?? null;

const y = [];
y.push('---', 'version: alpha', `name: ${q(name)}`);
y.push('omitted:', '  - components');
y.push('colors:');
for (const [n, c] of Object.entries(colors)) y.push(`  ${n}: ${q(ref(c[light]))}`);
y.push('typography:');
for (const [n, s] of Object.entries(type)) {
  y.push(`  ${n}:`);
  const fam = firstFamily(s.family && fams[s.family] ? fams[s.family] : null);
  if (fam) y.push(`    fontFamily: ${q(fam)}`);
  y.push(`    fontSize: ${s.size}`);
  y.push(`    fontWeight: ${numWeight(s.weight)}`);
  if (s.lineHeight) y.push(`    lineHeight: ${s.lineHeight}`);
  if (s.letterSpacing) y.push(`    letterSpacing: ${s.letterSpacing}`);
}
y.push('rounded:');
for (const [n, v] of Object.entries(radius)) y.push(`  ${n}: ${v}`);
for (const x of t.radius?.tokens ?? []) if (/-full$/.test(x.name)) y.push(`  full: ${x.value}`);
y.push('spacing:');
for (const [n, v] of Object.entries(spacing)) y.push(`  ${n}: ${v}`);
y.push('---');

const ext = {
  source: get('--source') ?? 'unknown',
  sourceVersion: get('--version') ?? 'unknown',
  importedAt: new Date().toISOString().slice(0, 10),
  suggestedPrefix,
  themes,
  colorsDark: dark ? Object.fromEntries(Object.entries(colors).map(([n, c]) => [n, ref(c[dark])])) : null,
  fonts: { display: fonts.display, body: fonts.body, mono: fonts.mono, files: fontFiles },
  weights: [...weightSet].sort((a, b) => a - b),
  familyRole: Object.fromEntries(Object.entries(type).map(([n, s]) => [n, s.family])),
  mobile: Object.fromEntries(Object.entries(type).filter(([, s]) => s.mobile).map(([n, s]) => [n, s.mobile])),
  shadows: shadow,
  breakpoints,
  motion: null,
};

const colorLines = Object.entries(colors).map(([n, c]) => `- **${n} (${c[light]}${dark ? ` / ${c[dark]}` : ''}):** ${c.usage}`);
const typeLines = Object.entries(type).map(([n, s]) => `- **${n}** — ${s.size} / ${s.lineHeight ?? 'auto'}, weight ${numWeight(s.weight)}${s.letterSpacing ? `, tracking ${s.letterSpacing}` : ''}${s.mobile ? `; mobile ${s.mobile.size} / ${s.mobile.lineHeight}` : ''}. ${s.usage}`);
const shadowLines = Object.entries(shadow).map(([n, v]) => `- **${n}:** ${Object.values(v)[0]}`);
const bpLines = Object.entries(breakpoints).map(([n, v]) => `- **${n}** ${v}`);
const spacingLines = Object.entries(spacing).map(([n, v]) => `- **${n}** ${v}`);
const radiusLines = Object.entries(radius).map(([n, v]) => `- **${n}** ${v}`);

const intro = prose.split(/\n(?=##\s)/)[0].startsWith('##') ? '' : prose.split(/\n(?=##\s)/)[0];
const restSections = prose.split(/\n(?=##\s)/).filter((b) => b.startsWith('##')).join('\n\n');

const md = `${y.join('\n')}

# ${name}

## Overview

${intro || `${name} design system, imported from a claude.ai Design System artifact.`}

## Colors

Light${dark ? ' and dark' : ''} values per role; the frontmatter holds the ${light} theme${dark ? ', the dark values are in the extension section' : ''}.

${colorLines.join('\n')}

## Typography

${fonts.display ? `Display: ${fonts.display}. ` : ''}${fonts.body ? `Body: ${fonts.body}.` : ''}

${typeLines.join('\n')}

## Layout

Spacing scale:

${spacingLines.join('\n')}

Breakpoints (mobile-first):

${bpLines.join('\n')}

## Elevation & Depth

${t.shadow?.note ? `${t.shadow.note}\n\n` : ''}${shadowLines.join('\n') || 'No shadows declared.'}

## Shapes

${radiusLines.join('\n')}

## Do's and Don'ts

- Don't use \`overline\` (or any small uppercase text) as a kicker above a heading: it is for badges, tags, counters, table headers and metadata.
- Don't set running text or form inputs below 16px.
- Do keep the breakpoints at sm 640 / md 768 / lg 1024 / xl 1280.
- Do keep the contrast minimums: 4.5:1 for text, 3:1 for large text, controls and focus.

${restSections ? `${restSections}\n\n` : ''}## style-align extension

Not part of the DESIGN.md spec: values it cannot express, plus provenance. Written by \`design-import\`, read by \`style-align\`. \`suggestedPrefix\` is only a proposal: the prefix is always asked and the answer wins.

\`\`\`json style-align
${JSON.stringify(ext, null, 2)}
\`\`\`

### Overrides applied during import

${overrides.length ? overrides.map((o) => `- ${o}`).join('\n') : 'None.'}

### Gaps to resolve in style-align

${gaps.map((g) => `- ${g}`).join('\n')}
`;
writeFileSync(out, md);
console.log(`Written ${out}`);
console.log(`Name: ${name} · suggested prefix: ${suggestedPrefix} · colors: ${Object.keys(colors).length} · type styles: ${Object.keys(type).length} · radii: ${Object.keys(radius).length} · shadows: ${Object.keys(shadow).length}`);
console.log(`Overrides: ${overrides.length} · gaps: ${gaps.length}`);
for (const o of overrides) console.log(`  override: ${o}`);
for (const g of gaps) console.log(`  gap: ${g}`);
