// The plugins' folder in the project (.sb-context/), and the folder of sb-context-nuxt 0.x it replaced.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
