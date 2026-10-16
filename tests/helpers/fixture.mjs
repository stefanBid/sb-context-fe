// Test helpers: throwaway Nuxt projects and a runner for the plugin's CLI scripts.
//
// A fixture is a real folder in the OS temp dir with a nuxt.config.ts (so the scripts find
// the project root), the files the test asks for, an empty .git/ (so .git/info/exclude can be
// written) and a symlink to this repo's node_modules (so postcss, tailwindcss and
// vue/compiler-sfc resolve from the project root, as they would in a real Nuxt project).

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, realpathSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EXAMPLE_CSS = join(REPO, 'plugins/sb-design/skills/align/references/example');

export const SCRIPTS = {
  dependencyNotes: join(REPO, 'plugins/sb-health/scripts/dependency-notes.mjs'),
  projectSettings: join(REPO, 'core/scripts/project-settings.mjs'),
  githubSettings: join(REPO, 'plugins/sb-github/scripts/github-settings.mjs'),
  setupState: join(REPO, 'plugins/sb-core/scripts/setup-state.mjs'),
  migrate: join(REPO, 'plugins/sb-core/scripts/migrate-v1.mjs'),
  checkI18n: join(REPO, 'core/scripts/check-i18n.mjs'),
  tokensToSource: join(REPO, 'plugins/sb-design/skills/extract-style/scripts/tokens-to-source.mjs'),
  contrast: join(REPO, 'plugins/sb-design/skills/align/scripts/contrast.mjs'),
  inventory: join(REPO, 'plugins/sb-design/skills/align/scripts/inventory.mjs'),
  renamePrefix: join(REPO, 'plugins/sb-design/skills/align/scripts/rename-prefix.mjs'),
  syncValues: join(REPO, 'plugins/sb-design/skills/align/scripts/sync-values.mjs'),
  template: join(REPO, 'plugins/sb-design/skills/migrate/scripts/template.mjs'),
};

// Windows: scripts print paths with backslashes and git checks files out with CRLF. Both are legit
// there, so tests compare POSIX paths and LF text. Bugs that only show on Windows are todo via onWindows().
const WIN = process.platform === 'win32';
export const onWindows = (reason) => WIN && reason;
const deepPosix = (v) => (typeof v === 'string' ? v.replaceAll('\\', '/') : Array.isArray(v) ? v.map(deepPosix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepPosix(x)])) : v);
/** stdout with POSIX paths on Windows (JSON is parsed and re-printed, plain text has its backslashes turned into slashes). */
export function posixOutput(text) {
  if (!WIN) return text;
  try {
    return JSON.stringify(deepPosix(JSON.parse(text)), null, 2);
  } catch {
    return text.replaceAll('\\', '/');
  }
}
/** Text as committed: LF line endings. */
export const lf = (text) => text.replaceAll('\r\n', '\n');

const DEFAULT_CONFIG = "export default defineNuxtConfig({\n  css: ['~/assets/css/main.css'],\n})\n";

/**
 * Creates a Nuxt project in a temp folder.
 * files: { 'app/pages/index.vue': '...' }  (a nuxt.config.ts is added unless given, or unless nuxtConfig is false)
 */
export function makeProject(files = {}, { git = true, modules = true, nuxtConfig = true } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sbcn-')));
  if (nuxtConfig && !('nuxt.config.ts' in files)) files = { 'nuxt.config.ts': DEFAULT_CONFIG, ...files };
  for (const [p, content] of Object.entries(files)) write(root, p, content);
  if (git) mkdirSync(join(root, '.git', 'info'), { recursive: true });
  if (modules) symlinkSync(join(REPO, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  return {
    root,
    path: (p) => join(root, p),
    read: (p) => readFileSync(join(root, p), 'utf8'),
    json: (p) => (WIN ? deepPosix : (x) => x)(JSON.parse(readFileSync(join(root, p), 'utf8'))),
    exists: (p) => existsSync(join(root, p)),
    write: (p, content) => write(root, p, content),
    run: (script, args = [], opts = {}) => run(script, args, { cwd: root, ...opts }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** The reference aligned style (prefix "sb") copied into <root>/app/assets/css. */
export function withExampleStyle(project) {
  cpSync(EXAMPLE_CSS, project.path('app/assets/css'), { recursive: true, filter: (src) => !src.endsWith('nuxt.config.ts') });
  return project;
}

function write(root, p, content) {
  const full = join(root, p);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

/** Runs a script with node. Returns { code, stdout, stderr, json() }. */
export function run(script, args = [], { cwd = REPO, env = {} } = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', ...env } });
  const stdout = posixOutput(r.stdout);
  return {
    code: r.status,
    stdout,
    stderr: r.stderr,
    json() {
      try {
        return JSON.parse(stdout);
      } catch (e) {
        throw new Error(`stdout is not JSON (exit ${r.status}):\n${r.stdout}\n--- stderr ---\n${r.stderr}`, { cause: e });
      }
    },
  };
}
