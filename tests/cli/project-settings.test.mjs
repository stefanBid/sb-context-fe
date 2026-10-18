import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, SCRIPTS } from '../helpers/fixture.mjs';
import { vueApp } from '../helpers/stacks.mjs';

const today = new Date().toISOString().slice(0, 10);
const FILE = '.sb-context/settings.json';

const I18N_CONFIG = `export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@nuxt/icon'],
  i18n: {
    defaultLocale: 'it',
    langDir: 'locales',
    locales: [
      { code: 'it', file: 'it.json' },
      { code: 'en-US', file: 'en.json' },
    ],
  },
  site: { url: 'https://example.com' },
})
`;

describe('project-settings.mjs', () => {
  let p;
  const settings = (...args) => p.run(SCRIPTS.projectSettings, args);
  afterEach(() => p?.cleanup());

  test('detect on a Vue + Vite app: vue-i18n from createI18n, its locale folder, views, the Vue packages', () => {
    p = vueApp({
      'src/i18n.ts': "import { createI18n } from 'vue-i18n'\nexport default createI18n({ legacy: false, locale: 'it', messages: { it: {}, en: {} } })\n",
      'src/i18n/locales/it.json': '{}',
      '.env.production': 'VITE_SITE_URL=https://dash.example.com\n',
    });
    const { facts, missing } = settings('detect').json();
    assert.equal(facts.i18n.package, 'vue-i18n');
    assert.equal(facts.i18n.setup, 'src/i18n.ts');
    assert.equal(facts.i18n.defaultLocale, 'it');
    assert.deepEqual(facts.i18n.locales, ['it', 'en']);
    assert.deepEqual(facts.i18n.localeDirs, ['src/i18n/locales', 'src/i18n']);
    assert.equal(facts.pagesDir, 'src/views');
    assert.equal(facts.pages, true);
    assert.equal(facts.packages.colorMode, '@vueuse/core');
    assert.equal(facts.seo.siteUrl, 'https://dash.example.com');
    assert.match(missing.find((m) => m.key === 'i18n.enabled').why, /vue-i18n is installed/);
  });

  test('get without a file returns the empty settings', () => {
    p = makeProject();
    assert.deepEqual(settings('get').json(), { version: 1 });
    assert.equal(settings('get', 'i18n.enabled').json(), null);
  });

  test('set writes the dotted key, stamps the section and excludes the folder from git', () => {
    p = makeProject();
    assert.equal(settings('set', 'i18n.defaultLocale', '"it"').code, 0);
    assert.equal(settings('set', 'i18n.locales', '["it","en"]', '--source', 'detected').code, 0);
    const s = p.json(FILE);
    assert.equal(s.version, 1);
    assert.equal(s.i18n.defaultLocale, 'it');
    assert.deepEqual(s.i18n.locales, ['it', 'en']);
    assert.equal(s.i18n.source, 'detected');
    assert.equal(s.i18n.updatedAt, today);
    assert.equal(settings('get', 'i18n.locales').json()[1], 'en');
    assert.equal(p.exists('.sb-context/.gitignore'), true);
    assert.equal(p.exists('.git/info/exclude'), false);
  });

  test('set reads JSON when it can and keeps a bare word as a string', () => {
    p = makeProject();
    settings('set', 'naming.componentPrefix', 'Base');
    settings('set', 'i18n.enabled', 'true');
    settings('set', 'stack.retries', '3');
    const s = p.json(FILE);
    assert.equal(s.naming.componentPrefix, 'Base');
    assert.equal(s.i18n.enabled, true);
    assert.equal(s.stack.retries, 3);
  });

  test('set on a top-level key does not stamp it', () => {
    p = makeProject();
    settings('set', 'flag', '1');
    assert.deepEqual(p.json(FILE), { version: 1, flag: 1 });
  });

  test('set replaces a scalar on the path with an object', () => {
    p = makeProject();
    settings('set', 'a', '"x"');
    settings('set', 'a.b.c', '2');
    assert.deepEqual(p.json(FILE).a.b, { c: 2 });
  });

  test('bad usage and an invalid settings file exit 2', () => {
    p = makeProject();
    assert.equal(settings('set', 'only.path').code, 2);
    assert.equal(settings('nope').code, 2);
    p.write(FILE, '{oops');
    assert.equal(settings('get').code, 2);
  });

  test('detect reads modules, i18n, components, package manager and SEO from the project', () => {
    p = makeProject({
      'nuxt.config.ts': I18N_CONFIG,
      'package.json': { dependencies: { nuxt: '^4.0.0', '@nuxtjs/i18n': '^9.0.0', '@nuxt/image': '^1.0.0' } },
      'pnpm-lock.yaml': '',
      'i18n/locales/it.json': '{}',
      'i18n/locales/en.json': '{}',
      'app/components/BaseButton.vue': '<template><button /></template>',
      'app/components/BaseInput.vue': '<template><input /></template>',
      'app/components/AppHeader.vue': '<template><header /></template>',
      'app/components/ui/Card.vue': '<template><div /></template>',
      'app/pages/index.vue': '<template><div /></template>',
      'app/layouts/default.vue': '<template><slot /></template>',
    });
    const { facts, missing, settingsFile } = settings('detect').json();
    assert.equal(settingsFile, null);
    assert.equal(facts.packageManager, 'pnpm');
    assert.equal(facts.srcDir, 'app');
    assert.equal(facts.nuxtConfig, 'nuxt.config.ts');
    assert.equal(facts.modules.i18n, true);
    assert.equal(facts.modules.icon, true, 'found in nuxt.config modules');
    assert.equal(facts.modules.image, true, 'found in package.json');
    assert.equal(facts.modules.fonts, false);
    assert.deepEqual(facts.i18n.locales, ['it', 'en-US']);
    assert.equal(facts.i18n.defaultLocale, 'it');
    assert.equal(facts.i18n.langDir, 'locales');
    assert.deepEqual(facts.i18n.localeFiles.sort(), ['i18n/locales/en.json', 'i18n/locales/it.json']);
    assert.equal(facts.components.count, 4);
    assert.deepEqual(facts.components.prefixes, { Base: 2, App: 1, none: 1 });
    assert.deepEqual(facts.components.subfolders, ['ui']);
    assert.equal(facts.pages, true);
    assert.deepEqual(facts.layouts, ['default.vue']);
    assert.equal(facts.seo.siteUrl, 'https://example.com');

    const byKey = Object.fromEntries(missing.map((m) => [m.key, m.detected]));
    assert.equal(byKey['i18n.defaultLocale'], 'it');
    assert.deepEqual(byKey['i18n.locales'], ['it', 'en-US']);
    assert.equal(byKey['i18n.messagesDir'], 'i18n/locales');
    assert.equal(byKey['naming.componentPrefix'], 'Base');
    assert.equal(byKey['images.module'], '@nuxt/image');
    assert.equal(byKey['seo.siteUrl'], 'https://example.com');
    assert.ok(!('stack.packageManager' in byKey), 'a lockfile answers it');
  });

  test('detect reads plain string locales when there are no codes', () => {
    p = makeProject({ 'nuxt.config.ts': "export default defineNuxtConfig({\n  i18n: {\n    locales: ['it', 'en'],\n  },\n})\n" });
    assert.deepEqual(settings('detect', '--need', 'i18n').json().facts.i18n.locales, ['it', 'en']);
  });

  test('detect stops asking what the settings already answer, and --need limits the topics', () => {
    p = makeProject();
    settings('set', 'icons.module', '"@nuxt/icon"');
    const r = settings('detect', '--need', 'icons,stack').json();
    assert.deepEqual(r.missing.map((m) => m.key), ['stack.packageManager']);
    assert.equal(r.settings.icons.module, '@nuxt/icon');
    assert.equal(r.settingsFile, FILE);
  });

  test('detect reads the style prefix from theme.css', () => {
    p = makeProject({ 'app/assets/css/theme.css': ':root {\n  --ps-bg: #fff;\n}\n' });
    const r = settings('detect', '--need', 'style').json();
    assert.deepEqual(r.facts.style, { aligned: true, prefix: 'ps' });
    assert.equal(r.missing[0].detected, 'ps');
  });

  test('detect honours srcDir from nuxt.config', () => {
    p = makeProject({ 'nuxt.config.ts': "export default defineNuxtConfig({ srcDir: 'src/' })\n", 'src/components/TheFoo.vue': '' });
    const { facts } = settings('detect', '--need', 'naming').json();
    assert.equal(facts.srcDir, 'src');
    assert.deepEqual(facts.components.prefixes, { The: 1 });
  });
});
