// Nuxt: how a Nuxt project is recognized and what its structure is, for profile.mjs.
// Facts only, read from the files: nothing here asks or decides.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';

export const name = 'nuxt';
export const CONFIGS = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs', 'nuxt.config.cjs'];

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const rel = (root, p) => relative(root, p).split(sep).join('/') || '.';

/** A nuxt.config.*, or a package.json that depends on nuxt. */
export function isRoot(dir, pkg) {
  if (CONFIGS.some((c) => existsSync(join(dir, c)))) return true;
  return Boolean(pkg && { ...pkg.dependencies, ...pkg.devDependencies }.nuxt);
}

export const configOf = (root) => CONFIGS.find((c) => existsSync(join(root, c))) ?? null;

/** srcDir from the config, else app/ when present (Nuxt 4), else the root. Absolute. */
export function srcDirOf(root) {
  const cfg = configOf(root);
  const sd = cfg ? readFileSync(join(root, cfg), 'utf8').match(/srcDir\s*:\s*['"`]([^'"`]+)['"`]/) : null;
  if (sd) return resolve(root, sd[1]);
  return isDir(join(root, 'app')) ? join(root, 'app') : root;
}

/**
 * The Nuxt part of the profile. ctx: { root, pkg, has(name), major(name), scripts }.
 * Every value is a fact of the project or null (unknown); the user confirms what matters.
 */
export function detect({ root, pkg, has, major, scripts }) {
  const cfgName = configOf(root);
  const cfg = cfgName ? readFileSync(join(root, cfgName), 'utf8') : '';
  const inConfig = (m) => cfg.includes(`'${m}'`) || cfg.includes(`"${m}"`);
  const mod = (m) => has(m) || inConfig(m);
  const src = srcDirOf(root);
  const at = (p) => (isDir(join(src, p)) ? rel(root, join(src, p)) : null);

  const tailwind = major('tailwindcss');
  const engine =
    tailwind >= 4 ? { name: 'tailwind4', via: has('@tailwindcss/vite') ? '@tailwindcss/vite' : has('@tailwindcss/postcss') ? '@tailwindcss/postcss' : null }
    : tailwind || mod('@nuxtjs/tailwindcss') ? { name: 'tailwind3', via: mod('@nuxtjs/tailwindcss') ? '@nuxtjs/tailwindcss' : null }
    : has('sass') || has('sass-embedded') ? { name: 'scss', via: null }
    : null;

  const generate = /\bnuxi?\s+generate\b|\bnuxt\s+generate\b/.test(Object.values(scripts).join('\n'));
  const rendering = /\bssr\s*:\s*false\b/.test(cfg) ? 'csr' : generate ? 'ssg' : 'ssr';

  return {
    framework: { name, major: major('nuxt') },
    bundler: { name: /builder\s*:\s*['"]webpack['"]/.test(cfg) ? 'webpack' : 'vite', major: major('vite') },
    kind: has('@nuxt/module-builder') ? 'library' : 'app',
    rendering,
    language: cfgName?.endsWith('.ts') || existsSync(join(root, 'tsconfig.json')) ? 'ts' : 'js',
    templates: 'vue-sfc',
    paths: {
      src: rel(root, src),
      styles: rel(root, join(src, 'assets', 'css')),
      components: rel(root, join(src, 'components')),
      composables: rel(root, join(src, 'composables')),
      pages: at('pages'),
      layouts: at('layouts'),
      public: 'public',
    },
    entries: { config: cfgName, app: existsSync(join(src, 'app.vue')) ? rel(root, join(src, 'app.vue')) : null, lib: null, css: cfgName },
    styling: { engine, colorMode: mod('@nuxtjs/color-mode') ? '@nuxtjs/color-mode' : null, fonts: mod('@nuxt/fonts') ? '@nuxt/fonts' : null },
    features: {
      router: 'nuxt',
      autoImport: true,
      i18n: mod('@nuxtjs/i18n') ? '@nuxtjs/i18n' : null,
      icons: mod('@nuxt/icon') ? '@nuxt/icon' : null,
      images: mod('@nuxt/image') ? '@nuxt/image' : null,
      state: has('@pinia/nuxt') || has('pinia') ? 'pinia' : null,
      test: has('vitest') ? 'vitest' : null,
      lint: mod('@nuxt/eslint') ? '@nuxt/eslint' : has('eslint') ? 'eslint' : null,
      typecheck: has('vue-tsc') ? 'nuxi typecheck' : null,
    },
    library: has('@nuxt/module-builder') ? { name: pkg.name ?? null, formats: null, types: true, peers: Object.keys(pkg.peerDependencies ?? {}) } : null,
  };
}
