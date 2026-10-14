import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { textRules, literalOf, keysIn, scriptLineText, hasKey } from '../../scripts/lib/i18n-text.mjs';

const rules = textRules();

describe('textRules', () => {
  test('hasText: two letters in any script; entities and allowed words do not count', () => {
    for (const t of ['Ok', 'Ciao', 'Привет', 'こんにちは', 'é è']) assert.equal(rules.hasText(t), t !== 'é è', t);
    for (const t of ['', '42', '— · —', '&nbsp;', '&#8212; 3']) assert.equal(rules.hasText(t), false, t);
    const brand = textRules(['Acme', 'Nuxt']);
    assert.equal(brand.hasText('Acme'), false);
    assert.equal(brand.hasText('Acme Nuxt'), false);
    assert.equal(brand.hasText('Acme rocks'), true);
  });

  test('isSentence: two or more plain words that do not look like classes', () => {
    for (const s of ['Hello world', "Don't panic!", 'Questa è una frase', 'Click here, now.']) assert.equal(rules.isSentence(s), true, s);
    for (const s of ['Hello', 'w-8 h-8 md:flex', 'text-sm font-bold', '1 2 3', 'a b', 'GET /api/users']) assert.equal(rules.isSentence(s), false, s);
  });

  test('isSentence: utility classes made of plain words', { todo: '"flex items-center gap-2": "flex" is a plain word, so the string is not class-like' }, () => {
    assert.equal(rules.isSentence('flex items-center gap-2'), false);
  });
});

test('literalOf: the literal of a one-string expression', () => {
  assert.equal(literalOf("'Hi'"), 'Hi');
  assert.equal(literalOf(' "Hi there" '), 'Hi there');
  assert.equal(literalOf('`Hi`'), 'Hi');
  assert.equal(literalOf("'It\\'s'"), "It\\'s");
  for (const e of ['`Hi ${name}`', "'a' + 'b'", "t('a')", 'title', '', null]) assert.equal(literalOf(e), null, String(e));
});

test('keysIn: literal keys of t() and $t(), dynamic ones only counted', () => {
  assert.deepEqual(keysIn("$t('a.b') + t(\"c\") + t(`d`)"), { keys: ['a.b', 'c', 'd'], dynamic: 0 });
  assert.deepEqual(keysIn('t(`a.${x}`)'), { keys: [], dynamic: 1 });
  assert.deepEqual(keysIn("format('x') + i18n.t('y') + obj.$t('z') + _t('w')"), { keys: [], dynamic: 0 }, 'not a bare t()');
  assert.deepEqual(keysIn("t( 'spaced' )"), { keys: ['spaced'], dynamic: 0 });
});

describe('scriptLineText', () => {
  const kinds = (line, r = rules) => scriptLineText(line, r).map((x) => `${x.kind}|${x.text}`);

  test('SEO keys, text-like keys and sentences', () => {
    assert.deepEqual(kinds("useSeoMeta({ ogTitle: 'Home', description: 'The best site' })"), ['seo|Home', 'seo|The best site']);
    assert.deepEqual(kinds("const items = [{ label: 'Save', tooltip: 'Save it' }]"), ['script text|Save', 'script text|Save it']);
    assert.deepEqual(kinds("throw new Error('Something went wrong')"), ['script string|Something went wrong']);
  });

  test('keys, routes, ids and classes are not text', () => {
    for (const line of [
      "const x = t('home.title')",
      "router.push({ path: '/about us' })",
      "const link = { to: 'some page', href: 'other page' }",
      "el.id = 'main content'",
      "const t2 = { type: 'primary button', key: 'save it' }",
      "const cls = 'w-4 md:hidden'",
      "const single = 'Word'",
    ])
      assert.deepEqual(kinds(line), [], line);
  });

  test('`name:` is a text key, not an identifier', () => {
    assert.deepEqual(kinds("const p = { name: 'Product one' }"), ['script text|Product one']);
  });

  test('skipped lines: comments, imports, types, i18n-ignore, template strings with ${}', () => {
    for (const line of [
      "// 'This is a comment'",
      " * 'Doc comment line'",
      "import Foo from 'some words here'",
      "export type A = 'one two'",
      "type B = 'three four'",
      "const a = 'Not this one' // i18n-ignore",
      'const b = `Hello ${name} there`',
    ])
      assert.deepEqual(kinds(line), [], line);
  });

  test('allowed words do not make text', () => {
    assert.deepEqual(kinds("const brand = { title: 'Acme' }", textRules(['Acme'])), []);
  });
});

test('hasKey: nested objects or a flat dotted key', () => {
  const locale = { home: { title: 'x', empty: '' }, 'flat.key': 'y' };
  assert.equal(hasKey(locale, 'home.title'), true);
  assert.equal(hasKey(locale, 'home.empty'), true);
  assert.equal(hasKey(locale, 'flat.key'), true);
  assert.equal(hasKey(locale, 'home'), true);
  assert.equal(hasKey(locale, 'home.missing'), false);
  assert.equal(hasKey(locale, 'home.title.deeper'), false);
});
