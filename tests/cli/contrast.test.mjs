import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { makeProject, run, SCRIPTS, EXAMPLE_CSS } from '../helpers/fixture.mjs';

const contrast = (...args) => run(SCRIPTS.contrast, args);

describe('contrast.mjs --pair', () => {
  test('black on white is 21:1', () => {
    const r = contrast('--pair', '#000', '#fff', '--json');
    assert.equal(r.code, 0);
    assert.deepEqual(r.json(), { fg: '#000', bg: '#fff', ratio: 21, min: 4.5, ok: true });
  });

  test('exit 1 below the minimum, and --min changes it', () => {
    assert.equal(contrast('--pair', '#777777', '#ffffff').code, 1); // 4.48
    assert.equal(contrast('--pair', '#777777', '#ffffff', '--min', '3').code, 0);
    assert.match(contrast('--pair', '#777777', '#ffffff').stdout, /4\.48:1 \(minimum 4\.5\) FAILS/);
  });

  test('accepts every supported syntax', () => {
    for (const fg of ['rgb(0 0 0)', 'rgba(0, 0, 0, 1)', 'hsl(0 0% 0%)', 'oklch(0 0 0)', 'oklch(0% 0 0)', 'black', '#000000ff'])
      assert.equal(contrast('--pair', fg, 'white', '--json').json().ratio, 21, fg);
  });

  test('composites a translucent foreground over the background', () => {
    assert.equal(contrast('--pair', 'rgba(0, 0, 0, 0)', '#fff', '--json').json().ratio, 1);
  });

  test('exit 2 on a value that is not a color', () => {
    assert.equal(contrast('--pair', 'var(--x)', '#fff').code, 2);
    assert.equal(contrast('--pair', '#12', '#fff').code, 2);
  });
});

describe('contrast.mjs on a theme file', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('the reference theme passes every required pair in both themes', () => {
    const r = contrast(join(EXAMPLE_CSS, 'theme.css'), '--prefix', 'sb', '--json');
    const out = r.json();
    const failed = out.pairs.filter((x) => (x.ok === false && x.level !== 'warning') || x.error);
    assert.deepEqual(failed, []);
    assert.equal(r.code, 0);
    assert.equal(out.darkTheme, true);
    assert.ok(out.missing[0].includes('--sb-accent'), 'accent is not in the example');
    const ink = out.pairs.find((x) => x.theme === 'light' && x.fg === '--sb-ink' && x.bg === '--sb-bg');
    assert.equal(ink.ratio, 16.6); // checked by hand with the WCAG 2.x formula
    const ring = out.pairs.find((x) => x.theme === 'dark' && x.fg === '--sb-focus-ring' && x.bg === '--sb-bg');
    assert.equal(ring.fgVal, '#f0f5f2', 'var() resolved inside the dark theme');
    assert.deepEqual(out.notes, { light: [], dark: [] });
  });

  test('the dark theme inherits light variables, from any dark selector', () => {
    for (const darkSel of ['[data-theme="dark"]', '.dark', '@media (prefers-color-scheme: dark) { :root']) {
      const close = darkSel.startsWith('@media') ? '}}' : '}';
      p = makeProject({ 'a.css': `:root { --ink: #000; --bg: #fff; }\n${darkSel} { --bg: #000; ${close}` });
      const out = contrast(p.path('a.css'), '--pairs', write(p, [{ fg: '--ink', bg: '--bg' }]), '--json').json();
      assert.deepEqual(out.pairs.map((x) => `${x.theme}:${x.ratio}`), ['light:21', 'dark:1'], darkSel);
      p.cleanup();
    }
    p = null;
  });

  test('@theme tokens are not theme values; var() fallbacks and comments are handled', () => {
    p = makeProject({ 'a.css': '/* :root { --ink: #fff; } */\n@theme { --ink: #fff; }\n:root { --ink: var(--missing, #000); --bg: #fff; }' });
    const out = contrast(p.path('a.css'), '--pairs', write(p, [{ fg: '--ink', bg: '--bg' }]), '--json').json();
    assert.equal(out.darkTheme, false);
    assert.equal(out.pairs[0].ratio, 21);
  });

  test('warning pairs never fail; unreadable values always do', () => {
    p = makeProject({ 'a.css': ':root { --a: #777; --b: #fff; --c: calc(1px); }' });
    const pairs = write(p, [
      { fg: '--a', bg: '--b', level: 'warning' },
      { fg: '--a', bg: '--b', min: 3 },
    ]);
    assert.equal(contrast(p.path('a.css'), '--pairs', pairs).code, 0);
    const bad = write(p, [{ fg: '--c', bg: '--b' }], 'bad.json');
    const r = contrast(p.path('a.css'), '--pairs', bad, '--json');
    assert.equal(r.code, 1);
    assert.match(r.json().pairs[0].error, /unreadable value/);
  });

  test('observes a surface order that is not the usual one', () => {
    p = makeProject({ 'a.css': ':root { --bg: #fff; --surface: #eee; --surface-2: #ddd; --ink: #000; }' });
    const out = contrast(p.path('a.css'), '--json').json();
    assert.match(out.notes.light[0], /Light surface order is not surface ≥ bg > surface-2/);
  });

  test('exit 2 without a file', () => {
    assert.equal(contrast('--json').code, 2);
  });
});

function write(p, pairs, name = 'pairs.json') {
  p.write(name, pairs);
  return p.path(name);
}
