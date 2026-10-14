import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dig, parseValue, setPath, parseI18nConfig, componentNaming, siteUrlOf, themePrefixOf } from '../../scripts/lib/settings.mjs';

describe('dotted paths', () => {
  test('dig', () => {
    const o = { a: { b: { c: 0 } }, n: null };
    assert.equal(dig(o, 'a.b.c'), 0);
    assert.equal(dig(o, 'a.x.c'), undefined);
    assert.equal(dig(o, 'n.x'), undefined);
  });

  test('parseValue: JSON first, bare words as strings', () => {
    assert.equal(parseValue('true'), true);
    assert.equal(parseValue('3'), 3);
    assert.equal(parseValue('null'), null);
    assert.deepEqual(parseValue('["a"]'), ['a']);
    assert.equal(parseValue('"x"'), 'x');
    assert.equal(parseValue('Base'), 'Base');
    assert.equal(parseValue('{oops'), '{oops');
  });

  test('setPath stamps the top-level section of a nested key', () => {
    const s = setPath({ version: 1 }, 'i18n.locales', ['it'], { source: 'detected', date: '2026-10-14' });
    assert.deepEqual(s, { version: 1, i18n: { locales: ['it'], source: 'detected', updatedAt: '2026-10-14' } });
  });

  test('setPath keeps a top-level scalar as it is', () => {
    assert.deepEqual(setPath({ version: 1 }, 'flag', 1, { date: 'd' }), { version: 1, flag: 1 });
    assert.deepEqual(setPath({ version: 1 }, 'list', ['a'], { date: 'd' }), { version: 1, list: ['a'] });
  });

  test('setPath replaces scalars on the way and keeps siblings', () => {
    const s = setPath({ a: 'x', b: { keep: 1 } }, 'a.b.c', 2, { date: 'd' });
    assert.deepEqual(s.a, { b: { c: 2 }, source: 'user', updatedAt: 'd' });
    assert.deepEqual(setPath(s, 'b.new', true, { date: 'd' }).b, { keep: 1, new: true, source: 'user', updatedAt: 'd' });
  });
});

describe('parseI18nConfig', () => {
  test('object locales with codes', () => {
    const cfg = `export default defineNuxtConfig({
  i18n: {
    defaultLocale: 'it',
    restructureDir: 'i18n',
    locales: [
      { code: 'it', file: 'it.json' },
      { code: "en-US", file: 'en.json' },
    ],
  },
})`;
    assert.deepEqual(parseI18nConfig(cfg), { defaultLocale: 'it', locales: ['it', 'en-US'], langDir: 'i18n' });
  });

  test('plain string locales', () => {
    const cfg = "export default defineNuxtConfig({\n  i18n: {\n    locales: ['it', 'en', 'pt-BR'],\n  },\n})";
    assert.deepEqual(parseI18nConfig(cfg).locales, ['it', 'en', 'pt-BR']);
  });

  test('nothing when there is no i18n block', () => {
    assert.deepEqual(parseI18nConfig('export default {}'), { defaultLocale: null, locales: [], langDir: null });
  });
});

test('componentNaming counts prefixes only before a capital letter', () => {
  const { prefixes, subfolders } = componentNaming(['BaseButton.vue', 'Basement.vue', 'AppHeader.vue', 'ui/UInput.vue', 'ui/forms/TheForm.vue', 'Card.vue']);
  assert.deepEqual(prefixes, { Base: 1, none: 2, App: 1, U: 1, The: 1 });
  assert.deepEqual(subfolders, ['ui']);
});

test('siteUrlOf and themePrefixOf', () => {
  assert.equal(siteUrlOf("site: { url: 'https://a.dev' }"), 'https://a.dev');
  assert.equal(siteUrlOf('runtimeConfig: { public: { siteUrl: "http://b.dev/x" } }'), 'http://b.dev/x');
  assert.equal(siteUrlOf("url: '/relative'"), null);
  assert.equal(themePrefixOf(':root {\n  --ps-bg: #fff;'), 'ps');
  assert.equal(themePrefixOf(':root { --color-bg: #fff; }'), null);
});
