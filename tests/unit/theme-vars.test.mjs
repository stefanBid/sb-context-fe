import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseBlocks, themeOf, themeVars, resolveVars, STANDARD_PAIRS, standardPairs, customPairs, evaluate, surfaces, surfaceNotes } from '../../skills/style-align/scripts/lib/theme-vars.mjs';

test('parseBlocks keeps the chain of preludes and ignores comments', () => {
  const blocks = parseBlocks('/* :root { --x: 1; } */ :root { --a: 1; --b: var(--a, 2) } @media (x) { .y { --c: 3; } }');
  assert.deepEqual(blocks.map((b) => [b.context, Object.fromEntries(b.decls)]), [
    [[':root'], { '--a': '1', '--b': 'var(--a, 2)' }],
    [['@media (x)'], {}],
    [['@media (x)', '.y'], { '--c': '3' }],
  ]);
});

test('parseBlocks returns to the parent block after a nested one', () => {
  const [outer] = parseBlocks(':root { --a: 1; @media (x) { --b: 2; } --c: 3; }');
  assert.deepEqual([...outer.decls.keys()], ['--a', '--c']);
});

test('themeOf', () => {
  const cases = [
    [[':root'], 'light'],
    [[':root, [data-theme="light"]'], 'light'],
    [['html'], 'light'],
    [["[data-theme='light']"], 'light'],
    [['[data-theme="dark"]'], 'dark'],
    [['html.dark'], 'dark'],
    [['@media (prefers-color-scheme: dark)', ':root'], 'dark'],
    [['@theme inline'], null],
    [['@theme'], null],
    [['.card'], null],
    [['.darker'], null],
  ];
  for (const [ctx, want] of cases) assert.equal(themeOf(ctx), want, ctx.join(' > '));
});

test('themeVars: dark inherits light; later declarations win', () => {
  const { light, dark, hasDark } = themeVars(':root { --a: #fff; --b: #000; } :root { --a: #eee; } [data-theme="dark"] { --a: #111; }');
  assert.equal(hasDark, true);
  assert.equal(light.get('--a'), '#eee');
  assert.equal(dark.get('--a'), '#111');
  assert.equal(dark.get('--b'), '#000');
  assert.equal(themeVars(':root { --a: 1; }').hasDark, false);
});

test('resolveVars: nested, fallbacks, unknown, cycles', () => {
  const map = new Map([['--a', 'var(--b)'], ['--b', '#123'], ['--loop', 'var(--loop)']]);
  assert.equal(resolveVars(map, 'var(--a)'), '#123');
  assert.equal(resolveVars(map, 'var(--nope, #fff)'), '#fff');
  assert.equal(resolveVars(map, 'var(--nope, var(--b))'), 'var(--nope, #123)', 'a fallback containing var() is not matched (no parentheses inside)');
  assert.equal(resolveVars(map, 'var(--nope)'), 'var(--nope)');
  assert.equal(resolveVars(map, 'var(--loop)'), 'var(--loop)', 'stops after 20 levels');
  assert.equal(resolveVars(map, '1px solid var(--b)'), '1px solid #123');
});

test('standard pairs: names follow the prefix; one warning pair', () => {
  assert.equal(STANDARD_PAIRS.length, 34);
  const pairs = standardPairs('ps');
  assert.deepEqual(pairs[0], ['--ps-ink', '--ps-bg', 4.5, 'body text', 'required']);
  assert.deepEqual(pairs.filter((p) => p[4] === 'warning').map((p) => [p[0], p[1], p[2]]), [['--ps-border-strong', '--ps-bg', 3]]);
  assert.equal(standardPairs(null)[0][0], '--ink');
  assert.deepEqual(customPairs([{ fg: '--a', bg: '--b' }]), [['--a', '--b', 4.5, '', 'required']]);
});

describe('evaluate', () => {
  const map = new Map([['--ink', '#000'], ['--bg', '#fff'], ['--alias', 'var(--ink)'], ['--bad', 'calc(1px)']]);
  test('ratio, ok and resolved values', () => {
    const { rows, missing } = evaluate(map, [['--alias', '--bg', 4.5, 'n', 'required']], 'light');
    assert.deepEqual(missing, []);
    assert.deepEqual(rows, [{ theme: 'light', fg: '--alias', bg: '--bg', fgVal: '#000', bgVal: '#fff', ratio: 21, min: 4.5, ok: true, level: 'required', note: 'n' }]);
  });

  test('missing variables are listed once and the pair skipped', () => {
    const { rows, missing } = evaluate(map, [['--nope', '--bg', 4.5], ['--nope', '--gone', 4.5]], 'dark');
    assert.deepEqual(rows, []);
    assert.deepEqual(missing, ['--nope', '--gone']);
  });

  test('unreadable values are an error row', () => {
    const { rows } = evaluate(map, [['--bad', '--bg', 4.5, '']], 'light');
    assert.match(rows[0].error, /unreadable value \(calc\(1px\) \/ #fff\)/);
  });
});

test('surfaces and surface order notes', () => {
  const light = new Map([['--x-bg', '#f5f5f5'], ['--x-surface', '#ffffff'], ['--x-surface-2', '#eeeeee'], ['--x-ink', 'var(--nope)']]);
  const s = surfaces(light, 'light', 'x');
  assert.deepEqual(s.map((r) => r.role), ['bg', 'surface', 'surface-2'], 'unreadable roles skipped');
  assert.equal(s[1].hex, '#FFFFFF');
  assert.deepEqual(surfaceNotes(s, 'light'), []);
  assert.equal(surfaceNotes(s, 'dark').length, 1, 'the same order is wrong for dark');
  const darkOk = [{ role: 'bg', L: 0.1 }, { role: 'surface', L: 0.2 }, { role: 'surface-2', L: 0.3 }];
  assert.deepEqual(surfaceNotes(darkOk, 'dark'), []);
  assert.deepEqual(surfaceNotes(darkOk.slice(0, 2), 'dark'), [], 'needs all three');
});
