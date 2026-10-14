import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, SCRIPTS } from '../helpers/fixture.mjs';
import { TOKENS, SOURCE, machine, extract, tokens as clone } from '../helpers/design.mjs';

describe('tokens-to-source.mjs', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('writes the snapshot in .sb-context-nuxt with full coverage and an identity role map', () => {
    p = makeProject();
    const r = extract(p);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /Coverage \(read → written\): colors 20\/20 · type styles 11\/11 .* ✓/);
    assert.match(r.stdout, /Git: \.sb-context-nuxt\/ added to \.git\/info\/exclude/);
    const d = machine(p.read(SOURCE));
    assert.equal(d.schema, 'design-source/1');
    assert.equal(d.name, 'Sample Brand');
    assert.equal(d.suggestedPrefix, 'sb');
    assert.equal(d.source.version, '3');
    assert.match(d.source.tokensSha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(d.themes, ['light', 'dark']);
    assert.equal(d.roleMap.status, 'identity');
    assert.deepEqual(d.weights, [400, 600, 700]);
    assert.equal(d.motion, null);
    assert.deepEqual(Object.keys(d.extra), ['zIndex']);
  });

  test('resolves color aliases per theme and keeps the alias', () => {
    p = makeProject();
    extract(p);
    const ring = machine(p.read(SOURCE)).colors['focus-ring'];
    assert.equal(ring.light, '#1a1a1a');
    assert.equal(ring.dark, '#f0f5f2');
    assert.deepEqual(ring.alias, { light: 'ink', dark: 'ink' });
  });

  test('extracts mobile sizes from the usage text and removes them from it', () => {
    p = makeProject();
    extract(p);
    const { type } = machine(p.read(SOURCE));
    assert.deepEqual(type.h1.mobile, { size: '30px', lineHeight: '36px' });
    assert.equal(type.h1.usage, 'Page title.');
    assert.equal(type.h3.mobile, undefined);
    assert.equal(type.h1.family, TOKENS.type.families.display);
  });

  test('removes eyebrow wording everywhere and lists each override', () => {
    p = makeProject();
    extract(p);
    const md = p.read(SOURCE);
    const d = machine(md);
    assert.equal(d.type.overline.usage, 'Above titles.');
    const body = md.split('## Overrides')[0].replace("with the eyebrow wording removed", '');
    assert.doesNotMatch(body, /eyebrow|kicker/i);
    assert.match(body, /Use sparingly\./);
    assert.ok(d.overrides.includes('README: "Use eyebrows and kickers sparingly." → "Use sparingly."'));
  });

  test('a removed eyebrow does not leave a dangling conjunction', { todo: 'clean() strips "eyebrows" but keeps the "and" before it: "Body text and ."' }, () => {
    p = makeProject();
    extract(p);
    assert.equal(machine(p.read(SOURCE)).colors.ink.usage, 'Body text.');
  });

  test('breakpoints other than the fixed four are overrides, not values', () => {
    p = makeProject();
    extract(p);
    const d = machine(p.read(SOURCE));
    assert.ok(d.overrides.includes('breakpoint md: design says 760px, the plugin fixes 768px'));
    assert.ok(d.overrides.includes('breakpoint 2xl (1536px): only sm, md, lg, xl exist'));
    assert.deepEqual(d.breakpoints.fixed, { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' });
  });

  test('indexes components with their group, classes and README', () => {
    p = makeProject();
    extract(p);
    const md = p.read(SOURCE);
    const [button, card] = machine(md).components;
    assert.deepEqual(button, {
      name: 'Button',
      group: 'Actions',
      subtitle: 'Buttons for actions',
      summary: 'Primary and secondary actions.',
      files: { readme: 'project/components/Button/README.md', preview: 'project/components/Button/preview.html' },
      classes: ['sb-btn', 'sb-btn--primary'],
    });
    assert.equal(card.files.readme, null);
    assert.match(md, /### Button\n\n_Buttons for actions_\n\nPrimary and secondary actions\.\n\n#### Rules\n/);
    assert.match(md, /## Brand guide\n[\s\S]*?\n### Sample Brand\n[\s\S]*?\n#### Voice\n/);
  });

  test('README headings never reach the level of the file\'s own sections', () => {
    p = makeProject();
    extract(p);
    const own = ['Provenance', 'Colors', 'Typography', 'Spacing', 'Radii', 'Shadows', 'Breakpoints', 'Motion', 'Brand guide', 'Components', 'Overrides applied during extraction', 'Gaps to resolve in style-align', 'Machine data'];
    const h2 = [...p.read(SOURCE).matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(h2, own);
  });

  test('flags role mappings that need confirmation', () => {
    p = makeProject();
    const t = clone();
    t.color.tokens = t.color.tokens.filter((c) => c.name !== 'bg');
    t.color.tokens.find((c) => c.name === 'surface').usage = 'Page background.';
    t.color.tokens.push({ name: 'line', value: { light: '#ddd', dark: '#333' }, usage: 'Cards outline' });
    extract(p, t);
    const d = machine(p.read(SOURCE));
    assert.equal(d.roleMap.status, 'needs-confirmation');
    assert.deepEqual(d.roleMap.colors.surface, { role: 'surface', suggested: null, suspicious: 'bg' });
    assert.deepEqual(d.roleMap.colors.line, { role: null, suggested: 'surface' });
    assert.match(d.gaps[0], /^Role mapping needs confirmation .*core colors missing \(bg\)/);
  });

  test('reports aliases it cannot resolve, non-color values, missing roles and extra themes', () => {
    p = makeProject();
    const t = clone();
    t.color.themes.push({ id: 'contrast' });
    t.color.tokens.push({ name: 'accent', value: { light: '{nope}', dark: 'blue-ish' } });
    t.type.groups[1].styles = t.type.groups[1].styles.filter((s) => s.name !== 'small');
    t.type.groups[1].styles.find((s) => s.name === 'body').fontSize = '15px';
    extract(p, t);
    const { gaps, colors } = machine(p.read(SOURCE));
    const has = (re) => assert.ok(gaps.some((g) => re.test(g)), `no gap matching ${re}`);
    has(/`accent` \(light\) is an alias of `nope` that cannot be resolved/);
    has(/`accent` \(dark\) has a value that is not a color literal: "blue-ish"/);
    has(/Type role `small` is missing/);
    has(/`body` is 15px: running text and inputs are never below 16px/);
    has(/3 themes \(light, dark, contrast\)/);
    assert.equal(colors.primary.contrast, colors.primary.light, 'a missing theme value falls back to the first theme');
  });

  test('suggests no prefix without a name, and --name overrides it', () => {
    p = makeProject();
    const t = clone();
    delete t.name;
    extract(p, t);
    let d = machine(p.read(SOURCE));
    assert.equal(d.suggestedPrefix, null);
    assert.ok(d.gaps.some((g) => g.startsWith('The design has no name')));
    extract(p, t, ['--name', 'PraticaSicura']);
    d = machine(p.read(SOURCE));
    assert.equal(d.suggestedPrefix, 'ps');
  });

  test('a re-extraction keeps the previous file and prints what changed', () => {
    p = makeProject();
    extract(p);
    let r = extract(p);
    assert.match(r.stdout, /Changes: none/);
    const t = clone();
    t.color.tokens.find((c) => c.name === 'primary').value.light = '#123456';
    t.radius.tokens.push({ name: 'radius-xl', value: '30px' });
    r = extract(p, t);
    assert.match(r.stdout, /Changes: 2\n {2}~ color primary\n {2}\+ radius xl/);
    assert.equal(machine(p.read('.sb-context-nuxt/design-source.prev.md')).colors.primary.light, '#00804a');
  });

  test('refuses tokens that are not a Design System and writes nothing', () => {
    p = makeProject();
    const r = extract(p, { name: 'x', color: { tokens: [] } });
    assert.equal(r.code, 2);
    assert.equal(p.exists(SOURCE), false);
    p.write('bad.json', '{');
    assert.equal(p.run(SCRIPTS.tokensToSource, ['--tokens', 'bad.json']).code, 2);
    assert.equal(p.run(SCRIPTS.tokensToSource, []).code, 2);
  });

  test('with --out it runs outside a Nuxt project and does not touch git', () => {
    p = makeProject({}, { nuxtConfig: false });
    const r = extract(p, TOKENS, ['--out', 'snap/ds.md']);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /output is outside \.sb-context-nuxt\/: not touched/);
    assert.equal(machine(p.read('snap/ds.md')).name, 'Sample Brand');
  });

  test('is deterministic: same tokens, same file', () => {
    p = makeProject();
    extract(p);
    const a = p.read(SOURCE);
    extract(p);
    assert.equal(p.read(SOURCE), a);
  });
});
