#!/usr/bin/env node
// Migration of a project set up with sb-context-nuxt 0.x to the sb-context-fe 1.0 plugins.
//
// Usage (from anywhere inside the project):
//   node migrate-v1.mjs                   the plan as JSON, writes nothing
//   node migrate-v1.mjs --apply           moves .sb-context-nuxt/ to .sb-context/ (renaming project-settings.json →
//                                         settings.json and github_settings.json → github.json), writes .sb-context/.gitignore
//                                         and removes the `.sb-context-nuxt/` line from .git/info/exclude
//   node migrate-v1.mjs --apply --refs    also rewrites the references found in the project's docs and Claude settings
//                                         (skill commands, plugin id, folder and file names)
//
// Exit codes: 0 done (or nothing to migrate) · 2 usage error · 3 conflict: .sb-context/ already has a file the move
// would overwrite (nothing is written; the plan lists the files).
//
// It never deletes a file of the plugins: files are moved, and the old folder is removed only once it is empty.
// The references are searched in the project's docs and settings only (top-level *.md, .claude/, docs/, .github/),
// never in the source code.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, renameSync, rmdirSync, rmSync } from 'node:fs';
import { join, isAbsolute, resolve } from 'node:path';
import { projectRoot, contextDirOf, legacyDirOf, ensureContextDir, relPath, CONTEXT_DIR, LEGACY_DIR } from '../core/lib/project.mjs';
import { newFileName, rewriteRefs, dropLegacyExclude, gitdirOf } from './lib/migration.mjs';

const args = process.argv.slice(2);
const unknown = args.filter((a) => !['--apply', '--refs'].includes(a));
if (unknown.length || (args.includes('--refs') && !args.includes('--apply'))) {
  console.error(`Usage: migrate-v1.mjs [--apply [--refs]]${unknown.length ? ` (unknown argument ${unknown[0]})` : ' (--refs needs --apply)'}`);
  process.exit(2);
}
const apply = args.includes('--apply');
const refsToo = args.includes('--refs');

const root = projectRoot(null, { legacy: true });
const legacy = legacyDirOf(root);
const target = contextDirOf(root);
const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};

// --- the files to move ---------------------------------------------------------------------------
const entries = existsSync(legacy) ? readdirSync(legacy).filter((e) => e !== '.DS_Store').sort() : [];
const moves = entries.map((from) => ({ from: `${LEGACY_DIR}/${from}`, to: `${CONTEXT_DIR}/${newFileName(from)}`, renamed: newFileName(from) !== from }));
const conflicts = moves.filter((m) => existsSync(join(root, m.to))).map((m) => m.to);

// --- .git/info/exclude (a worktree keeps it in the main repository's git dir) --------------------
function excludeFile() {
  const dotGit = join(root, '.git');
  if (!existsSync(dotGit)) return null;
  if (statSync(dotGit).isDirectory()) return join(dotGit, 'info', 'exclude');
  const gitdir = gitdirOf(read(dotGit) ?? '');
  if (!gitdir) return null;
  const dir = isAbsolute(gitdir) ? gitdir : resolve(root, gitdir);
  const common = read(join(dir, 'commondir'))?.trim();
  return join(common ? resolve(dir, common) : dir, 'info', 'exclude');
}
const exclude = excludeFile();
const excludeText = exclude ? read(exclude) : null;
const excludeFix = excludeText == null ? null : dropLegacyExclude(excludeText);

// --- references in the project's docs and Claude settings ----------------------------------------
const SKIP = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', CONTEXT_DIR, LEGACY_DIR]);
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|json|ya?ml|txt)$/.test(e)) out.push(p);
  }
  return out;
};
const candidates = [
  ...readdirSync(root).filter((e) => /\.md$/i.test(e) && statSync(join(root, e)).isFile()).map((e) => join(root, e)),
  ...['.claude', 'docs', '.github'].flatMap((d) => walk(join(root, d))),
];
const refs = candidates
  .map((p) => {
    const text = read(p) ?? '';
    const { text: next, changes } = rewriteRefs(text);
    return { file: relPath(root, p), path: p, next, changes, changed: next !== text };
  })
  .filter((r) => r.changed);

const plan = {
  root,
  legacyFolder: existsSync(legacy) ? LEGACY_DIR : null,
  folderExists: existsSync(target),
  moves,
  conflicts,
  gitExclude: exclude ? { file: relPath(root, exclude), linesToRemove: excludeFix?.removed ?? 0 } : null,
  refs: refs.map(({ file, changes }) => ({ file, changes })),
};

if (!plan.legacyFolder && !refs.length) {
  console.log(JSON.stringify({ status: 'nothing-to-migrate', ...plan }, null, 2));
  process.exit(0);
}
if (conflicts.length) {
  console.log(JSON.stringify({ status: 'conflict', ...plan }, null, 2));
  process.exit(3);
}
if (!apply) {
  console.log(JSON.stringify({ status: 'plan', ...plan }, null, 2));
  process.exit(0);
}

// --- apply -----------------------------------------------------------------------------------------
const done = [];
if (plan.legacyFolder) {
  ensureContextDir(root);
  for (const m of moves) {
    renameSync(join(root, m.from), join(root, m.to));
    done.push(`moved ${m.from} → ${m.to}`);
  }
  if (!readdirSync(legacy).filter((e) => e !== '.DS_Store').length) {
    rmSync(join(legacy, '.DS_Store'), { force: true }); // macOS Finder metadata, not a plugin file
    rmdirSync(legacy);
    done.push(`removed the empty ${LEGACY_DIR}/`);
  }
  done.push(`${CONTEXT_DIR}/.gitignore in place (github.json and *.prev.md stay out of git)`);
}
if (excludeFix?.removed) {
  writeFileSync(exclude, excludeFix.text);
  done.push(`removed ${excludeFix.removed} line(s) for ${LEGACY_DIR}/ from ${relPath(root, exclude)}: git now sees ${CONTEXT_DIR}/`);
}
if (refsToo)
  for (const r of refs) {
    writeFileSync(r.path, r.next);
    done.push(`rewrote ${r.changes.reduce((n, c) => n + c.times, 0)} reference(s) in ${r.file}`);
  }

console.log(JSON.stringify({ status: 'migrated', done, refsLeft: refsToo ? [] : plan.refs }, null, 2));
process.exit(0);
