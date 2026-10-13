// Shared by the plugin's scripts: where the Nuxt project is and where things go.
//
// The plugin works only on Nuxt projects, so the project root is found, not guessed:
// from the current folder (or --root) upward to the first folder with a nuxt.config.*
// (or a package.json that depends on `nuxt`). Everything the scripts read or write is
// relative to that root, wherever in the project they were started from.
//
//   <root>/.sb-context-nuxt/        the plugin's local folder (settings, design snapshot…), never committed
//   <srcDir>/assets/css/            the global style (srcDir is app/ in Nuxt 4, or the root / config srcDir)

import { existsSync, readFileSync, statSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

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
export function projectRoot(explicit = null, { required = true } = {}) {
  const found = explicit ? (isNuxtRoot(resolve(explicit)) ? resolve(explicit) : null) : findProjectRoot();
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
export const pluginDirOf = (root) => join(root, '.sb-context-nuxt');

// keeps .sb-context-nuxt/ out of git without touching tracked files
export function excludePluginDir(root) {
  const gitDir = join(root, '.git');
  if (!existsSync(gitDir) || !statSync(gitDir).isDirectory()) return 'not a git repo';
  const ex = join(gitDir, 'info', 'exclude');
  mkdirSync(dirname(ex), { recursive: true });
  const cur = existsSync(ex) ? readFileSync(ex, 'utf8') : '';
  if (!/^\.sb-context-nuxt\/?$/m.test(cur)) appendFileSync(ex, `${cur && !cur.endsWith('\n') ? '\n' : ''}.sb-context-nuxt/\n`);
  return 'added to .git/info/exclude';
}
