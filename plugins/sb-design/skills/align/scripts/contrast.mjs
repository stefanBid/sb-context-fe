#!/usr/bin/env node
// Contrast check by role, in the light and dark themes.
//
// Usage (call it as node "${CLAUDE_SKILL_DIR}/scripts/contrast.mjs" ...):
//   contrast.mjs <theme.css> --prefix ps            standard role pairs
//   contrast.mjs <file.css> --pairs pairs.json      custom pairs
//   contrast.mjs --pair "#56626C" "#F5F3EE"         a single pair
//   add --json for JSON output
//
// pairs.json: [{ "fg": "--text-main", "bg": "--page", "min": 4.5, "note": "body text", "level": "required" }]
// level is "required" (default) or "warning" (reported, does not fail).
//
// Light theme: :root, html, [data-theme="light"]. Dark theme: [data-theme="dark"],
// .dark, or any block inside @media (prefers-color-scheme: dark).
// The dark theme inherits from the light theme every variable it does not redefine.
// Exits with code 1 if at least one required pair is below its minimum.

import { readFileSync } from 'node:fs';
import '../../../core/lib/cli.mjs'; // blocking stdout: the JSON reaches the pipe whole
import { parseColor, contrast } from '../../../scripts/lib/color.mjs';
import { themeVars, standardPairs, customPairs, evaluate, surfaces, surfaceNotes } from './lib/theme-vars.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const asJson = args.includes('--json');

// ---------------------------------------------------------------------------
// Single-pair mode
// ---------------------------------------------------------------------------
if (args[0] === '--pair') {
  const fg = parseColor(args[1]);
  const bg = parseColor(args[2]);
  if (!fg || !bg) {
    console.error('Colors not recognized.');
    process.exit(2);
  }
  const min = parseFloat(flag('--min') || '4.5');
  const ratio = contrast(fg, bg);
  const out = { fg: args[1], bg: args[2], ratio: +ratio.toFixed(2), min, ok: ratio >= min };
  console.log(asJson ? JSON.stringify(out) : `${args[1]} on ${args[2]}: ${ratio.toFixed(2)}:1 (minimum ${min}) ${out.ok ? 'OK' : 'FAILS'}`);
  process.exit(out.ok ? 0 : 1);
}

const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--prefix' && args[args.indexOf(a) - 1] !== '--pairs');
if (!file) {
  console.error('Pass the CSS file to check. See the script header for usage.');
  process.exit(2);
}
const prefix = flag('--prefix');
const pairsFile = flag('--pairs');

// ---------------------------------------------------------------------------
// Theme variables and pairs
// ---------------------------------------------------------------------------
const { light, dark, hasDark } = themeVars(readFileSync(file, 'utf8'));
const pairs = pairsFile ? customPairs(JSON.parse(readFileSync(pairsFile, 'utf8'))) : standardPairs(prefix);

const results = [];
const surf = [];
const notes = {};
for (const [name, map] of [['light', light], ...(hasDark ? [['dark', dark]] : [])]) {
  const r = evaluate(map, pairs, name);
  results.push(r);
  const s = surfaces(map, name, prefix);
  surf.push(...s);
  if (!pairsFile) notes[name] = surfaceNotes(s, name);
}

const allRows = results.flatMap((r) => r.rows);
const failed = allRows.filter((r) => (r.ok === false && r.level !== 'warning') || r.error);
const warned = allRows.filter((r) => r.ok === false && r.level === 'warning');

if (asJson) {
  console.log(JSON.stringify({ file, prefix, darkTheme: hasDark, pairs: allRows, missing: results.map((r) => r.missing), lightness: surf, notes }, null, 2));
} else {
  console.log(`# Contrast — ${file}${prefix ? ` (prefix ${prefix})` : ''}\n`);
  if (!hasDark) console.log('**No dark theme found.**\n');
  for (const r of results) {
    const t = r.rows[0]?.theme ?? '';
    if (!r.rows.length) continue;
    console.log(`## ${t === 'light' ? 'Light' : 'Dark'} theme\n`);
    console.log('| Text / element | Background | Ratio | Minimum | Result | Use |');
    console.log('| --- | --- | --- | --- | --- | --- |');
    for (const row of r.rows) {
      if (row.error) console.log(`| ${row.fg} | ${row.bg} | — | ${row.min} | ERROR | ${row.error} |`);
      else console.log(`| ${row.fg} | ${row.bg} | ${row.ratio}:1 | ${row.min} | ${row.ok ? 'ok' : row.level === 'warning' ? 'warning' : '**FAIL**'} | ${row.note} |`);
    }
    if (r.missing.length) console.log(`\nMissing variables: ${r.missing.join(', ')}`);
    console.log('');
  }
  if (surf.length) {
    console.log('## Role lightness (OKLCH)\n');
    console.log('| Theme | Role | Hex | L | C | H |');
    console.log('| --- | --- | --- | --- | --- | --- |');
    for (const s of surf) console.log(`| ${s.theme} | ${s.role} | ${s.hex} | ${s.L} | ${s.C} | ${s.H} |`);
    console.log('');
  }
  const allNotes = Object.entries(notes).flatMap(([t, n]) => n.map((line) => `- (${t}) ${line}`));
  if (allNotes.length) {
    console.log('## Observations (information only: values follow design-source.md or the project)\n');
    console.log(allNotes.join('\n'));
  }
  console.log(`\nPairs checked: ${allRows.length}, below minimum or unreadable: ${failed.length}, warnings: ${warned.length}.`);
}
process.exit(failed.length ? 1 : 0);
