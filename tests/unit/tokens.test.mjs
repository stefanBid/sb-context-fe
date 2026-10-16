import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, ROLE_TYPES, eyebrowCleaner, normalizeColors, splitMobile, weightsOf, sizePx, buildRoleMap, demote } from '../../plugins/sb-design/skills/extract-style/scripts/lib/tokens.mjs';

describe('eyebrowCleaner', () => {
  test('removes the wording in English and Italian, recapitalizes, records the override', () => {
    const overrides = [];
    const { clean } = eyebrowCleaner(overrides);
    assert.equal(clean('Eyebrows above section titles.', 'type overline'), 'Above section titles.');
    assert.equal(clean('Occhielli e sottotitoli', 'x'), 'Sottotitoli');
    assert.equal(clean('Kickers, labels', 'x'), 'Labels');
    assert.equal(clean('Plain text', 'x'), 'Plain text');
    assert.equal(clean('', 'x'), '');
    assert.deepEqual(overrides, [
      'type overline: "Eyebrows above section titles." → "Above section titles."',
      'x: "Occhielli e sottotitoli" → "Sottotitoli"',
      'x: "Kickers, labels" → "Labels"',
    ]);
  });

  test('an eyebrow at the end leaves no dangling conjunction', () => {
    const { clean, cleanBlock } = eyebrowCleaner([]);
    assert.equal(clean('Labels and eyebrows.', 'x'), 'Labels.');
    assert.equal(clean('Labels, eyebrows and kickers', 'x'), 'Labels');
    assert.equal(clean('Titoli e occhielli; sempre brevi.', 'x'), 'Titoli; sempre brevi.');
    assert.equal(clean('Labels and eyebrows above titles.', 'x'), 'Labels above titles.');
    assert.equal(clean('Use eyebrows and kickers sparingly.', 'x'), 'Use sparingly.');
    assert.equal(cleanBlock('- Badges and kickers\n- Rest', 'x'), '- Badges\n- Rest');
  });

  test('cleanBlock works line by line and keeps the other lines', () => {
    const overrides = [];
    const { cleanBlock } = eyebrowCleaner(overrides);
    assert.equal(cleanBlock('# Title\nUse eyebrows sparingly.\nKeep it calm.', 'README'), '# Title\nUse sparingly.\nKeep it calm.');
    assert.equal(overrides.length, 1);
  });

  test('does not touch words that only contain the term', () => {
    const { clean } = eyebrowCleaner([]);
    assert.equal(clean('Eyebrowsy kickerless text', 'x'), 'Eyebrowsy kickerless text');
  });
});

describe('normalizeColors', () => {
  const themes = ['light', 'dark'];

  test('a single value applies to every theme; aliases resolve per theme', () => {
    const { colors, gaps } = normalizeColors([
      { name: 'ink', value: '#111' },
      { name: 'primary', value: { light: '#00f', dark: '#88f' } },
      { name: 'focus-ring', value: { light: '{primary}', dark: '{ink}' }, usage: 'Focus.' },
      { name: 'brand-extra', value: { light: 'oklch(0.5 0.1 200)' } },
    ], themes);
    assert.deepEqual(gaps, []);
    assert.deepEqual(colors.ink.values, { light: '#111', dark: '#111' });
    assert.deepEqual(colors['focus-ring'], { values: { light: '#00f', dark: '#111' }, usage: 'Focus.', alias: { light: 'primary', dark: 'ink' }, inFixedSet: true });
    assert.equal(colors['brand-extra'].inFixedSet, false);
  });

  test('aliases of aliases and unknown names are gaps', () => {
    const { colors, gaps } = normalizeColors([
      { name: 'a', value: '{b}' },
      { name: 'b', value: '{c}' },
      { name: 'c', value: '#000' },
      { name: 'd', value: '{nope}' },
    ], ['light']);
    assert.equal(colors.b.values.light, '#000', 'b resolves: c is literal');
    assert.equal(colors.a.values.light, '{b}', 'a points to b, which was still an alias when a was read');
    assert.deepEqual(gaps, [
      'Color `a` (light) is an alias of `b` that cannot be resolved: ask.',
      'Color `d` (light) is an alias of `nope` that cannot be resolved: ask.',
    ]);
  });

  test('values that are not color literals are gaps', () => {
    const { gaps } = normalizeColors([{ name: 'x', value: { light: 'blue', dark: 'var(--x)' } }], themes);
    assert.equal(gaps.length, 2);
    assert.ok(normalizeColors([{ name: 'ok', value: 'HSL(1 2% 3%)' }], ['light']).gaps.length === 0);
  });

  test('the usage text goes through the cleaner', () => {
    const { colors } = normalizeColors([{ name: 'x', value: '#000', usage: 'u' }], ['light'], (t, where) => `${where}:${t}`);
    assert.equal(colors.x.usage, 'color x:u');
  });
});

test('splitMobile', () => {
  assert.deepEqual(splitMobile('Page title. Mobile: 30px / 36px.'), { mobile: { size: '30px', lineHeight: '36px' }, usage: 'Page title.' });
  assert.deepEqual(splitMobile('mobile:28.5px/34px'), { mobile: { size: '28.5px', lineHeight: '34px' }, usage: '' });
  assert.deepEqual(splitMobile('Mobile: 2rem / 2.5rem'), { mobile: null, usage: 'Mobile: 2rem / 2.5rem' }, 'only px is read');
  assert.deepEqual(splitMobile(), { mobile: null, usage: '' });
});

test('weightsOf and sizePx', () => {
  assert.deepEqual(weightsOf(700), [700]);
  assert.deepEqual(weightsOf('400 700'), [400, 700]);
  assert.deepEqual(weightsOf('bold'), []);
  assert.deepEqual(weightsOf(undefined), []);
  assert.equal(sizePx('18px'), 18);
  assert.equal(sizePx('1.125rem'), 18);
});

describe('buildRoleMap', () => {
  const full = Object.fromEntries(['bg', 'surface', 'ink', 'primary'].map((n) => [n, { usage: '' }]));
  const type = { h1: {}, body: {} };

  test('identity when the core roles exist and nothing contradicts them', () => {
    const { roleMap } = buildRoleMap(full, type);
    assert.equal(roleMap.status, 'identity');
    assert.deepEqual(roleMap.colors.bg, { role: 'bg', suggested: null });
  });

  test('a usage that begins like another role is suspicious', () => {
    const { roleMap } = buildRoleMap({ ...full, surface: { usage: 'App background, behind cards.' } }, type);
    assert.equal(roleMap.status, 'needs-confirmation');
    assert.deepEqual(roleMap.colors.surface, { role: 'surface', suggested: null, suspicious: 'bg' });
  });

  test('hints read only how the usage begins', () => {
    const { roleMap } = buildRoleMap({ ...full, panel: { usage: 'Cards and menus.' }, other: { usage: 'Used on the page background.' }, ring: { usage: 'Keyboard focus outline' } }, type);
    assert.equal(roleMap.colors.panel.suggested, 'surface');
    assert.equal(roleMap.colors.other.suggested, null);
    assert.equal(roleMap.colors.ring.suggested, 'focus-ring');
    assert.equal(roleMap.status, 'identity', 'names outside the fixed set do not block by themselves');
  });

  test('missing core colors or type roles need confirmation; type names get hints', () => {
    const { roleMap, coreMissing, typeMissing } = buildRoleMap({ bg: { usage: '' } }, { title: {}, paragraph: {}, body: {} });
    assert.deepEqual(coreMissing, ['surface', 'ink', 'primary']);
    assert.deepEqual(typeMissing, ['h1']);
    assert.equal(roleMap.status, 'needs-confirmation');
    assert.deepEqual(roleMap.type.title, { role: null, suggested: 'h2' });
    assert.deepEqual(roleMap.type.body, { role: 'body', suggested: null });
  });
});

test('demote moves every heading down by the given levels, up to h6', () => {
  assert.equal(demote('# A\n## B\n##### E\n###### F\nnot # a heading'), '## A\n### B\n###### E\n###### F\nnot # a heading');
  assert.equal(demote('# A\n## B\n#### D', 2), '### A\n#### B\n###### D');
  assert.equal(demote('#hashtag', 2), '#hashtag');
});

test('role lists', () => {
  assert.equal(new Set(ROLES).size, ROLES.length);
  assert.ok(['bg', 'surface', 'ink', 'primary', 'focus-ring'].every((r) => ROLES.includes(r)));
  assert.deepEqual(ROLE_TYPES, ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'body-strong', 'label', 'small', 'overline']);
});
