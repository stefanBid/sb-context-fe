// Throwaway projects of each stack the detectors know, for the profile tests.

import { makeProject } from './fixture.mjs';

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

/** A Vue 3 library built with Vite's lib mode, wrapping Floating UI. */
export const vueLibrary = (extra = {}) =>
  makeProject(
    {
      'package.json': { name: '@sb/vue-floating', type: 'module', exports: { '.': './dist/index.js' }, types: 'dist/index.d.ts', peerDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0' }, devDependencies: { vite: '^7.0.0', 'vue-tsc': '^2.0.0' } },
      'vite.config.ts': "import { resolve } from 'node:path'\nexport default { build: { lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es', 'cjs'] } } }\n",
      'src/index.ts': "export * from './components'\n",
      'src/components/Tooltip.vue': '<template><div /></template>\n',
      'pnpm-lock.yaml': '',
      ...extra,
    },
    { nuxtConfig: false },
  );
