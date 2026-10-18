#!/usr/bin/env node
// Checks a Vue + Vite library after its build: what package.json declares against what the package ships,
// and how it declares the libraries its users install too (Vue, and whatever has Vue as a peer).
//
// Usage (from anywhere inside the library, after its build):
//   npm pack --dry-run --json --ignore-scripts | node lib-check.mjs --pack -
//                                 the files of the real package (what "files", .npmignore and npm's own rules keep)
//   node lib-check.mjs            without --pack: the folder on disk (it cannot see what "files" leaves out)
//   --pack <file|->               the JSON of `npm pack --dry-run --json`, from a file or from stdin (-)
//   --json                        the report as JSON: { name, fromPack, files, targets, findings }
//   --root <dir>                  the library's root (default: found from the current folder upward)
//
// Checks: L1 every path of exports / main / module / types / bin is in the package, .d.ts files included;
// L2 a "files" field; L3 / L4 a "types" condition in exports, listed first; L5 vue not in dependencies;
// L6 dependencies that have vue as a peer belong in peerDependencies; L7 every peer also in devDependencies,
// on a major the peer range allows; L8 peer ranges with an upper bound; L9 peers left out of the bundle
// (the built files import them); L10 "sideEffects": false with CSS in the package.
// Exit codes: 0 clean · 10 errors or warnings found · 3 nothing built yet (no declared JavaScript file exists).
// Never modifies a file and never runs another program: npm pack is run by the skill, its output is read here.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, sep, posix as path } from 'node:path';
import { projectRoot, requireStack } from '../core/lib/project.mjs';
import { readPackage } from '../core/lib/profile.mjs';
import { checkLibrary, declaredTargets } from './lib/lib-check.mjs';

const argv = process.argv.slice(2);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const root = projectRoot(opt('--root'));
const profile = requireStack(root, { adapters: ['vue-vite'], kinds: ['library'], what: 'The library check of /sb-health:build' });
const pkg = readPackage(root) ?? {};

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};
const posix = (p) => p.split(sep).join('/');
const SKIP = new Set(['node_modules', '.git', '.sb-context']);
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// What the package ships: npm pack's own list (it applies "files", .npmignore and npm's rules), else the disk
let fromPack = false;
let files = null;
const packArg = opt('--pack');
if (packArg) {
  try {
    const text = readFileSync(packArg === '-' ? 0 : packArg, 'utf8');
    // npm < 11 prints [ { files } ], newer versions { "<name>": { files } }
    const out = JSON.parse(text.slice(text.search(/[[{]/)));
    files = new Set((Array.isArray(out) ? out[0] : Object.values(out)[0]).files.map((f) => posix(f.path)));
    fromPack = true;
  } catch (e) {
    console.error(`--pack: not the JSON of \`npm pack --dry-run --json\` (${e.message}).`);
    process.exit(2);
  }
}
if (!files) files = new Set(walk(root).map((f) => posix(relative(root, f))));

const metaOf = (name) => readJson(join(root, 'node_modules', name, 'package.json'));
const JS = new Set(['.js', '.mjs', '.cjs']);
// the built JavaScript: the shipped .js/.mjs/.cjs files in the folders package.json points to (an IIFE build has no imports)
const outDirs = [...new Set(declaredTargets(pkg).map((t) => path.dirname(`${t.path.replace(/^\.\//, '').split('*')[0]}x`)))];
const inOutput = (f) => outDirs.some((d) => d === '.' || f.startsWith(`${d}/`));
const output = [...files]
  .filter((f) => JS.has(extname(f)) && !/\.iife\./.test(f) && inOutput(f) && existsSync(join(root, f)))
  .map((f) => ({ file: f, code: readFileSync(join(root, f), 'utf8') }));
const srcDir = join(root, profile.paths?.src ?? 'src');
const source = walk(srcDir)
  .filter((f) => ['.ts', '.js', '.mts', '.mjs', '.vue', '.tsx', '.jsx'].includes(extname(f)))
  .map((f) => ({ file: posix(relative(root, f)), code: readFileSync(f, 'utf8') }));

const { findings, targets, built } = checkLibrary({ pkg, files, metaOf, output, source, fromPack });

if (!built) {
  console.error(`Nothing built yet: ${targets.filter((t) => !t.shipped).map((t) => t.path).join(', ')} not found. Run the build first (/sb-health:build), then this check.`);
  process.exit(3);
}

if (argv.includes('--json')) {
  console.log(JSON.stringify({ name: pkg.name ?? null, fromPack, files: files.size, targets, findings }, null, 2));
} else {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const L = [`# Library check — ${pkg.name ?? root}\n`];
  L.push(`Files: ${fromPack ? `the published package, from npm pack (${files.size} files)` : `the folder on disk (${files.size} files; without --pack, what "files" leaves out is not seen)`}\n`);
  for (const [title, list] of [['Errors', errors], ['Warnings', warnings]]) {
    if (!list.length) continue;
    L.push(`## ${title}\n`);
    for (const f of list) L.push(`- [${f.code}] \`${f.subject}\`: ${f.message}`);
    L.push('');
  }
  L.push('## Declared files\n', '| Field | Path | In the package |', '| --- | --- | --- |');
  for (const t of targets) L.push(`| \`${t.field}\` | \`${t.path}\` | ${t.shipped ? 'yes' : '**no**'} |`);
  L.push('', `**Result: ${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}**`);
  console.log(L.join('\n'));
}
process.exit(findings.length ? 10 : 0);
