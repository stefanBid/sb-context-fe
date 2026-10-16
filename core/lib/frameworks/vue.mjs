// Vue (without Nuxt): how a Vue project is recognized and what its structure is, for profile.mjs.
// An app has an index.html; a library builds with Vite's lib mode or publishes an entry point.
// Facts only, read from the files: nothing here asks or decides.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const name = 'vue';
export const CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts', 'vite.config.cjs'];

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const first = (root, list) => list.find((p) => existsSync(join(root, p))) ?? null;

/** A package.json that depends on vue (dependencies, devDependencies or peerDependencies). */
export function isRoot(dir, pkg) {
  return Boolean(pkg && { ...pkg.peerDependencies, ...pkg.dependencies, ...pkg.devDependencies }.vue);
}

export const configOf = (root) => first(root, CONFIGS);

/** The source folder: src/ when present, else the root. Absolute. */
export const srcDirOf = (root) => (isDir(join(root, 'src')) ? join(root, 'src') : root);

/** The Vue part of the profile. ctx: { root, pkg, has(name), major(name) }. */
export function detect({ root, pkg, has, major }) {
  const cfgName = configOf(root);
  const cfg = cfgName ? readFileSync(join(root, cfgName), 'utf8') : '';
  const src = existsSync(join(root, 'src')) ? 'src' : '.';
  const at = (...ps) => ps.find((p) => isDir(join(root, p))) ?? null;
  const under = (p) => (src === '.' ? p : `${src}/${p}`);

  const libMode = /\blib\s*:\s*\{/.test(cfg);
  const publishes = Boolean(pkg.exports || pkg.main || pkg.module);
  const hasHtml = existsSync(join(root, 'index.html'));
  const kind = libMode || (publishes && !hasHtml) ? 'library' : hasHtml ? 'app' : null;

  const appEntry = first(root, [under('main.ts'), under('main.js')]);
  const libEntry = cfg.match(/\bentry\s*:\s*(?:resolve\([^)]*?['"]([^'"]+)['"]\s*\)|['"]([^'"]+)['"])/)?.slice(1).find(Boolean)?.replace(/^\.\//, '') ?? (kind === 'library' ? first(root, [under('index.ts'), under('index.js')]) : null);
  const formats = cfg.match(/\bformats\s*:\s*\[([^\]]*)\]/)?.[1].match(/['"]([a-z]+)['"]/g)?.map((f) => f.slice(1, -1)) ?? null;

  const tailwind = major('tailwindcss');
  const engine =
    tailwind >= 4 ? { name: 'tailwind4', via: has('@tailwindcss/vite') ? '@tailwindcss/vite' : has('@tailwindcss/postcss') ? '@tailwindcss/postcss' : null }
    : tailwind ? { name: 'tailwind3', via: null }
    : has('sass') || has('sass-embedded') ? { name: 'scss', via: null }
    : null;
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

  return {
    framework: { name, major: major('vue') },
    bundler: has('vite') || cfgName ? { name: 'vite', major: major('vite') } : null,
    kind,
    rendering: kind === 'app' ? (has('vite-ssg') ? 'ssg' : 'csr') : null,
    language: existsSync(join(root, 'tsconfig.json')) || cfgName?.endsWith('ts') ? 'ts' : 'js',
    templates: 'vue-sfc',
    paths: {
      src,
      styles: at(under('assets/css'), under('styles')) ?? under('assets/css'),
      components: under('components'),
      composables: under('composables'),
      pages: kind === 'app' ? at(under('pages'), under('views')) : null,
      layouts: kind === 'app' ? at(under('layouts')) : null,
      public: 'public',
    },
    entries: { config: cfgName, app: kind === 'library' ? null : appEntry, lib: kind === 'library' ? libEntry : null, css: kind === 'library' ? null : appEntry },
    styling: { engine, colorMode: has('@vueuse/core') ? '@vueuse/core' : null, fonts: deps.some((d) => d.startsWith('@fontsource')) ? '@fontsource' : null },
    features: {
      router: has('unplugin-vue-router') ? 'unplugin-vue-router' : has('vue-router') ? 'vue-router' : null,
      autoImport: has('unplugin-vue-components') || has('unplugin-auto-import'),
      i18n: has('vue-i18n') ? 'vue-i18n' : null,
      icons: has('unplugin-icons') ? 'unplugin-icons' : has('@iconify/vue') ? '@iconify/vue' : null,
      images: null,
      state: has('pinia') ? 'pinia' : null,
      test: has('vitest') ? 'vitest' : null,
      lint: has('eslint') ? 'eslint' : null,
      typecheck: has('vue-tsc') ? 'vue-tsc' : null,
    },
    library: kind === 'library' ? { name: pkg.name ?? null, formats, types: Boolean(pkg.types || pkg.typings || has('vite-plugin-dts')), peers: Object.keys(pkg.peerDependencies ?? {}) } : null,
  };
}
