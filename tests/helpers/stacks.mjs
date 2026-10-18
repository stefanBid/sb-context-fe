// Throwaway projects of each stack the detectors know, for the profile tests.

import { readFileSync } from 'node:fs';
import { makeProject, withExampleStyle, EXAMPLE_VUE } from './fixture.mjs';

/** A Nuxt 4 app with Tailwind 4, i18n, color-mode and fonts. */
export const nuxtApp = (extra = {}) =>
  makeProject({
    'package.json': { name: 'shop', devDependencies: { nuxt: '^4.1.0', tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0', 'vue-tsc': '^2.0.0', vitest: '^3.0.0' } },
    'nuxt.config.ts': "export default defineNuxtConfig({ modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts'], css: ['~/assets/css/main.css'] })\n",
    'app/app.vue': '<template><NuxtPage /></template>\n',
    'app/pages/index.vue': '<template><h1>Home</h1></template>\n',
    'pnpm-lock.yaml': '',
    ...extra,
  });

/** A Vue 3 + Vite app (index.html, src/main.ts, vue-router, vue-i18n). */
export const vueApp = (extra = {}) =>
  makeProject(
    {
      'package.json': { name: 'dash', dependencies: { vue: '^3.5.0', 'vue-router': '^4.4.0', 'vue-i18n': '^10.0.0', '@vueuse/core': '^13.0.0' }, devDependencies: { vite: '^7.0.0', '@vitejs/plugin-vue': '^6.0.0', tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0' } },
      'vite.config.ts': "import vue from '@vitejs/plugin-vue'\nexport default { plugins: [vue()] }\n",
      'index.html': '<div id="app"></div>\n',
      'src/main.ts': "import './assets/css/main.css'\n",
      'src/views/Home.vue': '<template><h1>Home</h1></template>\n',
      'package-lock.json': '{}',
      ...extra,
    },
    { nuxtConfig: false },
  );

/** The dependencies of a Vue + Vite app aligned by sb-design (color mode and fonts included). */
export const VUE_STYLED_DEPS = {
  dependencies: { vue: '^3.5.0', '@vueuse/core': '^15.0.0', '@fontsource/inter': '^5.2.0', '@fontsource/poppins': '^5.2.0' },
  devDependencies: { vite: '^7.0.0', '@vitejs/plugin-vue': '^6.0.0', tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0' },
};

/** A Vue 3 + Vite app with the reference style aligned the vue-vite way (src/assets/css, main.ts, index.html, useTheme). */
export const vueAppStyled = (extra = {}) =>
  withExampleStyle(
    makeProject(
      {
        'package.json': { name: 'dash', ...VUE_STYLED_DEPS },
        ...Object.fromEntries(Object.entries(EXAMPLE_VUE).map(([to, from]) => [to, readFileSync(from, 'utf8')])),
        'src/App.vue': "<script setup lang=\"ts\">\nimport { useTheme } from '@/composables/useTheme'\nuseTheme()\n</script>\n<template><RouterView /></template>\n",
        'src/views/HomeView.vue': '<template><h1 class="sb-h1">Home</h1></template>\n',
        'package-lock.json': '{}',
        ...extra,
      },
      { nuxtConfig: false },
    ),
    'src/assets/css',
  );

/** A Vue 3 library built with Vite's lib mode, wrapping Floating UI. */
export const vueLibrary = (extra = {}, opts = {}) =>
  makeProject(
    {
      'package.json': { name: '@sb/vue-floating', type: 'module', exports: { '.': './dist/index.js' }, types: 'dist/index.d.ts', peerDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0' }, devDependencies: { vite: '^7.0.0', 'vue-tsc': '^2.0.0' } },
      'vite.config.ts': "import { resolve } from 'node:path'\nexport default { build: { lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es', 'cjs'] } } }\n",
      'src/index.ts': "export * from './components'\n",
      'src/components/Tooltip.vue': '<template><div /></template>\n',
      'pnpm-lock.yaml': '',
      ...extra,
    },
    { nuxtConfig: false, ...opts },
  );

/** The files of a clean build of vueLibrary: ES and CJS output that import their peers, declarations next to them. */
export const LIBRARY_BUILD = {
  'dist/index.js': "import { defineComponent } from 'vue'\nimport { useFloating } from '@floating-ui/vue'\nexport const Tooltip = defineComponent({ setup: () => useFloating })\n",
  'dist/index.cjs': "const vue = require('vue')\nconst f = require('@floating-ui/vue')\nexports.Tooltip = vue.defineComponent({ setup: () => f.useFloating })\n",
  'dist/index.d.ts': 'export declare const Tooltip: unknown\n',
};

/** vueLibrary after a clean build: exports with types first, peers also in devDependencies, files: ["dist"]. */
export const vueLibraryBuilt = (extra = {}, opts = {}) =>
  vueLibrary(
    {
      'package.json': {
        name: '@sb/vue-floating',
        version: '0.1.0',
        type: 'module',
        files: ['dist'],
        exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js', require: './dist/index.cjs' } },
        main: './dist/index.cjs',
        module: './dist/index.js',
        types: './dist/index.d.ts',
        peerDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0' },
        devDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0', vite: '^7.0.0', 'vue-tsc': '^2.0.0' },
      },
      'src/components/Tooltip.vue': "<script setup lang=\"ts\">\nimport { useFloating } from '@floating-ui/vue'\n</script>\n<template><div /></template>\n",
      ...LIBRARY_BUILD,
      ...extra,
    },
    opts,
  );
