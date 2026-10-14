#!/usr/bin/env node
// Keeps the project's global style aligned with the design snapshot.
// Compares `.sb-context-nuxt/design-source.md` (written by design-extract-style) with the
// values in the project's four CSS files, reports every difference, and with --apply updates
// the VALUES of tokens that already exist. Structure, names, prefix and files are never touched.
//
// Usage (from anywhere in the project):
//   node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --check            # exit 0 aligned, 10 drift, 3 no snapshot/style
//   node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs"                    # table of differences (dry run)
//   node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --apply            # write changed values, then record the state
//   node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --record           # only record "snapshot applied" (after a full style-align write)
//   node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --map colors.surface=bg colors.surface-raised=surface type.heading=h2 colors.line=null
//                                                                         # confirm which plugin role each design name stands for (null = none)
//   options: --snapshot <path> --prefix <p> --json
//
// Runs from anywhere inside a Nuxt project: it finds the project root (nuxt.config.*), reads the snapshot from
// <root>/.sb-context-nuxt/, and edits only <srcDir>/assets/css/ (theme.css, typography.css) — the fixed place of the global style.
// Exit codes: 0 aligned · 10 drift · 3 no snapshot / no aligned style · 4 role mapping needed or inconsistent.
//
// Differences it cannot apply (new tokens, tokens the design dropped, a changed family list, hero clamp)
// are listed as "needs a decision": they are never written or deleted silently.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { projectRoot, cssDirOf, pluginDirOf, excludePluginDir, relPath } from '../../../scripts/lib/project.mjs';
import { nHex, nShadow, nFamily, toRem, same, remStr, blockOf, findSlot, writeSlots, refreshMobileComments, parseMapArg, byRole as byRoleOf } from './lib/sync.mjs';

const argv = process.argv.slice(2);
const get = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const has = (n) => argv.includes(n);
const root = projectRoot();
const snapPath = resolve(get('--snapshot') || join(pluginDirOf(root), 'design-source.md'));

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------
if (!existsSync(snapPath)) {
  console.error(`No snapshot at ${snapPath}. Run /sb-context-nuxt:design-extract-style first.`);
  process.exit(3);
}
const snapText = readFileSync(snapPath, 'utf8');
const block = snapText.match(/```json design-source\n([\s\S]*?)\n```/);
if (!block) {
  console.error('The snapshot has no `json design-source` block: re-extract it with design-extract-style.');
  process.exit(3);
}
const S = JSON.parse(block[1]);
const [light, dark] = S.themes;

// ---------------------------------------------------------------------------
// Project CSS
// ---------------------------------------------------------------------------
const dir = cssDirOf(root); // the global style lives in <srcDir>/assets/css, always
if (!existsSync(join(dir, 'theme.css')) || !existsSync(join(dir, 'typography.css'))) {
  console.error(`The project has no aligned global style (theme.css / typography.css not found in ${relPath(root, dir)}). Run /sb-context-nuxt:style-align.`);
  process.exit(3);
}
const files = { theme: join(dir, 'theme.css'), typography: join(dir, 'typography.css'), animation: join(dir, 'animation.css') };
const src = { theme: readFileSync(files.theme, 'utf8'), typography: readFileSync(files.typography, 'utf8') };

const prefix = get('--prefix') || src.theme.match(/--([a-z]{2,4})-bg\s*:/)?.[1];
if (!prefix) {
  console.error('Cannot detect the token prefix in theme.css (no --<prefix>-bg). Pass --prefix.');
  process.exit(3);
}

// ---------------------------------------------------------------------------
// Role map: which plugin role each design name stands for.
// Same name does not mean same meaning (a design's `surface` may be the page background = the plugin's `bg`).
// Identity snapshots map name → name. Others need a confirmed map in .sb-context-nuxt/design-map.json.
// ---------------------------------------------------------------------------
const mapFile = join(pluginDirOf(root), 'design-map.json');
const readMap = () => (existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : { colors: {}, type: {} });
if (has('--map')) {
  const args = argv.slice(argv.indexOf('--map') + 1).filter((a, i, all) => !a.startsWith('--') && all.slice(0, i).every((x) => !x.startsWith('--')));
  const m = readMap();
  for (const a of args) {
    const mm = parseMapArg(a);
    if (!mm) {
      console.error(`Bad mapping "${a}". Use colors.<design name>=<role> or type.<design name>=<role>; <role> may be null.`);
      process.exit(2);
    }
    const { kind, name, role } = mm;
    if (!(name in (kind === 'colors' ? S.colors : S.type))) {
      console.error(`The snapshot has no ${kind} "${name}".`);
      process.exit(2);
    }
    m[kind][name] = role;
  }
  m.confirmedAt = new Date().toISOString().slice(0, 10);
  m.snapshotSha = S.source.tokensSha256;
  mkdirSync(dirname(mapFile), { recursive: true });
  writeFileSync(mapFile, JSON.stringify(m, null, 2) + '\n');
  excludePluginDir(root);
  console.log(`Saved the role mapping in ${relPath(root, mapFile)}.`);
  process.exit(0);
}
const rm = S.roleMap ?? { status: 'identity' };
const colorMap = {};
const typeMap = {};
if (rm.status === 'identity') {
  for (const n of Object.keys(S.colors)) colorMap[n] = n;
  for (const n of Object.keys(S.type ?? {})) typeMap[n] = n;
} else {
  const m = readMap();
  const miss = [...Object.keys(S.colors).filter((n) => !(n in m.colors)).map((n) => ['colors', n]), ...Object.keys(S.type ?? {}).filter((n) => !(n in m.type)).map((n) => ['type', n])];
  if (miss.length) {
    console.error(`Role mapping needed (${miss.length} design name(s) not mapped yet). Nothing was compared or written.`);
    console.error('Map each design name to a plugin role, or to null if it has none, then save it with --map. Suggestions:');
    for (const [kind, n] of miss) {
      const r = rm[kind === 'colors' ? 'colors' : 'type']?.[n];
      console.error(`  ${kind}.${n}  → ${r?.suggested ?? r?.suspicious ?? '?'}${r?.role ? `   (same-name role "${r.role}" exists${r.suspicious ? `, but its usage suggests "${r.suspicious}"` : ''})` : ''}`);
    }
    process.exit(4);
  }
  Object.assign(colorMap, m.colors);
  Object.assign(typeMap, m.type);
}
const byRole = (map, src) => {
  try {
    return byRoleOf(map, src);
  } catch (e) {
    console.error(e.message);
    process.exit(4);
  }
};
const colorByRole = byRole(colorMap, S.colors);
const typeByRole = byRole(typeMap, S.type ?? {});
const unmapped = [...Object.entries(colorMap), ...Object.entries(typeMap)].filter(([, r]) => !r).map(([n]) => n);

// ---------------------------------------------------------------------------
// Read the project's values (declaration → value, with its position)
// ---------------------------------------------------------------------------
const themeBlocks = {
  [light]: blockOf(src.theme, /:root\s*,\s*\[data-theme="light"\]\s*\{/) || blockOf(src.theme, /:root\s*\{/),
  ...(dark ? { [dark]: blockOf(src.theme, /\[data-theme="dark"\]\s*\{/) } : {}),
};
// A "slot" is where a value lives: file, name, position (see lib/sync.mjs).
const slot = (file, name, range) => findSlot(src[file], name, range, file);

const diffs = []; // { area, token, theme?, current, wanted, apply: slot|null, note? }
const undecided = []; // { area, token, note }
const edit = (area, token, th, cur, want, sl, mk) => diffs.push({ area, token, theme: th, current: cur, wanted: want, slot: sl, make: mk });

// ---- colors --------------------------------------------------------------
const ROLE_RE = new RegExp(`--${prefix}-([a-z0-9-]+)\\s*:`, 'g');
const projectColorRoles = new Set();
for (const th of S.themes) {
  const r = themeBlocks[th];
  if (!r) continue;
  for (const m of src.theme.slice(r.start, r.end).matchAll(ROLE_RE)) if (!/^shadow-/.test(m[1])) projectColorRoles.add(m[1]);
}
for (const [role, c] of Object.entries(colorByRole)) {
  if (!projectColorRoles.has(role)) {
    undecided.push({ area: 'color', token: role, note: `new in the design (${c[light]}${dark ? ' / ' + c[dark] : ''}): not in the project, add it with a role decision` });
    continue;
  }
  for (const th of S.themes) {
    const r = themeBlocks[th];
    if (!r) continue;
    const sl = slot('theme', `--${prefix}-${role}`, r);
    if (!sl) {
      if (th === light) undecided.push({ area: 'color', token: role, note: `missing in the ${th} block of theme.css` });
      continue;
    }
    const alias = c.alias?.[th] ? (colorMap[c.alias[th]] ?? c.alias[th]) : null;
    const want = alias ? `var(--${prefix}-${alias})` : nHex(c[th]);
    const cur = /^var\(/.test(sl.value) ? sl.value.replace(/\s+/g, '') : nHex(sl.value);
    if (cur !== want) edit('color', role, th, sl.value, alias ? want : c[th], sl, () => (alias ? want : nHex(c[th])));
  }
}
for (const role of projectColorRoles) if (!colorByRole[role]) undecided.push({ area: 'color', token: role, note: 'in the project, not in the design: kept (project-specific role)' });

// ---- shadows -------------------------------------------------------------
for (const [name, sh] of Object.entries(S.shadows ?? {})) {
  for (const th of S.themes) {
    const r = themeBlocks[th];
    if (!r) continue;
    const sl = slot('theme', `--${prefix}-shadow-${name}`, r);
    if (!sl) {
      if (th === light) undecided.push({ area: 'shadow', token: name, note: 'not in the project' });
      continue;
    }
    const want = sh.values[th] ?? sh.values[light];
    if (nShadow(sl.value) !== nShadow(want)) edit('shadow', name, th, sl.value, want, sl, () => want);
  }
}

// ---- radii (design names sm, md, lg, xl → --radius-*) ---------------------
for (const [name, r] of Object.entries(S.radius ?? {})) {
  if (r.static) continue;
  const sl = slot('theme', `--radius-${name}`);
  if (!sl) {
    undecided.push({ area: 'radius', token: name, note: `new in the design (${r.value}): not in the project` });
    continue;
  }
  if (!same(toRem(sl.value), toRem(r.value))) edit('radius', name, null, sl.value, r.value, sl, () => r.value);
}

// ---- typography ----------------------------------------------------------
const projectRoles = new Set([...src.typography.matchAll(/--text-([a-z0-9-]+?)(?:--(?:line-height|font-weight|letter-spacing))?\s*:/g)].map((m) => m[1]));
for (const [role, s] of Object.entries(typeByRole)) {
  if (!projectRoles.has(role)) {
    undecided.push({ area: 'type', token: role, note: `new in the design (${s.size} / ${s.lineHeight}): not in the project, add it with a role decision` });
    continue;
  }
  const fields = [
    ['', s.size, (v) => remStr(v)],
    ['--line-height', s.lineHeight, (v) => remStr(v)],
    ['--font-weight', s.weight, (v) => String(v)],
    ['--letter-spacing', s.letterSpacing, (v) => String(v)],
  ];
  for (const [suffix, want, fmt] of fields) {
    const name = `--text-${role}${suffix}`;
    const sl = slot('typography', name);
    if (!sl) {
      if (want != null && suffix !== '' ) undecided.push({ area: 'type', token: `${role}${suffix}`, note: `design gives ${want}, the project has no ${name}` });
      continue;
    }
    if (want == null) continue;
    const a = suffix === '--font-weight' ? Number(sl.value) : toRem(sl.value);
    const b = suffix === '--font-weight' ? Number(want) : toRem(want);
    if (!same(a, b)) edit('type', `${role}${suffix}`, null, sl.value, fmt(want), sl, () => fmt(want));
  }
  // mobile values live in the utility (display, h1, h2)
  if (s.mobile && ['display', 'h1', 'h2'].includes(role)) {
    const ut = blockOf(src.typography, new RegExp(`@utility\\s+${prefix}-${role}\\s*\\{`));
    if (ut) {
      const fs = slot('typography', 'font-size', ut);
      const lh = slot('typography', 'line-height', ut);
      if (fs && !/var\(/.test(fs.value) && !same(toRem(fs.value), toRem(s.mobile.size))) edit('type', `${role} mobile size`, null, fs.value, remStr(s.mobile.size), fs, () => remStr(s.mobile.size));
      if (lh && !/var\(/.test(lh.value) && !same(toRem(lh.value), toRem(s.mobile.lineHeight))) edit('type', `${role} mobile line-height`, null, lh.value, remStr(s.mobile.lineHeight), lh, () => remStr(s.mobile.lineHeight));
    }
  }
}
for (const role of projectRoles) if (!typeByRole[role] && role !== 'hero' && !/^(\*|shadow-\*)$/.test(role)) undecided.push({ area: 'type', token: role, note: 'in the project, not in the design: kept' });
if (diffs.some((d) => d.area === 'type' && /^(display)(--| |$)/.test(d.token)) && /--text-hero\s*:/.test(src.typography))
  undecided.push({ area: 'type', token: 'hero', note: '`display` changed: the `hero` clamp() depends on its ratio, recompute it (typography.md §4)' });

// ---- families ------------------------------------------------------------
for (const [role, want] of [['display', S.fonts?.display], ['body', S.fonts?.body]]) {
  const sl = slot('typography', `--font-${role}`);
  if (!want || !sl) continue;
  if (nFamily(sl.value) !== nFamily(want)) undecided.push({ area: 'font', token: role, note: `family changed: ${sl.value.split(',')[0]} → ${want.split(',')[0]}. Update the stack here and \`fonts.families\` (weights) in nuxt.config.ts` });
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const applied = join(root, '.sb-context-nuxt', 'design-applied.json');
const record = () => {
  mkdirSync(dirname(applied), { recursive: true });
  writeFileSync(applied, JSON.stringify({ designSystem: S.source.designSystem, version: S.source.version, tokensSha256: S.source.tokensSha256, appliedAt: new Date().toISOString().slice(0, 10), prefix, cssDir: relPath(root, dir) }, null, 2) + '\n');
};

if (has('--record')) {
  record();
  console.log(`Recorded: snapshot ${S.source.version} applied (prefix ${prefix}).`);
  process.exit(0);
}

const prev = existsSync(applied) ? JSON.parse(readFileSync(applied, 'utf8')) : null;
const drift = diffs.length > 0;
const header = `Snapshot: ${S.name} · artifact version ${S.source.version} · prefix ${prefix} · ${relPath(root, dir)}\nLast applied: ${prev ? `${prev.version} on ${prev.appliedAt}` : 'never recorded'}`;

if (has('--json')) {
  console.log(JSON.stringify({ aligned: !drift, unmapped, differences: diffs.map(({ slot: _s, make: _m, ...d }) => d), needsDecision: undecided, lastApplied: prev }, null, 2));
  process.exit(drift ? 10 : 0);
}

console.log(header);
if (!drift) console.log('Values: aligned with the design snapshot ✓');
else {
  console.log(`Values: ${diffs.length} difference(s) between the design and the project\n`);
  console.log('| Area | Token | Theme | Project now | Design |\n| --- | --- | --- | --- | --- |');
  for (const d of diffs) console.log(`| ${d.area} | \`${d.token}\` | ${d.theme ?? '—'} | \`${d.current}\` | \`${d.wanted}\` |`);
}
if (unmapped.length) console.log(`\nDesign-only (mapped to no role, not applied): ${unmapped.join(', ')}`);
console.log('Motion (animation.css) is not synced: the design system has no motion; the file keeps its own timings.');
if (undecided.length) {
  console.log('\nNeeds a decision (never applied automatically):');
  for (const u of undecided) console.log(`- [${u.area}] \`${u.token}\`: ${u.note}`);
}

if (has('--check')) process.exit(drift ? 10 : 0);

if (has('--apply')) {
  if (!drift) {
    record();
    console.log('\nNothing to write. Recorded as applied.');
    process.exit(0);
  }
  // write from the end of each file so earlier offsets stay valid
  const byFile = {};
  for (const d of diffs) (byFile[d.slot.file] ??= []).push(d);
  for (const [file, list] of Object.entries(byFile)) {
    // values written from the end of the file; px comments ("/* 56 */") follow the new value
    let text = writeSlots(src[file], list.map((d) => ({ slot: d.slot, value: d.make() })));
    if (file === 'typography') text = refreshMobileComments(text, prefix, typeByRole);
    writeFileSync(files[file], text);
  }
  record();
  console.log(`\nApplied ${diffs.length} value(s) in ${Object.keys(byFile).map((f) => `${f}.css`).join(', ')}. Recorded snapshot ${S.source.version} as applied.`);
  console.log('Next: contrast.mjs on theme.css, inventory.mjs (still aligned), project build.');
}
