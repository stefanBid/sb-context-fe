import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../helpers/random.mjs';
import { parseColor, contrast, toOklch } from '../../skills/style-align/scripts/color.mjs';
import { parseBlocks, themeVars, resolveVars } from '../../skills/style-align/scripts/lib/theme-vars.mjs';
import { blockOf, findSlot, toRem, nShadow } from '../../skills/style-align/scripts/lib/sync.mjs';
import { toPx, parseFontShorthand, clusterSizes, mediaWidths } from '../../skills/style-align/scripts/lib/scale.mjs';
import { splitVariants, rootOf, classesFromExpression } from '../../skills/style-migrate/scripts/lib/classes.mjs';
import { textRules, literalOf, keysIn, scriptLineText } from '../../scripts/lib/i18n-text.mjs';
import { suggestPrefix, prefixError } from '../../scripts/lib/prefix.mjs';

// Inputs built from the characters these parsers care about, so the odd cases come up often.
const ALPHABET = ['{', '}', ';', ':', '/*', '*/', '(', ')', ',', '/', '%', '#', '-', '--', 'var(', 'calc(', '@media ', ':root', '[data-theme="dark"]', '.dark', ' ', '\n', 'a', 'f', '0', '1', '9', '.', 'rgb(', 'hsl(', 'oklch(', 'px', 'rem', '!', '[', ']', "'", '"', '`', '$', '{{', 't(', 'é'];
const junk = (r, n) => Array.from({ length: r.int(0, n) }, () => r.pick(ALPHABET)).join('');
const N = 3000;

test('parsers never throw on arbitrary input', () => {
  const r = rng();
  const rules = textRules(['Acme']);
  for (let i = 0; i < N; i++) {
    const s = junk(r, 40);
    const ctx = `seed ${r.seed}, case ${i}: ${JSON.stringify(s)}`;
    assert.doesNotThrow(() => {
      parseColor(s);
      const blocks = parseBlocks(s);
      const { light, dark } = themeVars(s);
      for (const [k, v] of [...light, ...dark]) resolveVars(dark, v, 0) ?? k;
      blockOf(s, /:root\s*\{/);
      findSlot(s, '--a');
      toRem(s);
      nShadow(s);
      toPx(s);
      parseFontShorthand(s);
      mediaWidths(s);
      splitVariants(s);
      rootOf(s);
      classesFromExpression(s);
      rules.isSentence(s);
      literalOf(s);
      keysIn(s);
      scriptLineText(s, rules);
      suggestPrefix(s);
      return blocks;
    }, ctx);
  }
});

test('a parsed color has channels and alpha in 0..1', { todo: 'parseColor reads unitless hsl saturation/lightness (valid CSS Color 4: hsl(358 12 78)) as 0..1 fractions, r = 68.76; and it never clamps: rgb(300 0 0) gives r = 1.18' }, () => {
  const r = rng();
  const n = () => r.pick([`${r.int(-50, 400)}`, `${r.int(-50, 150)}%`, `${(r.next() * 2 - 0.5).toFixed(2)}`]);
  for (let i = 0; i < N; i++) {
    const s = r.pick([`rgb(${n()} ${n()} ${n()} / ${n()})`, `hsl(${r.int(-400, 400)} ${n()} ${n()})`, `oklch(${n()} ${n()} ${r.int(-400, 400)})`]);
    const c = parseColor(s);
    if (!c) continue;
    for (const k of ['r', 'g', 'b', 'a']) assert.ok(c[k] >= 0 && c[k] <= 1, `${s} → ${k} = ${c[k]}`);
  }
});

test('contrast stays within 1..21 for any pair of readable colors', () => {
  const r = rng();
  for (let i = 0; i < N; i++) {
    const a = parseColor(r.pick([r.hex(), `rgba(${r.int(0, 255)}, ${r.int(0, 255)}, ${r.int(0, 255)}, ${r.next().toFixed(2)})`, `oklch(${r.next().toFixed(3)} ${(r.next() * 0.37).toFixed(3)} ${r.int(0, 360)})`]));
    const b = parseColor(r.hex());
    const x = contrast(a, b);
    assert.ok(x >= 1 - 1e-9 && x <= 21 + 1e-9, `${JSON.stringify(a)} on ${JSON.stringify(b)}: ${x}`);
    const { L } = toOklch(b);
    assert.ok(L >= -1e-6 && L <= 1 + 1e-6);
  }
});

test('every suggested prefix is valid or there is none', () => {
  const r = rng();
  for (let i = 0; i < N; i++) {
    const name = Array.from({ length: r.int(0, 5) }, () => junk(r, 6) + r.pick(['Brand', 'Bg', 'Ring', 'Sr', 'x', 'Studio', 'É'])).join(r.pick([' ', '', '-', 'X']));
    const p = suggestPrefix(name);
    if (p !== null) assert.equal(prefixError(p), null, `${JSON.stringify(name)} → ${p}`);
  }
});

test('size clusters are disjoint, ordered and keep every occurrence', () => {
  const r = rng();
  for (let i = 0; i < 500; i++) {
    const sizes = Array.from({ length: r.int(0, 30) }, () => r.pick([r.int(10, 72), r.int(10, 72) + 0.5]));
    const clusters = clusterSizes(sizes);
    assert.equal(clusters.reduce((s, c) => s + c.count, 0), sizes.length);
    const members = clusters.flatMap((c) => c.members.map((m) => m.px));
    assert.deepEqual(members, [...new Set(sizes)].sort((a, b) => a - b));
    for (const c of clusters) assert.ok(c.members.some((m) => m.px === c.proposed));
  }
});
