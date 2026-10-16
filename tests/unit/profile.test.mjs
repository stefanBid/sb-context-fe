import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { detectProfile, mergeProfile, driftOf, confirmKey, leaves, isConfirmed, adapterOf, majorOf, frameworkOf } from '../../core/lib/profile.mjs';
import { makeProject } from '../helpers/fixture.mjs';
import { nuxtApp, vueApp, vueLibrary } from '../helpers/stacks.mjs';

const today = '2026-10-17';

describe('lib/profile.mjs: detection', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('a Nuxt 4 app', () => {
    p = nuxtApp();
    const d = detectProfile(p.root, { today });
    assert.equal(d.schema, 1);
    assert.equal(d.detectedAt, today);
    assert.deepEqual(d.confirmed, []);
    assert.equal(d.adapter, 'nuxt');
    assert.deepEqual(d.framework, { name: 'nuxt', major: 4 });
    assert.equal(d.kind, 'app');
    assert.equal(d.rendering, 'ssr');
    assert.equal(d.language, 'ts');
    assert.equal(d.packageManager, 'pnpm');
    assert.equal(d.templates, 'vue-sfc');
    assert.deepEqual(d.paths, { src: 'app', styles: 'app/assets/css', components: 'app/components', composables: 'app/composables', pages: 'app/pages', layouts: null, public: 'public' });
    assert.deepEqual(d.entries, { config: 'nuxt.config.ts', app: 'app/app.vue', lib: null, css: 'nuxt.config.ts' });
    assert.deepEqual(d.styling, { engine: { name: 'tailwind4', via: '@tailwindcss/vite' }, colorMode: '@nuxtjs/color-mode', fonts: '@nuxt/fonts' });
    assert.equal(d.features.i18n, '@nuxtjs/i18n');
    assert.equal(d.features.typecheck, 'nuxi typecheck');
    assert.equal(d.library, null);
  });

  test('Nuxt: ssr false is csr, generate is ssg, srcDir moves every path, a module is a library', () => {
    p = nuxtApp({ 'nuxt.config.ts': "export default defineNuxtConfig({ ssr: false })\n" });
    assert.equal(detectProfile(p.root).rendering, 'csr');
    p.write('nuxt.config.ts', "export default defineNuxtConfig({ srcDir: 'src/' })\n");
    p.write('package.json', { scripts: { build: 'nuxi generate' }, devDependencies: { nuxt: '^4.0.0' } });
    const d = detectProfile(p.root);
    assert.equal(d.rendering, 'ssg');
    assert.equal(d.paths.src, 'src');
    assert.equal(d.paths.styles, 'src/assets/css');
    p.write('package.json', { name: 'nuxt-thing', devDependencies: { nuxt: '^4.0.0', '@nuxt/module-builder': '^1.0.0' } });
    assert.equal(detectProfile(p.root).kind, 'library');
  });

  test('a Vue + Vite app', () => {
    p = vueApp();
    const d = detectProfile(p.root, { today });
    assert.equal(d.adapter, 'vue-vite');
    assert.deepEqual(d.framework, { name: 'vue', major: 3 });
    assert.deepEqual(d.bundler, { name: 'vite', major: 7 });
    assert.equal(d.kind, 'app');
    assert.equal(d.rendering, 'csr');
    assert.equal(d.packageManager, 'npm');
    assert.equal(d.paths.src, 'src');
    assert.equal(d.paths.pages, 'src/views');
    assert.deepEqual(d.entries, { config: 'vite.config.ts', app: 'src/main.ts', lib: null, css: 'src/main.ts' });
    assert.deepEqual(d.styling, { engine: { name: 'tailwind4', via: '@tailwindcss/vite' }, colorMode: '@vueuse/core', fonts: null });
    assert.equal(d.features.router, 'vue-router');
    assert.equal(d.features.autoImport, false);
    assert.equal(d.features.i18n, 'vue-i18n');
  });

  test('a Vue library (lib mode, peers, types)', () => {
    p = vueLibrary();
    const d = detectProfile(p.root);
    assert.equal(d.adapter, 'vue-vite');
    assert.equal(d.kind, 'library');
    assert.equal(d.rendering, null);
    assert.deepEqual(d.entries, { config: 'vite.config.ts', app: null, lib: 'src/index.ts', css: null });
    assert.equal(d.paths.pages, null);
    assert.equal(d.styling.engine, null);
    assert.deepEqual(d.library, { name: '@sb/vue-floating', formats: ['es', 'cjs'], types: true, peers: ['vue', '@floating-ui/vue'] });
    assert.equal(d.features.typecheck, 'vue-tsc');
  });

  test('Vue without vite has no adapter; a folder with neither is not a project', () => {
    p = makeProject({ 'package.json': { dependencies: { vue: '^3.5.0' } } }, { nuxtConfig: false });
    const d = detectProfile(p.root);
    assert.equal(d.bundler, null);
    assert.equal(d.adapter, null);
    assert.equal(d.kind, null, 'no index.html and nothing published: unknown, to be asked');
    p.write('package.json', { dependencies: { react: '^19.0.0' } });
    assert.equal(detectProfile(p.root), null);
    assert.equal(frameworkOf(p.root), null);
  });

  test('majorOf prefers the installed version, then the range', () => {
    p = makeProject({ 'package.json': { devDependencies: { nuxt: '~3.9.0' } }, 'node_modules_fake/x': '' }, { modules: false });
    assert.equal(majorOf(p.root, { devDependencies: { nuxt: '~3.9.0' } }, 'nuxt'), 3);
    p.write('node_modules/nuxt/package.json', { version: '4.2.1' });
    assert.equal(majorOf(p.root, { devDependencies: { nuxt: '~3.9.0' } }, 'nuxt'), 4);
    assert.equal(majorOf(p.root, {}, 'nuxt'), null, 'installed but not declared: not the project\'s');
  });
});

describe('lib/profile.mjs: saved, confirmed, drift', () => {
  const base = { schema: 1, detectedAt: today, confirmed: [], adapter: 'vue-vite', framework: { name: 'vue', major: 3 }, bundler: { name: 'vite', major: 7 }, kind: 'library', paths: { src: 'src', styles: 'src/assets/css' }, styling: { engine: null } };

  test('confirmKey sets the value, records the key and never accepts bookkeeping keys', () => {
    const c = confirmKey(base, 'kind', 'app');
    assert.equal(c.kind, 'app');
    assert.deepEqual(c.confirmed, ['kind']);
    assert.equal(base.kind, 'library', 'the input is not changed');
    assert.deepEqual(confirmKey(c, 'styling.engine', { name: 'tailwind4', via: null }).confirmed, ['kind', 'styling.engine']);
    for (const k of ['schema', 'confirmed', 'detectedAt', 'adapter']) assert.throws(() => confirmKey(base, k, 1), /cannot be set/);
  });

  test('a confirmed parent covers its children', () => {
    const c = confirmKey(confirmKey(base, 'paths.styles', 'x'), 'paths', { src: 'lib', styles: 'lib/css' });
    assert.deepEqual(c.confirmed, ['paths']);
    assert.equal(isConfirmed(c, 'paths.styles'), true);
    assert.equal(isConfirmed(c, 'kind'), false);
  });

  test('mergeProfile: the detection, with the confirmed values on top', () => {
    const saved = confirmKey({ ...base, paths: { src: 'old', styles: 'old/css' } }, 'kind', 'app');
    const m = mergeProfile(saved, base);
    assert.equal(m.kind, 'app', 'confirmed wins');
    assert.equal(m.paths.src, 'src', 'not confirmed: the detection wins');
    assert.deepEqual(m.confirmed, ['kind']);
    assert.equal(mergeProfile(null, base), base);
    assert.equal(mergeProfile(saved, null), saved);
  });

  test('driftOf lists what changed, flagging the confirmed keys', () => {
    const saved = confirmKey({ ...base, paths: { src: 'old', styles: 'src/assets/css' } }, 'kind', 'app');
    assert.deepEqual(driftOf(saved, base), [
      { key: 'kind', saved: 'app', detected: 'library', confirmed: true },
      { key: 'paths.src', saved: 'old', detected: 'src', confirmed: false },
    ]);
    assert.deepEqual(driftOf(null, base), []);
    assert.deepEqual(driftOf(base, base), []);
  });

  test('leaves skips bookkeeping and keeps arrays whole; adapterOf follows framework and bundler', () => {
    assert.deepEqual(leaves({ schema: 1, confirmed: ['x'], a: { b: [1, 2], c: null } }), ['a.b', 'a.c']);
    assert.equal(adapterOf({ framework: { name: 'nuxt' } }), 'nuxt');
    assert.equal(adapterOf({ framework: { name: 'vue' }, bundler: { name: 'vite' } }), 'vue-vite');
    assert.equal(adapterOf({ framework: { name: 'vue' }, bundler: null }), null);
  });
});
