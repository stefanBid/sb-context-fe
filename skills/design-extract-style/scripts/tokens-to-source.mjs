#!/usr/bin/env node
// Converts a claude.ai Design System artifact (its `project/tokens.json`, README and
// component folders, already saved locally) into `.sb-context-nuxt/design-source.md`:
// the plugin's own snapshot of the design, read by style-align and design-extract-ui.
//
// It is NOT a DESIGN.md (that name belongs to Impeccable and is never touched here).
// The file has two layers: readable markdown for people and for the agent, and a complete
// machine block (```json design-source) with everything normalized, so nothing is lost.
//
// Usage:
//   node "${CLAUDE_SKILL_DIR}/scripts/tokens-to-source.mjs" --tokens <tokens.json> \
//        [--readme <README.md>] [--components-dir <dir that contains project/components>] \
//        [--source <artifact url>] [--version <artifact version>] [--kind design-system|design] \
//        [--design <url of the Design the user pointed to>] [--name <design name>] [--out <path>]
//
// Runs from anywhere inside a Nuxt project: the snapshot goes to <project root>/.sb-context-nuxt/design-source.md.
// --name is the artifact's title; use it when tokens.json has no `name` (the suggested prefix comes from it).
//
// Deterministic: no interpretation. It normalizes values, resolves color aliases, derives a
// *suggested* prefix (always asked later), removes eyebrow usage (always overridden), lists the
// gaps, and ends with a coverage check: every token read must appear in the output.
// An existing file is kept as design-source.prev.md and the differences are printed.
// It also adds `.sb-context-nuxt/` to .git/info/exclude (the folder is never committed).

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { projectRoot, pluginDirOf, excludePluginDir, isInside } from '../../../scripts/lib/project.mjs';
import { suggestPrefix } from '../../../scripts/lib/prefix.mjs';
import { ROLES, ROLE_TYPES, eyebrowCleaner, normalizeColors, splitMobile, weightsOf, sizePx, buildRoleMap, demote } from './lib/tokens.mjs';

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
const root = projectRoot(null, { required: !get('--out') });
const out = resolve(get('--out') || join(pluginDirOf(root), 'design-source.md'));

let raw;
let t;
try {
  raw = readFileSync(tokensPath, 'utf8');
  t = JSON.parse(raw);
} catch (e) {
  console.error(`Cannot read ${tokensPath}: ${e.message}`);
  process.exit(2);
}
if (!t.color?.tokens?.length || !t.type?.groups?.length) {
  console.error('tokens.json has no color tokens or no type groups: this is not a Design System artifact. Nothing written.');
  process.exit(2);
}
// texts saved on Windows may have CRLF line endings: read every text as LF
const readText = (p) => readFileSync(p, 'utf8').replaceAll('\r\n', '\n');
const readme = get('--readme') && existsSync(get('--readme')) ? readText(get('--readme')) : '';

const gaps = [];
const overrides = [];
const today = new Date().toISOString().slice(0, 10);

// eyebrows are never allowed, even if the design documents them: removed, each change listed
const { clean, cleanBlock } = eyebrowCleaner(overrides);

const name = get('--name') ?? t.name ?? null;
if (!name) gaps.push('The design has no name (tokens.json has none and --name was not given): no prefix is suggested, ask the user.');
const shownName = name ?? 'Design system';

// ---------------------------------------------------------------------------
// Normalize: colors (aliases resolved), type, spacing, radii, shadows, breakpoints
// ---------------------------------------------------------------------------
const themes = (t.color?.themes ?? [{ id: 'light' }, { id: 'dark' }]).map((x) => x.id);
const [light, dark = null] = themes;
const { colors, gaps: colorGaps } = normalizeColors(t.color.tokens, themes, clean);
gaps.push(...colorGaps);
const extraColors = Object.keys(colors).filter((n) => !ROLES.includes(n));
if (extraColors.length) gaps.push(`Colors without a matching role (kept with their own name, to agree on in style-align): ${extraColors.join(', ')}.`);
for (const must of ['bg', 'surface', 'border', 'ink', 'ink-muted', 'primary', 'on-primary', 'focus-ring'])
  if (!colors[must]) gaps.push(`Recommended base color \`${must}\` is missing: derive it minimally, provisional.`);
if (themes.length < 2) gaps.push('Only one theme: the missing theme is derived minimally, provisional.');
if (themes.length > 2) gaps.push(`The design has ${themes.length} themes (${themes.join(', ')}): the fixed style structure has two, light (${themes[0]}) and dark (${themes[1]}). The others are kept in this file but not applied; ask the user what to do with ${themes.slice(2).join(', ')}.`);

const fams = t.type?.families ?? {};
const fonts = { display: fams.display ?? fams.heading ?? null, body: fams.body ?? fams.sans ?? null, mono: fams.mono ?? null, files: (t.type?.fonts ?? []).map((f) => f.file ?? f.family) };
if (!fonts.display || !fonts.body) gaps.push('Families: `display` and `body` are not both declared (one family may serve both): confirm.');

const type = {};
const weightSet = new Set();
let typeRead = 0;
for (const g of t.type.groups) {
  for (const s of g.styles ?? []) {
    typeRead++;
    const { mobile, usage } = splitMobile(s.usage ?? '');
    const w = s.fontWeight;
    for (const x of weightsOf(w)) weightSet.add(x);
    type[s.name] = {
      group: g.name ?? null,
      familyRole: g.family ?? null,
      family: g.family && fams[g.family] ? fams[g.family] : null,
      size: s.fontSize,
      lineHeight: s.lineHeight ?? null,
      weight: w,
      ...(s.letterSpacing ? { letterSpacing: s.letterSpacing } : {}),
      ...(mobile ? { mobile } : {}),
      sample: s.sample ?? null,
      usage: clean(usage, `type ${s.name}`),
    };
  }
}
for (const [n, s] of Object.entries(type)) s.inFixedSet = ROLE_TYPES.includes(n) || n === 'hero';
for (const r of ROLE_TYPES) if (!type[r]) gaps.push(`Type role \`${r}\` is missing: map from the project's current sizes, or derive minimally (provisional).`);
for (const r of ['display', 'h1', 'h2'])
  if (type[r] && !type[r].mobile) gaps.push(`\`${r}\` has no mobile values (the design gives them only in prose, if at all): ask, or derive minimally (provisional).`);
for (const r of Object.keys(type)) if (!type[r].inFixedSet) gaps.push(`Type style \`${r}\` is not a role of the fixed set: map it to a role or absorb it.`);
for (const [r, s] of Object.entries(type)) {
  const px = sizePx(s.size);
  if (['body', 'body-strong'].includes(r) && px < 16) gaps.push(`\`${r}\` is ${px}px: running text and inputs are never below 16px (guard rail).`);
  if (r === 'display' && px > 96) gaps.push('`display` is above 6rem (guard rail).');
}

const tokenList = (obj) => obj?.tokens ?? [];
const spacing = Object.fromEntries(tokenList(t.spacing).map((x) => [x.name, { value: x.value, usage: x.usage ?? '' }]));
const radius = Object.fromEntries(tokenList(t.radius).map((x) => [x.name.replace(/^radius-/, ''), { value: x.value, usage: x.usage ?? '', static: ['full', 'none'].includes(x.name.replace(/^radius-/, '')) }]));
const shadows = Object.fromEntries(
  tokenList(t.shadow).map((x) => [x.name.replace(/^shadow-/, ''), { values: typeof x.value === 'string' ? { [light]: x.value } : x.value, usage: x.usage ?? '' }]),
);
const FIXED_BP = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };
const bpDesign = Object.fromEntries(tokenList(t.breakpoint).map((x) => [x.name.replace(/^bp-/, ''), { value: x.value, usage: x.usage ?? '' }]));
for (const [k, b] of Object.entries(bpDesign)) {
  if (FIXED_BP[k] && FIXED_BP[k] !== b.value) overrides.push(`breakpoint ${k}: design says ${b.value}, the plugin fixes ${FIXED_BP[k]}`);
  if (!FIXED_BP[k]) overrides.push(`breakpoint ${k} (${b.value}): only sm, md, lg, xl exist`);
}
if (Object.values(radius).filter((r) => !r.static).length < 2) gaps.push('Fewer than 2 radii declared.');
if (!Object.keys(shadows).length) gaps.push('No shadows declared: three levels derived minimally, provisional.');
gaps.push('Motion: the design system has no motion family. Defaults from `style-align` references/motion.md apply, marked provisional.');

// ---------------------------------------------------------------------------
// Brand guide (README) and components (folders saved from the artifact)
// ---------------------------------------------------------------------------
const brandGuide = demote(cleanBlock(readme, 'README').trim(), 2);

const components = [];
const compRoot = get('--components-dir') ? join(resolve(get('--components-dir')), 'project', 'components') : null;
if (compRoot && existsSync(compRoot)) {
  for (const dir of readdirSync(compRoot).sort()) {
    const p = join(compRoot, dir);
    if (!statSync(p).isDirectory()) continue;
    const rd = existsSync(join(p, 'README.md')) ? cleanBlock(readText(join(p, 'README.md')), `component ${dir}`).replace(/^# .*\n+/, '').trim() : '';
    const pv = existsSync(join(p, 'preview.html')) ? readText(join(p, 'preview.html')) : '';
    const card = pv.match(/<!--\s*@dsCard\s+([^>]*?)-->/);
    const attr = (k) => card?.[1].match(new RegExp(`${k}="([^"]*)"`))?.[1] ?? null;
    const classes = [...new Set([...pv.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean))].sort();
    const summary = rd.split('\n').filter((l) => l.trim() && !l.startsWith('#'))[0] ?? '';
    components.push({
      name: dir,
      group: attr('group'),
      subtitle: attr('subtitle'),
      summary,
      readme: rd,
      files: { readme: rd ? `project/components/${dir}/README.md` : null, preview: pv ? `project/components/${dir}/preview.html` : null },
      classes,
    });
    if (!rd) gaps.push(`Component \`${dir}\` has no README: usage rules unknown, read its preview.`);
    if (!pv) gaps.push(`Component \`${dir}\` has no preview.html: no markup to extract from.`);
  }
} else if (get('--components-dir')) gaps.push('No `project/components/` folder in the saved files: this design system documents no components.');

// ---------------------------------------------------------------------------
// Groups of tokens the fixed style does not know (size, motion, z-index…): kept, never dropped silently
// ---------------------------------------------------------------------------
const KNOWN = new Set(['name', 'version', 'color', 'type', 'spacing', 'radius', 'shadow', 'breakpoint', '$schema']);
const extra = {};
for (const [k, v] of Object.entries(t)) {
  if (KNOWN.has(k)) continue;
  extra[k] = v;
  const n = Array.isArray(v?.tokens) ? v.tokens.length : typeof v === 'object' && v ? Object.keys(v).length : 1;
  gaps.push(`Token group \`${k}\` (${n}) is not part of the fixed style: kept in the machine data under \`extra\`, not applied. Decide in style-align where it belongs (a token, a component constant) or drop it.`);
}

// ---------------------------------------------------------------------------
// Role map: design names → the plugin's roles. Same name does not mean same meaning
// (a design's `surface` can be the page background, which is the plugin's `bg`).
// ---------------------------------------------------------------------------
const { roleMap, coreMissing, typeMissing } = buildRoleMap(colors, type);
if (roleMap.status === 'needs-confirmation') {
  gaps.unshift(`Role mapping needs confirmation before any value is compared or applied: ${coreMissing.length ? `core colors missing (${coreMissing.join(', ')}), so names like \`surface\` may mean something else here; ` : ''}${typeMissing.length ? `type roles missing (${typeMissing.join(', ')}); ` : ''}style-align maps each design name to a role (or to none) and saves it with \`sync-values.mjs --map\`.`);
}

// ---------------------------------------------------------------------------
// Machine block
// ---------------------------------------------------------------------------
const data = {
  schema: 'design-source/1',
  name: shownName,
  suggestedPrefix: suggestPrefix(name),
  source: {
    kind: get('--kind') ?? 'design-system',
    designSystem: get('--source') ?? 'unknown',
    version: get('--version') ?? 'unknown',
    pointedFrom: get('--design') ?? null,
    extractedAt: today,
    tokensSha256: createHash('sha256').update(raw).digest('hex'),
  },
  themes,
  colors: Object.fromEntries(Object.entries(colors).map(([n, c]) => [n, { ...c.values, ...(c.alias ? { alias: c.alias } : {}), usage: c.usage, inFixedSet: c.inFixedSet }])),
  fonts,
  weights: [...weightSet].sort((a, b) => a - b),
  type,
  spacing,
  radius,
  shadows,
  breakpoints: { design: bpDesign, fixed: FIXED_BP },
  motion: null,
  roleMap,
  extra,
  components: components.map(({ readme: _r, ...c }) => c),
  overrides,
  gaps,
};

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim() || '—';
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');
const sw = (c, th) => `\`${c.values[th]}\`${c.alias?.[th] ? ` (= ${c.alias[th]})` : ''}`;

const sections = [];
sections.push(`# Design source — ${shownName}

> Written by \`/sb-context-nuxt:design-extract-style\`. This file belongs to the sb-context-nuxt plugin: it is the bridge between a Claude design (the artifact stays the source of truth) and the project. \`style-align\` reads it for the **values**, \`design-extract-ui\` for the component index. It is **not** a \`DESIGN.md\` (that file is Impeccable's and is never read or written here). Do not edit by hand: re-extract. Kept out of git.
>
> How to read it: the sections below are the human view; the last section, **Machine data**, holds the same information complete and normalized (aliases resolved, both themes, mobile sizes, component index without the README texts, which are only in the Components section). When a table and the machine block disagree, the machine block wins.`);

sections.push(`## Provenance

${table(['Field', 'Value'], [
  ['Design system', data.source.designSystem],
  ['Artifact version', data.source.version],
  ['Pointed from', data.source.pointedFrom ?? 'the design system itself'],
  ['Extracted on', today],
  ['tokens.json sha256', data.source.tokensSha256.slice(0, 16) + '…'],
  ['Suggested prefix', `\`${data.suggestedPrefix}\` (a proposal: style-align always asks, the answer wins)`],
  ['Themes', themes.join(', ')],
])}`);

sections.push(`## Colors

${Object.keys(colors).length} roles. Light${dark ? ' / dark' : ''}; "role" says whether the name is in the plugin's fixed set.

${table(['Role', light, ...(dark ? [dark] : []), 'In fixed set', 'Usage'], Object.entries(colors).map(([n, c]) => [`\`${n}\``, sw(c, light), ...(dark ? [sw(c, dark)] : []), c.inFixedSet ? 'yes' : 'no', c.usage]))}`);

sections.push(`## Typography

- Display family: ${fonts.display ? `\`${fonts.display}\`` : '—'}
- Body family: ${fonts.body ? `\`${fonts.body}\`` : '—'}${fonts.mono ? `\n- Mono family: \`${fonts.mono}\`` : ''}
- Weights used: ${data.weights.join(', ') || '—'}${fonts.files.length ? `\n- Font files: ${fonts.files.join(', ')}` : ''}

${Object.keys(type).length} styles. Mobile values come from the design's usage text when it gives them.

${table(['Role', 'Family', 'Size / line', 'Weight', 'Tracking', 'Mobile', 'In fixed set', 'Usage'], Object.entries(type).map(([n, s]) => [`\`${n}\``, s.familyRole, `${s.size} / ${s.lineHeight ?? 'auto'}`, s.weight, s.letterSpacing, s.mobile ? `${s.mobile.size} / ${s.mobile.lineHeight}` : null, s.inFixedSet ? 'yes' : 'no', s.usage]))}`);

sections.push(`## Spacing

${table(['Token', 'Value', 'Usage'], Object.entries(spacing).map(([n, s]) => [`\`${n}\``, s.value, s.usage]))}

## Radii

${table(['Token', 'Value', 'Static utility', 'Usage'], Object.entries(radius).map(([n, r]) => [`\`${n}\``, r.value, r.static ? 'yes (not a token)' : 'no', r.usage]))}

## Shadows

${t.shadow?.note ? `${t.shadow.note}\n\n` : ''}${Object.keys(shadows).length ? table(['Token', light, ...(dark ? [dark] : []), 'Usage'], Object.entries(shadows).map(([n, s]) => [`\`${n}\``, `\`${s.values[light]}\``, ...(dark ? [`\`${s.values[dark] ?? s.values[light]}\``] : []), s.usage])) : 'None declared.'}

## Breakpoints

${t.breakpoint?.note ? `${t.breakpoint.note}\n\n` : ''}The plugin fixes sm 640 / md 768 / lg 1024 / xl 1280; the design's own values are shown for reference.

${table(['Name', 'Design', 'Plugin', 'Usage'], Object.entries(bpDesign).map(([k, b]) => [`\`${k}\``, b.value, FIXED_BP[k] ?? 'not used', b.usage]))}

## Motion

None in the design. \`style-align\` applies its defaults (provisional).`);

sections.push(`## Brand guide

The design's own README, with the eyebrow wording removed (see Overrides).

${brandGuide || '_The design system has no README._'}`);

sections.push(`## Components

${components.length ? `${components.length} documented components. \`design-extract-ui\` matches the requested name against this list, then reads the markup in \`project/components/<Name>/preview.html\` from the artifact. Styles are in \`project/bundle.css\`.\n\n${table(['Component', 'Group', 'Summary', 'Classes in the preview'], components.map((c) => [`\`${c.name}\``, c.group, c.summary, c.classes.map((k) => `\`${k}\``).join(' ')]))}\n\n${components.map((c) => `### ${c.name}\n\n${c.subtitle ? `_${c.subtitle}_\n\n` : ''}${demote(c.readme, 2) || '_No README._'}`).join('\n\n')}` : '_No components were read from the design system._'}`);

sections.push(`## Overrides applied during extraction

${overrides.length ? overrides.map((o) => `- ${o}`).join('\n') : 'None.'}

## Gaps to resolve in style-align

${gaps.map((g) => `- ${g}`).join('\n')}`);

sections.push(`## Machine data

\`\`\`json design-source
${JSON.stringify(data, null, 2)}
\`\`\``);

const md = sections.join('\n\n') + '\n';

// ---------------------------------------------------------------------------
// Previous version: keep it and print what changed
// ---------------------------------------------------------------------------
mkdirSync(dirname(out), { recursive: true });
let previous = null;
if (existsSync(out)) {
  const old = readFileSync(out, 'utf8');
  const m = old.match(/```json design-source\n([\s\S]*?)\n```/);
  try {
    previous = m ? JSON.parse(m[1]) : null;
  } catch {
    previous = null;
  }
  copyFileSync(out, out.replace(/\.md$/, '.prev.md'));
}
writeFileSync(out, md);

// keep the folder out of git without touching tracked files
let excluded = 'not a git repo';
try {
  excluded = isInside(pluginDirOf(root), out) ? excludePluginDir(root) : 'output is outside .sb-context-nuxt/: not touched';
} catch {
  excluded = 'could not update .git/info/exclude: do it by hand';
}

// ---------------------------------------------------------------------------
// Coverage check: everything read must be in the output
// ---------------------------------------------------------------------------
const back = JSON.parse(md.match(/```json design-source\n([\s\S]*?)\n```/)[1]);
const cov = [
  ['colors', t.color.tokens.length, Object.keys(back.colors).length],
  ['type styles', typeRead, Object.keys(back.type).length],
  ['spacing', tokenList(t.spacing).length, Object.keys(back.spacing).length],
  ['radii', tokenList(t.radius).length, Object.keys(back.radius).length],
  ['shadows', tokenList(t.shadow).length, Object.keys(back.shadows).length],
  ['breakpoints', tokenList(t.breakpoint).length, Object.keys(back.breakpoints.design).length],
  ['other groups', Object.keys(t).filter((k) => !KNOWN.has(k)).length, Object.keys(back.extra).length],
];
const mismatch = cov.filter(([, a, b]) => a !== b);

console.log(`Written ${out}`);
console.log(`Name: ${shownName} · suggested prefix: ${data.suggestedPrefix} · themes: ${themes.join('/')} · components: ${components.length}`);
console.log(`Coverage (read → written): ${cov.map(([k, a, b]) => `${k} ${a}/${b}`).join(' · ')}${mismatch.length ? '  ← MISMATCH' : '  ✓'}`);
console.log(`Git: .sb-context-nuxt/ ${excluded}`);
console.log(`Overrides: ${overrides.length} · gaps: ${gaps.length}`);
for (const o of overrides) console.log(`  override: ${o}`);
for (const g of gaps) console.log(`  gap: ${g}`);

if (previous) {
  const diffs = [];
  const cmp = (label, a = {}, b = {}) => {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) diffs.push(`+ ${label} ${k}`);
      else if (!(k in b)) diffs.push(`- ${label} ${k}`);
      else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(`~ ${label} ${k}`);
    }
  };
  cmp('color', previous.colors, back.colors);
  cmp('type', previous.type, back.type);
  cmp('spacing', previous.spacing, back.spacing);
  cmp('radius', previous.radius, back.radius);
  cmp('shadow', previous.shadows, back.shadows);
  cmp('component', Object.fromEntries((previous.components ?? []).map((c) => [c.name, c])), Object.fromEntries(data.components.map((c) => [c.name, c])));
  console.log(`Previous version kept as ${out.replace(/\.md$/, '.prev.md')} (was ${previous.source?.version ?? '?'}, now ${back.source.version}). Changes: ${diffs.length || 'none'}`);
  for (const d of diffs) console.log(`  ${d}`);
}
if (mismatch.length) process.exit(4);
