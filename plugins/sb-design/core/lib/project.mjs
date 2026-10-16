// Shared by the plugins' scripts: where the project is and where things go.
// Source of truth: core/lib/ of the sb-context-fe repo, copied into every plugin by scripts/sync-core.mjs.
//
// The project root is found, not guessed: from the current folder (or --root) upward to the first folder
// a framework detector recognizes (./frameworks/: a nuxt.config.* or a package.json that depends on nuxt;
// a package.json that depends on vue). Everything the scripts read or write is relative to that root,
// wherever in the project they were started from; where things are inside it comes from the profile.
//
//   <root>/.sb-context/             the plugins' folder in the project (profile, settings, design snapshot…): it can be
//                                   committed; only the personal or throwaway files are listed in its own .gitignore
//   paths.styles of the profile     the global style (app/assets/css in Nuxt 4)

import { existsSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import './cli.mjs'; // blocking stdout: large outputs reach the pipe whole (see cli.mjs)
import { CONTEXT_DIR, LEGACY_DIR, legacyDirOf } from './folder.mjs';
import { frameworkOf, loadProfile, readPackage } from './profile.mjs';
import * as nuxt from './frameworks/nuxt.mjs';

export { CONTEXT_DIR, LEGACY_DIR, contextDirOf, legacyDirOf, LOCAL_ONLY, GITIGNORE, ensureContextDir } from './folder.mjs';
export { srcDirOf, cssDirOf } from './profile.mjs';

export const isNuxtRoot = (dir) => nuxt.isRoot(dir, readPackage(dir));
/** Whether a framework detector recognizes the folder as a project root. */
export const isProjectRoot = (dir) => Boolean(frameworkOf(dir));

export function findProjectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (isProjectRoot(dir)) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

// explicit: the --root argument, if any. required=false lets a script run outside a project (e.g. on loose files).
// A project still set up by sb-context-nuxt 0.x (.sb-context-nuxt/) is refused until it is migrated, so no script
// reads or writes half of the state in the old folder and half in the new one: legacy=true lets the migration through.
export function projectRoot(explicit = null, { required = true, legacy = false } = {}) {
  const found = explicit ? (isProjectRoot(resolve(explicit)) ? resolve(explicit) : null) : findProjectRoot();
  if (found && !legacy && existsSync(legacyDirOf(found))) {
    console.error(`This project was set up with sb-context-nuxt 0.x (${LEGACY_DIR}/ found in ${found}). Run /sb-core:migration first: it moves the plugin's files to ${CONTEXT_DIR}/.`);
    process.exit(2);
  }
  if (found) return found;
  if (!required) return resolve(explicit || process.cwd());
  console.error(
    explicit
      ? `${resolve(explicit)} is not a Nuxt or Vue project (no nuxt.config.*, and no "nuxt" or "vue" dependency in package.json).`
      : `Not inside a Nuxt or Vue project: no nuxt.config.* and no package.json depending on nuxt or vue from ${process.cwd()} upward. Run the script from the project.`,
  );
  process.exit(2);
}

/**
 * Stops a script that only knows some stacks: exit 2 with a message saying why, when the project's adapter is not
 * in `adapters` or its kind is not in `kinds`. what: the plugin or skill, for the message.
 */
export function requireStack(root, { adapters, kinds = null, what }) {
  const p = loadProfile(root).profile;
  if (!p || !adapters.includes(p.adapter)) {
    const stack = p ? `${p.framework.name}${p.bundler ? ` + ${p.bundler.name}` : ''}` : 'an unknown stack';
    console.error(`${what} supports ${adapters.join(', ')} projects for now; this project is ${stack}. Nothing was read or written.`);
    process.exit(2);
  }
  if (kinds && !kinds.includes(p.kind)) {
    console.error(`${what} is for ${kinds.join(' or ')} projects; this project is a ${p.kind ?? 'project of unknown kind'} (profile "kind"). Nothing was read or written.`);
    process.exit(2);
  }
  return p;
}

/** A path relative to the root, with / separators on every OS (for messages and recorded paths). */
export const relPath = (root, p) => relative(root, p).split(sep).join('/') || '.';

/** Whether p is inside dir (not dir itself), on every OS. */
export function isInside(dir, p) {
  const r = relative(dir, p);
  return Boolean(r) && !r.startsWith('..') && !isAbsolute(r);
}
