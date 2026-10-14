import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { nHex, nShadow, nFamily, toRem, same, pxLabel, remStr, blockOf, findSlot, writeSlot, writeSlots, refreshMobileComments, parseMapArg, byRole } from '../../skills/style-align/scripts/lib/sync.mjs';

describe('normalizers', () => {
  test('nHex expands short hex and lowercases; other values are only trimmed and lowercased', () => {
    assert.equal(nHex(' #ABC '), '#aabbcc');
    assert.equal(nHex('#AABBCC'), '#aabbcc');
    assert.equal(nHex('#abcd'), '#abcd');
    assert.equal(nHex('RGB(0 0 0)'), 'rgb(0 0 0)');
  });

  test('nShadow ignores spacing, case and leading zeros', () => {
    assert.equal(nShadow('0 1px 2px RGBA( 0, 0, 0, 0.10 )'), nShadow('0  1px 2px rgba(0,0,0,.1)'));
    assert.notEqual(nShadow('0 1px 2px #000'), nShadow('0 1px 3px #000'));
  });

  test('nFamily compares the first family only, without quotes', () => {
    assert.equal(nFamily('"Inter", sans-serif'), 'inter');
    assert.equal(nFamily("'Inter'"), 'inter');
    assert.equal(nFamily(null), '');
  });

  test('toRem / same / remStr / pxLabel', () => {
    assert.equal(toRem('24px'), 1.5);
    assert.equal(toRem('1.5rem'), 1.5);
    assert.equal(toRem('1.5em'), 1.5);
    assert.equal(toRem('1.5'), 1.5);
    assert.equal(toRem(' -0.02em '), -0.02);
    assert.equal(toRem('clamp(1rem, 2vw, 3rem)'), 'clamp(1rem, 2vw, 3rem)');
    assert.equal(toRem(null), null);
    assert.equal(same(toRem('10px'), toRem('0.625rem')), true);
    assert.equal(same(0.1 + 0.2, 0.3), true);
    assert.equal(same('a', 'a'), true);
    assert.equal(same(1, '1'), false);
    assert.equal(remStr('42px'), '2.625rem');
    assert.equal(remStr('13px'), '0.8125rem');
    assert.equal(remStr('7px'), '0.4375rem');
    assert.equal(remStr('normal'), 'normal');
    assert.equal(pxLabel(2.625), '42px');
    assert.equal(pxLabel(0.8333), '13.33px');
  });
});

describe('slots', () => {
  const css = `:root,
[data-theme="light"] {
  --sb-bg: #fff;  /* page */
  --sb-ink: #111;
}
[data-theme="dark"] {
  --sb-bg: #000;
  --sb-ink: #eee;
}
@utility sb-h1 {
  @apply text-h1;
  font-size: 1.875rem;      /* mobile 30 / 36 */
  line-height: 2.25rem;
  @variant lg {
    font-size: var(--text-h1);
  }
}
--text-h1: 2.5rem;   /* 40 */
`;

  test('blockOf: the range inside the braces, nested blocks included', () => {
    const r = blockOf(css, /\[data-theme="dark"\]\s*\{/);
    assert.equal(css.slice(r.start, r.end).trim(), '--sb-bg: #000;\n  --sb-ink: #eee;');
    const u = blockOf(css, /@utility\s+sb-h1\s*\{/);
    assert.match(css.slice(u.start, u.end), /@variant lg \{[\s\S]*\}\n$/);
    assert.equal(blockOf(css, /nope\s*\{/), null);
    assert.equal(blockOf('a { b { }', /a\s*\{/), null, 'unbalanced');
  });

  test('findSlot: value, comment and absolute position, inside a range when given', () => {
    const light = blockOf(css, /:root\s*,\s*\[data-theme="light"\]\s*\{/);
    const s = findSlot(css, '--sb-bg', light, 'theme');
    assert.equal(s.value, '#fff');
    assert.equal(s.comment, '/* page */');
    assert.equal(s.gap, '  ');
    assert.equal(s.file, 'theme');
    assert.equal(css.slice(s.index, s.index + s.length), '--sb-bg: #fff;  /* page */');
    const dark = findSlot(css, '--sb-bg', blockOf(css, /\[data-theme="dark"\]\s*\{/));
    assert.equal(dark.value, '#000');
    assert.equal(findSlot(css, '--sb-nope'), null);
  });

  test('findSlot does not match a longer name that starts the same way', () => {
    assert.equal(findSlot('--text-h1--line-height: 1; --text-h1: 2;', '--text-h1').value, '2');
    assert.equal(findSlot('--radius-md2: 1px; --radius-md: 2px;', '--radius-md').value, '2px');
    assert.equal(findSlot('font-size: 3px', 'font-size'), null, 'a declaration needs its semicolon');
  });

  test('writeSlot replaces the value and keeps a px comment honest', () => {
    const s = findSlot(css, '--text-h1');
    const out = writeSlot(css, s, '2.625rem');
    assert.match(out, /--text-h1: 2\.625rem; {3}\/\* 42 \*\//);
    const bg = findSlot(css, '--sb-bg');
    assert.match(writeSlot(css, bg, '#fafafa'), /--sb-bg: #fafafa; {2}\/\* page \*\//, 'a word comment is kept as is');
  });

  test('writeSlots applies several edits whatever their order', () => {
    const a = findSlot(css, '--sb-bg');
    const b = findSlot(css, '--sb-ink');
    const out = writeSlots(css, [{ slot: a, value: '#a1a1a1' }, { slot: b, value: '#b2b2b2' }]);
    assert.match(out, /--sb-bg: #a1a1a1;/);
    assert.match(out, /--sb-ink: #b2b2b2;/);
    assert.equal(out.replace('#a1a1a1', '#fff').replace('#b2b2b2', '#111'), css, 'nothing else moved');
  });

  test('refreshMobileComments rewrites only the roles that have mobile values', () => {
    const out = refreshMobileComments(css, 'sb', { h1: { mobile: { size: '26px', lineHeight: '2rem' } }, h2: {} });
    assert.match(out, /font-size: 1\.875rem; {6}\/\* mobile 26 \/ 32 \*\//);
    assert.equal(refreshMobileComments(css, 'ps', { h1: { mobile: { size: '26px', lineHeight: '32px' } } }), css, 'other prefix: untouched');
  });
});

describe('role map', () => {
  test('parseMapArg', () => {
    assert.deepEqual(parseMapArg('colors.surface=bg'), { kind: 'colors', name: 'surface', role: 'bg' });
    assert.deepEqual(parseMapArg('type.big.title=h1'), { kind: 'type', name: 'big.title', role: 'h1' });
    assert.deepEqual(parseMapArg('colors.line=null'), { kind: 'colors', name: 'line', role: null });
    for (const bad of ['surface=bg', 'colors.surface', 'fonts.a=b', 'colors.=bg']) assert.equal(parseMapArg(bad), null, bad);
  });

  test('byRole keys values by role and refuses two names on one role', () => {
    const src = { surface: { light: '#fff' }, card: { light: '#eee' } };
    assert.deepEqual(byRole({ surface: 'bg', card: 'surface', line: null }, src), {
      bg: { light: '#fff', __name: 'surface' },
      surface: { light: '#eee', __name: 'card' },
    });
    assert.throws(() => byRole({ surface: 'bg', card: 'bg' }, src), /Two design names map to the same role "bg" \(surface and card\)/);
  });
});
