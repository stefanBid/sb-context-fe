// Shared by the plugins' scripts: where the Nuxt project is and where things go.
// Source of truth: core/lib/ of the sb-context-fe repo, copied into every plugin by scripts/sync-core.mjs.
//
// The plugin works only on Nuxt projects, so the project root is found, not guessed:
// from the current folder (or --root) upward to the first folder with a nuxt.config.*
// (or a package.json that depends on `nuxt`). Everything the scripts read or write is
// relative to that root, wherever in the project they were started from.
//
//   <root>/.sb-context/             the plugins' folder in the project (settings, design snapshot…): it can be
//                                   committed; only the personal or throwaway files are listed in its own .gitignore
//   <srcDir>/assets/css/            the global style (srcDir is app/ in Nuxt 4, or the root / config srcDir)

import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import './cli.mjs'; // blocking stdout: large outputs reach the pipe whole (see cli.mjs)

const CONFIGS = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs', 'nuxt.config.cjs'];

export function isNuxtRoot(dir) {
  if (CONFIGS.some((c) => existsSync(join(dir, c)))) return true;
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    return Boolean({ ...pkg.dependencies, ...pkg.devDependencies }.nuxt);
  } catch {
    return false;
  }
}

export function findProjectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (isNuxtRoot(dir)) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

// explicit: the --root argument, if any. required=false lets a script run outside a project (e.g. on loose files).
// A project still set up by sb-context-nuxt 0.x (.sb-context-nuxt/) is refused until it is migrated, so no script
// reads or writes half of the state in the old folder and half in the new one: legacy=true lets the migration through.
export function projectRoot(explicit = null, { required = true, legacy = false } = {}) {
  const found = explicit ? (isNuxtRoot(resolve(explicit)) ? resolve(explicit) : null) : findProjectRoot();
  if (found && !legacy && existsSync(legacyDirOf(found))) {
    console.error(`This project was set up with sb-context-nuxt 0.x (${LEGACY_DIR}/ found in ${found}). Run /sb-core:migration first: it moves the plugin's files to ${CONTEXT_DIR}/.`);
    process.exit(2);
  }
  if (found) return found;
  if (!required) return resolve(explicit || process.cwd());
  console.error(
    explicit
      ? `${resolve(explicit)} is not a Nuxt project (no nuxt.config.* and no "nuxt" dependency).`
      : `Not inside a Nuxt project: no nuxt.config.* found from ${process.cwd()} upward. Run the script from the project.`,
  );
  process.exit(2);
}

export function srcDirOf(root) {
  const cfg = CONFIGS.map((c) => join(root, c)).find(existsSync);
  const sd = cfg ? readFileSync(cfg, 'utf8').match(/srcDir\s*:\s*['"`]([^'"`]+)['"`]/) : null;
  if (sd) return resolve(root, sd[1]);
  return existsSync(join(root, 'app')) && statSync(join(root, 'app')).isDirectory() ? join(root, 'app') : root;
}

export const cssDirOf = (root) => join(srcDirOf(root), 'assets', 'css');

/** A path relative to the root, with / separators on every OS (for messages and recorded paths). */
export const relPath = (root, p) => relative(root, p).split(sep).join('/') || '.';

/** Whether p is inside dir (not dir itself), on every OS. */
export function isInside(dir, p) {
  const r = relative(dir, p);
  return Boolean(r) && !r.startsWith('..') && !isAbsolute(r);
}
/** The plugins' folder in the project, and the folder of sb-context-nuxt 0.x it replaces. */
export const CONTEXT_DIR = '.sb-context';
export const LEGACY_DIR = '.sb-context-nuxt';
export const contextDirOf = (root) => join(root, CONTEXT_DIR);
export const legacyDirOf = (root) => join(root, LEGACY_DIR);

/** Files of .sb-context/ that stay out of git even when the folder is committed: personal choices and throwaway copies. */
export const LOCAL_ONLY = ['github.json', '*.prev.md'];
export const GITIGNORE = `# Written by sb-context-fe. The folder can be committed; these files are personal or throwaway.\n${LOCAL_ONLY.join('\n')}\n`;

/**
 * Creates .sb-context/ and its .gitignore (only if missing: an edited one is never overwritten).
 * Whether the whole folder goes into git is the user's choice, made in the project's own .gitignore.
 */
export function ensureContextDir(root) {
  const dir = contextDirOf(root);
  const existed = existsSync(dir);
  mkdirSync(dir, { recursive: true });
  const gi = join(dir, '.gitignore');
  if (!existsSync(gi)) writeFileSync(gi, GITIGNORE);
  return existed ? 'exists' : 'created';
}
