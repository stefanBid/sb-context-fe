import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as alignColor from '../../skills/style-align/scripts/color.mjs';
import * as migrateColor from '../../skills/style-migrate/scripts/color.mjs';

// a tiny seeded PRNG: random inputs, same every run
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const randomHex = (r) => `#${[0, 0, 0].map(() => Math.floor(r() * 256).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

for (const [label, { parseColor, contrast, luminance, over, toOklch, toHex, findColors }] of [['style-align', alignColor], ['style-migrate', migrateColor]]) {
  describe(`color.mjs (${label})`, () => {
    describe('parseColor', () => {
      test('hex: 3, 4, 6 and 8 digits, any case', () => {
        assert.deepEqual(parseColor('#fff'), { r: 1, g: 1, b: 1, a: 1 });
        assert.deepEqual(parseColor('#FF000080'), { r: 1, g: 0, b: 0, a: 128 / 255 });
        assert.deepEqual(parseColor('#0f08'), { r: 0, g: 1, b: 0, a: 136 / 255 });
        assert.equal(parseColor('  #000000  ').r, 0);
      });

      test('rgb/rgba: commas or spaces, alpha with / or as 4th value, percentages', () => {
        assert.deepEqual(parseColor('rgb(255, 0, 0)'), { r: 1, g: 0, b: 0, a: 1 });
        assert.deepEqual(parseColor('rgb(255 0 0 / 50%)'), { r: 1, g: 0, b: 0, a: 0.5 });
        assert.deepEqual(parseColor('rgba(0,0,0,.1)'), { r: 0, g: 0, b: 0, a: 0.1 });
        assert.deepEqual(parseColor('rgb(100% 50% 0%)'), { r: 1, g: 0.5, b: 0, a: 1 });
      });

      test('hsl: primaries, negative and >360 hues', () => {
        const red = parseColor('hsl(0 100% 50%)');
        close(red.r, 1); close(red.g, 0); close(red.b, 0);
        const blue = parseColor('hsla(-120, 100%, 50%, 1)');
        close(blue.b, 1); close(blue.r, 0);
        assert.deepEqual(parseColor('hsl(480 100% 50%)'), parseColor('hsl(120 100% 50%)'));
        const grey = parseColor('hsl(200 0% 40%)');
        close(grey.r, 0.4); close(grey.g, 0.4); close(grey.b, 0.4);
      });

      test('oklch: L as number or %, C as number or % (100% = 0.4)', () => {
        const white = parseColor('oklch(1 0 0)');
        close(white.r, 1); close(white.g, 1); close(white.b, 1);
        assert.deepEqual(parseColor('oklch(50% 0.1 120)'), parseColor('oklch(0.5 25% 120)'));
        assert.equal(parseColor('oklch(0.7 0.1 none)').a, 1, 'a non-numeric hue counts as 0');
      });

      test('CSS Color 4: unitless hsl percentages, angle units, none', () => {
        assert.deepEqual(parseColor('hsl(120 100 50)'), parseColor('hsl(120 100% 50%)'));
        const ref = parseColor('hsl(180 50% 50%)');
        for (const h of ['180deg', '0.5turn', '200grad', `${Math.PI}rad`]) {
          const c = parseColor(`hsl(${h} 50% 50%)`);
          close(c.r, ref.r, 1e-9); close(c.g, ref.g, 1e-9); close(c.b, ref.b, 1e-9);
        }
        assert.deepEqual(parseColor('oklch(0.6 0.1 0.25turn)'), parseColor('oklch(0.6 0.1 90)'));
        assert.deepEqual(parseColor('rgb(none 0 0)'), { r: 0, g: 0, b: 0, a: 1 });
      });

      test('out-of-range values are clamped, as browsers do', () => {
        assert.deepEqual(parseColor('rgb(300 -20 0 / 150%)'), { r: 1, g: 0, b: 0, a: 1 });
        assert.equal(parseColor('hsl(0 200% 50%)').r, 1);
        assert.deepEqual(parseColor('oklch(150% 0.1 30)'), parseColor('oklch(1 0.1 30)'));
      });

      test('unreadable numbers make the whole color unreadable', () => {
        for (const v of ['rgb(a b c)', 'hsl(x 50% 50%)', 'hsl(10foo 50% 50%)', 'oklch(0.5 0.1 abc)']) assert.equal(parseColor(v), null, v);
      });

      test('named colors it knows', () => {
        assert.deepEqual(parseColor('White'), { r: 1, g: 1, b: 1, a: 1 });
        assert.equal(parseColor('transparent').a, 0);
        assert.equal(parseColor('rebeccapurple'), null);
      });

      test('null for anything that is not a literal color', () => {
        for (const v of ['', null, undefined, 'var(--x)', 'rgb(var(--r) 0 0)', 'rgb(calc(1) 0 0)', '#12', '#12345', 'rgb(1 2)', 'lab(50 0 0)', 'currentColor'])
          assert.equal(parseColor(v), null, String(v));
      });
    });

    describe('contrast (WCAG 2.x)', () => {
      test('reference values', () => {
        close(contrast(parseColor('#000'), parseColor('#fff')), 21);
        close(contrast(parseColor('#fff'), parseColor('#fff')), 1);
        close(contrast(parseColor('#777'), parseColor('#fff')), 4.478, 1e-3);
        close(contrast(parseColor('#767676'), parseColor('#fff')), 4.542, 1e-3);
      });

      test('symmetric and between 1 and 21 for opaque colors', () => {
        const r = rng(1);
        for (let i = 0; i < 200; i++) {
          const a = parseColor(randomHex(r));
          const b = parseColor(randomHex(r));
          const x = contrast(a, b);
          close(x, contrast(b, a), 1e-9);
          assert.ok(x >= 1 && x <= 21.0000001);
        }
      });

      test('a translucent foreground is composited over the background first', () => {
        const half = parseColor('rgba(0, 0, 0, 0.5)');
        const white = parseColor('#fff');
        const mixed = over(half, white);
        close(mixed.r, 0.5);
        assert.equal(mixed.a, 1);
        close(contrast(half, white), contrast(mixed, white), 1e-9);
        assert.equal(over(white, half), white, 'an opaque foreground is returned as is');
      });

      test('luminance of the primaries', () => {
        close(luminance(parseColor('#f00')), 0.2126, 1e-6);
        close(luminance(parseColor('#0f0')), 0.7152, 1e-6);
        close(luminance(parseColor('#00f')), 0.0722, 1e-6);
      });
    });

    describe('toOklch / toHex', () => {
      test('known OKLCH values', () => {
        const w = toOklch(parseColor('#fff'));
        close(w.L, 1); close(w.C, 0);
        const red = toOklch(parseColor('#f00'));
        close(red.L, 0.628, 1e-3); close(red.C, 0.2577, 1e-3); close(red.H, 29.23, 0.05);
      });

      test('hex → oklch → hex round trip', () => {
        const r = rng(7);
        for (let i = 0; i < 300; i++) {
          const hex = randomHex(r);
          const { L, C, H } = toOklch(parseColor(hex));
          assert.equal(toHex(parseColor(`oklch(${L} ${C} ${H})`)), hex);
        }
      });

      test('toHex rounds, clamps and uppercases', () => {
        assert.equal(toHex({ r: 1.2, g: -0.1, b: 0.5 }), '#FF0080');
        assert.equal(toHex(parseColor('#abc')), '#AABBCC');
      });
    });

    test('findColors finds every literal inside a value', () => {
      assert.deepEqual(findColors('0 1px 2px rgba(0,0,0,.1), 0 0 0 1px #fff inset'), ['rgba(0,0,0,.1)', '#fff']);
      assert.deepEqual(findColors('1px solid oklch(0.5 0.1 200)'), ['oklch(0.5 0.1 200)']);
      assert.deepEqual(findColors('linear-gradient(white, black)'), ['white', 'black']);
      assert.deepEqual(findColors('var(--x) 1px'), []);
      assert.deepEqual(findColors('blackbird #12345678'), ['#12345678'], 'whole words only');
    });
  });
}
