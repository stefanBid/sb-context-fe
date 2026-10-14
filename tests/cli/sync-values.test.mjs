import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, SCRIPTS } from '../helpers/fixture.mjs';
import { extract, tokens } from '../helpers/design.mjs';

const THEME = 'app/assets/css/theme.css';
const TYPO = 'app/assets/css/typography.css';
const APPLIED = '.sb-context-nuxt/design-applied.json';

/** A project with the reference style and a snapshot of the sample design (optionally changed). */
function setup(change = () => {}) {
  const p = withExampleStyle(makeProject());
  const t = tokens();
  change(t);
  const r = extract(p, t);
  assert.equal(r.code, 0, r.stderr);
  return p;
}
const color = (t, name) => t.color.tokens.find((c) => c.name === name);
const style = (t, name) => t.type.groups.flatMap((g) => g.styles).find((s) => s.name === name);

describe('sync-values.mjs', () => {
  let p;
  const sync = (...args) => p.run(SCRIPTS.syncValues, args);
  afterEach(() => p?.cleanup());

  test('exit 3 without a snapshot or without an aligned style', () => {
    p = withExampleStyle(makeProject());
    assert.equal(sync('--check').code, 3);
    p.cleanup();
    p = makeProject();
    extract(p);
    const r = sync('--check');
    assert.equal(r.code, 3);
    assert.match(r.stderr, /no aligned global style/);
  });

  test('the reference style is aligned with the sample design', () => {
    p = setup();
    assert.equal(sync('--check').code, 0);
    const out = sync('--json').json();
    assert.equal(out.aligned, true);
    assert.deepEqual(out.differences, []);
    assert.deepEqual(out.unmapped, []);
    assert.ok(out.needsDecision.some((u) => u.token === 'on-error' && /project-specific/.test(u.note)));
    assert.ok(!out.needsDecision.some((u) => u.area === 'font'));
  });

  test('reports drift per area and theme, without writing', () => {
    p = setup((t) => {
      color(t, 'primary').value.light = '#123456';
      t.radius.tokens.find((r) => r.name === 'radius-md').value = '16px';
      style(t, 'h1').fontSize = '42px';
      style(t, 'h1').fontWeight = 800;
      style(t, 'h2').usage = 'Section title. Mobile: 26px / 32px.';
      t.shadow.tokens[0].value.dark = '0 1px 3px rgba(0, 0, 0, 0.5)';
    });
    const before = p.read(THEME);
    const r = sync('--json');
    assert.equal(r.code, 10);
    const d = r.json().differences.map((x) => `${x.area}|${x.token}|${x.theme}|${x.current}|${x.wanted}`);
    assert.deepEqual(d.sort(), [
      'color|primary|light|#00804a|#123456',
      'radius|md|null|14px|16px',
      'shadow|sm|dark|0 1px 2px rgba(0, 0, 0, 0.4)|0 1px 3px rgba(0, 0, 0, 0.5)',
      'type|h1--font-weight|null|700|800',
      'type|h1|null|2.5rem|2.625rem',
      'type|h2 mobile line-height|null|1.875rem|2rem',
      'type|h2 mobile size|null|1.5rem|1.625rem',
    ]);
    assert.equal(sync('--check').code, 10);
    assert.equal(p.read(THEME), before, 'dry run');
  });

  test('--apply rewrites only the drifted values, keeps comments honest and records the state', () => {
    p = setup((t) => {
      color(t, 'primary').value.light = '#123456';
      style(t, 'h1').fontSize = '42px';
      style(t, 'h2').usage = 'Section title. Mobile: 26px / 32px.';
    });
    const r = sync('--apply');
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /Applied 4 value\(s\) in (theme\.css, typography\.css|typography\.css, theme\.css)/);
    const theme = p.read(THEME);
    assert.match(theme, /--sb-primary: #123456;/);
    assert.match(theme, /--sb-primary: #00c975;/, 'dark value untouched');
    const typo = p.read(TYPO);
    assert.match(typo, /--text-h1: 2\.625rem; {22}\/\* 42 \*\//);
    assert.match(typo, /font-size: 1\.625rem; {8}\/\* mobile 26 \/ 32 \*\//);
    assert.match(typo, /line-height: 2rem;/);
    assert.equal(sync('--check').code, 0, 'idempotent');
    assert.deepEqual(p.json(APPLIED).version, '3');
    assert.equal(p.json(APPLIED).prefix, 'sb');
  });

  test('aliases are written as var() of the mapped role', () => {
    p = setup((t) => (color(t, 'focus-ring').value = { light: '{primary}', dark: '{ink}' }));
    const d = sync('--json').json().differences;
    assert.deepEqual(d.map((x) => `${x.token}|${x.theme}|${x.wanted}`), ['focus-ring|light|var(--sb-primary)']);
    sync('--apply');
    assert.match(p.read(THEME), /--sb-focus-ring: var\(--sb-primary\);/);
  });

  test('what it cannot apply needs a decision and is never written', () => {
    p = setup((t) => {
      t.color.tokens.push({ name: 'accent', value: { light: '#ff0000', dark: '#ff8888' } });
      t.type.families.display = '"Lora", serif';
      t.radius.tokens.push({ name: 'radius-xl', value: '30px' });
    });
    const out = sync('--json').json();
    assert.equal(out.aligned, true);
    const nd = out.needsDecision.map((u) => `${u.area}|${u.token}`);
    for (const k of ['color|accent', 'font|display', 'radius|xl']) assert.ok(nd.includes(k), k);
    sync('--apply');
    assert.doesNotMatch(p.read(THEME), /accent|radius-xl/);
    assert.match(p.read(TYPO), /--font-display: "Poppins"/);
  });

  test('a design that needs role confirmation stops with exit 4 until --map', () => {
    p = setup((t) => {
      t.color.tokens = t.color.tokens.filter((c) => c.name !== 'bg');
      color(t, 'surface').usage = 'Page background.';
    });
    let r = sync('--check');
    assert.equal(r.code, 4);
    assert.match(r.stderr, /colors\.surface {2}→ bg {3}\(same-name role "surface" exists, but its usage suggests "bg"\)/);

    assert.equal(sync('--map', 'colors.nope=bg').code, 2);
    assert.equal(sync('--map', 'surface=bg').code, 2);

    // two names on one role
    const all = ['surface-2', 'border', 'border-strong', 'ink', 'ink-muted', 'primary', 'primary-hover', 'on-primary', 'primary-soft', 'success', 'success-soft', 'warning', 'warning-soft', 'error', 'error-soft', 'info', 'info-soft', 'focus-ring'];
    const types = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'body-strong', 'label', 'small', 'overline'];
    const identity = [...all.map((n) => `colors.${n}=${n}`), ...types.map((n) => `type.${n}=${n}`)];
    assert.equal(sync('--map', 'colors.surface=ink', ...identity).code, 0);
    r = sync('--check');
    assert.equal(r.code, 4);
    assert.match(r.stderr, /Two design names map to the same role "ink"/);

    assert.equal(sync('--map', 'colors.surface=bg').code, 0);
    const map = p.json('.sb-context-nuxt/design-map.json');
    assert.equal(map.colors.surface, 'bg');
    r = sync('--json');
    const d = r.json().differences.filter((x) => x.token === 'bg');
    assert.deepEqual(d.map((x) => `${x.theme}|${x.wanted}`), ['light|#ffffff', 'dark|#161918'], 'the design surface is compared with the project bg');
  });

  test('--map null leaves a design name out', () => {
    p = setup((t) => {
      t.color.tokens = t.color.tokens.filter((c) => c.name !== 'bg');
      t.color.tokens.push({ name: 'line', value: { light: '#000', dark: '#fff' } });
    });
    const names = tokens().color.tokens.map((c) => c.name).filter((n) => n !== 'bg');
    const types = tokens().type.groups.flatMap((g) => g.styles).map((s) => s.name);
    sync('--map', ...names.map((n) => `colors.${n}=${n}`), ...types.map((n) => `type.${n}=${n}`), 'colors.line=null');
    assert.deepEqual(sync('--json').json().unmapped, ['line']);
  });

  test('--record only records the applied snapshot', () => {
    p = setup((t) => (color(t, 'primary').value.light = '#123456'));
    assert.equal(sync('--record').code, 0);
    assert.equal(p.json(APPLIED).tokensSha256.length, 64);
    assert.match(p.read(THEME), /--sb-primary: #00804a;/);
  });
});
