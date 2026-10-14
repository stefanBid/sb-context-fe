import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, SCRIPTS } from '../helpers/fixture.mjs';

const LOCALES = {
  'i18n/locales/it.json': { home: { title: 'Ciao', alt: 'Logo' }, 'flat.key': 'x' },
  'i18n/locales/en.json': { home: { title: 'Hi' } },
};

describe('check-i18n.mjs', () => {
  let p;
  const check = (...args) => p.run(SCRIPTS.checkI18n, [...args, '--json']);
  const kinds = (r) => r.json().inline.map((x) => `${x.kind}|${x.text}`);
  afterEach(() => p?.cleanup());

  test('a fully internationalized file is clean (exit 0)', () => {
    p = makeProject({
      ...LOCALES,
      '.sb-context-nuxt/project-settings.json': { i18n: { defaultLocale: 'it' } },
      'app/pages/index.vue': `<template>
  <div>
    <h1>{{ $t('home.title') }}</h1>
    <img :alt="t('home.alt')" src="/logo.svg" class="w-8 h-8">
    <i18n-t keypath="flat.key" tag="p" />
    <code>const x = 'Hello world'</code>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const cls = 'w-8 h-8 md:flex'
</script>
<style>
.a::after { content: 'Some words here'; }
</style>
`,
    });
    const r = check('app');
    assert.equal(r.code, 0, r.stdout);
    const out = r.json();
    assert.equal(out.checked, 1);
    assert.deepEqual(out.inline, []);
    assert.equal(out.keysUsed, 3);
    // home.alt is missing only in en: reported, not blocking
    assert.deepEqual(out.missingKeys.map((k) => `${k.key}@${k.locale}:${k.isDefault}`).sort(), ['flat.key@en:false', 'home.alt@en:false']);
  });

  test('reports every kind of inline text, with its line', () => {
    p = makeProject({
      ...LOCALES,
      'app/components/Card.vue': `<template>
  <div>
    <p>Benvenuto nel sito</p>
    <img alt="Logo aziendale" src="/a.png">
    <input :placeholder="'Cerca qui'">
    <span>{{ 'Testo fisso' }}</span>
    <meta name="description" content="Una descrizione">
    <svg><text>Ignored svg</text></svg>
    <span>{{ count }}</span>
  </div>
</template>
<script setup>
useHead({ title: 'Pagina home' })
const items = [{ label: 'Primo elemento' }]
const msg = 'Questa è una frase'
const ok = 'Questa è ignorata' // i18n-ignore
const route = { to: '/home', icon: 'i-lucide-home' }
</script>
`,
    });
    const r = check('app/components/Card.vue');
    assert.equal(r.code, 10);
    assert.deepEqual(kinds(r), [
      'text|Benvenuto nel sito',
      'attr alt|Logo aziendale',
      'attr :placeholder|Cerca qui',
      'interpolation|Testo fisso',
      'attr content|Una descrizione',
      'seo|Pagina home',
      'script text|Primo elemento',
      'script string|Questa è una frase',
    ]);
    const lines = r.json().inline.map((x) => x.line);
    assert.deepEqual(lines, [3, 4, 5, 6, 7, 13, 14, 15]);
  });

  test('--allow ignores brand names', () => {
    p = makeProject({ 'app/a.vue': '<template><p>Acme</p><p>Acme Corp</p></template>' });
    assert.deepEqual(kinds(check('app', '--allow', 'Acme')), ['text|Acme Corp']);
    assert.equal(check('app', '--allow', 'Acme,Corp').code, 0);
  });

  test('a key missing from the default locale fails; the default comes from the settings', () => {
    p = makeProject({
      ...LOCALES,
      'app/a.vue': "<template><p>{{ $t('home.missing') }}</p><p>{{ t(`dyn.${x}`) }}</p></template>",
    });
    let out = check('app');
    assert.equal(out.code, 10);
    assert.equal(out.json().dynamicKeys, 1);
    const def = out.json().missingKeys.filter((k) => k.isDefault).map((k) => k.locale);
    assert.deepEqual(def, ['en'], 'without settings the first file (alphabetical) is the default');

    p.write('.sb-context-nuxt/project-settings.json', { i18n: { defaultLocale: 'it' } });
    out = check('app');
    assert.deepEqual(out.json().missingKeys.filter((k) => k.isDefault).map((k) => k.locale), ['it']);
  });

  test('--locales and settings.messagesDir point to the locale folder', () => {
    p = makeProject({ 'lang-files/it.json': { a: 'x' }, 'app/a.vue': "<template><p>{{ $t('a') }}</p></template>" });
    assert.equal(check('app').json().note, 'no locale folder found: keys not checked');
    assert.equal(check('app', '--locales', 'lang-files').code, 0);
    p.write('.sb-context-nuxt/project-settings.json', { i18n: { messagesDir: 'lang-files' } });
    assert.equal(check('app').json().note, null);
  });

  test('a class string made of plain words is not a sentence', () => {
    p = makeProject({ 'app/a.vue': "<template><div /></template>\n<script setup>\nconst cls = 'flex items-center gap-2'\n</script>\n" });
    assert.deepEqual(check('app').json().inline, []);
  });

  test('without targets it exits 2', () => {
    p = makeProject();
    assert.equal(p.run(SCRIPTS.checkI18n, []).code, 2);
  });
});
