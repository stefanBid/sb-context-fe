#!/usr/bin/env node
// Renames the token/utility prefix of an already aligned global style
// (e.g. sb → ps) across the CSS and the project sources.
//
// Usage (from the project root):
//   node "${CLAUDE_SKILL_DIR}/scripts/rename-prefix.mjs" --to ps            dry run
//   node "${CLAUDE_SKILL_DIR}/scripts/rename-prefix.mjs" --to ps --apply    write the changes
//   --from sb      current prefix (default: detected from `@utility <p>-h1` / `<p>-body`)
//   --root <dir>   project root (default: the Nuxt project found from the current folder upward)
//
// What it renames, and only this:
//   - raw variables:  --sb-primary        → --ps-primary
//   - utilities defined with `@utility sb-*` (in CSS: @utility, @apply, selectors;
//     in .vue/.ts/.js/.html/.md: class names, also with variants like lg:sb-h1)
//   - the `Prefix "sb"` comment in the CSS headers
// Other identifiers that start with `sb-` are NOT touched; they are listed for review.
// Without --apply it never modifies any file.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, extname } from 'node:path';
import { projectRoot } from '../../../scripts/lib/project.mjs';
import { prefixError } from '../../../scripts/lib/prefix.mjs';
import { detectPrefix, prefixInUse, utilityNames, renamer } from './lib/rename.mjs';

const argv = process.argv.slice(2);
const get = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const root = projectRoot(get('--root'));
const to = get('--to');
const apply = argv.includes('--apply');

const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};

if (!to) fail('Pass the new prefix: --to <prefix>.');
if (prefixError(to)) fail(prefixError(to));

const IGNORE = new Set(['node_modules', '.nuxt', '.output', '.git', 'dist', '.data', 'coverage']);
function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(name))) out.push(p);
  }
  return out;
}

const cfgPath = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'].map((f) => join(root, f)).find(existsSync);
const cfg = cfgPath ? readFileSync(cfgPath, 'utf8') : '';
const sd = cfg.match(/srcDir\s*:\s*['"`]([^'"`]+)['"`]/);
const srcDir = sd ? resolve(root, sd[1]) : existsSync(join(root, 'app')) ? join(root, 'app') : root;

// CSS files of the global style
const cssFiles = walk(join(srcDir, 'assets'), ['.css']);
if (!cssFiles.length) fail(`No CSS found in ${relative(root, join(srcDir, 'assets')) || '.'}. Run it from the project root.`);
const cssText = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

const from = get('--from') ?? detectPrefix(cssText);
if (!from) fail('Current prefix not detected (no `@utility <prefix>-h1` / `<prefix>-body`): the style is not aligned yet. Use --from <prefix> or run style-align first.');
if (from === to) fail(`The prefix is already "${to}".`);

// Collision check: the new prefix must not already be in use
if (prefixInUse(cssText, to)) fail(`"${to}" is already used by variables or utilities in the global CSS: choose another prefix.`);

const utilNames = utilityNames(cssText, from);
if (!utilNames.length) fail(`No \`@utility ${from}-*\` found: check --from.`);
const { rename, others: othersIn } = renamer(from, to, utilNames);

const targets = [
  ...cssFiles,
  ...walk(srcDir, ['.vue', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.html', '.md']).filter((f) => !cssFiles.includes(f)),
  ...['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs', 'app.config.ts'].map((f) => join(root, f)).filter(existsSync),
];

let total = 0;
const rows = [];
const others = new Map();
for (const f of [...new Set(targets)]) {
  const src = readFileSync(f, 'utf8');
  const { out, n } = rename(src);
  for (const id of othersIn(out)) others.set(id, (others.get(id) ?? 0) + 1);
  if (n) {
    rows.push({ file: relative(root, f), n });
    total += n;
    if (apply) writeFileSync(f, out);
  }
}

console.log(`# Prefix rename: ${from} → ${to} ${apply ? '(applied)' : '(dry run: nothing written)'}\n`);
console.log('| File | Replacements |');
console.log('| --- | --- |');
for (const r of rows.sort((a, b) => b.n - a.n)) console.log(`| ${r.file} | ${r.n} |`);
console.log(`\nTotal: ${total} replacements in ${rows.length} files. Utilities renamed: ${[...new Set(utilNames)].length}.`);
if (others.size)
  console.log(`\nIdentifiers starting with \`${from}-\` that were NOT renamed (not defined as utilities or variables of the style; review by hand):\n${[...others].slice(0, 20).map(([k, v]) => `- \`${k}\` × ${v}`).join('\n')}${others.size > 20 ? `\n- … ${others.size - 20} more` : ''}`);
if (!apply) console.log('\nRun again with --apply to write the changes.');
