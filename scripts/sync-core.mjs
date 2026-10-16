#!/usr/bin/env node
// Copies core/ (the code and references every plugin shares) into each plugin as <plugin>/core/.
//
// A plugin installed from the marketplace is copied alone into Claude Code's cache: it cannot read
// files outside its own folder, so each one carries its own copy of the core. The copies are
// committed (the install runs no build step) and never edited by hand: edit core/, then run this.
//
// Usage (from the repo root):
//   node scripts/sync-core.mjs           write the copies (files no longer in core/ are removed)
//   node scripts/sync-core.mjs --check   write nothing; exit 1 and list the differences if a copy is stale
//
// A symlink would avoid the copies, but git checks symlinks out as plain files on Windows by default,
// and the plugin would break there.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORE = join(REPO, 'core');
/** The plugins that run scripts. The bundle (sb-context-fe) has none. */
export const PLUGINS = ['sb-core', 'sb-github', 'sb-health', 'sb-design'];

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir).sort()) {
    if (e === '.DS_Store') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const rel = (base, p) => relative(base, p).split(sep).join('/');

const check = process.argv.includes('--check');
const source = new Map(walk(CORE).map((p) => [rel(CORE, p), readFileSync(p)]));
const problems = [];

for (const plugin of PLUGINS) {
  const target = join(REPO, 'plugins', plugin, 'core');
  const copied = new Map(walk(target).map((p) => [rel(target, p), p]));
  for (const [file, content] of source) {
    const dest = join(target, file);
    const same = copied.has(file) && readFileSync(dest).equals(content);
    if (same) continue;
    if (check) problems.push(`plugins/${plugin}/core/${file}: ${copied.has(file) ? 'differs from' : 'missing, not copied from'} core/${file}`);
    else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, content);
    }
  }
  for (const [file, p] of copied) {
    if (source.has(file)) continue;
    if (check) problems.push(`plugins/${plugin}/core/${file}: not in core/ any more`);
    else rmSync(p);
  }
}

if (check) {
  if (problems.length) {
    console.error(`The plugins' copies of core/ are stale. Run: node scripts/sync-core.mjs\n${problems.map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`core/ is in sync in ${PLUGINS.length} plugins (${source.size} files each).`);
} else console.log(`Copied core/ (${source.size} files) into ${PLUGINS.map((p) => `plugins/${p}/core`).join(', ')}.`);
