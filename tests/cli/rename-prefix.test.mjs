import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, SCRIPTS } from '../helpers/fixture.mjs';

const COMPONENT = `<template>
  <h1 class="sb-h1 lg:sb-display">Title</h1>
  <p class="sb-body-strong text-ink">Body</p>
  <div class="sb-card sb-h1x" />
</template>
<style>
.x { color: var(--sb-primary); }
</style>
`;

describe('rename-prefix.mjs', () => {
  let p;
  const rename = (...args) => p.run(SCRIPTS.renamePrefix, args);
  afterEach(() => p?.cleanup());
  const project = () => withExampleStyle(makeProject({ 'app/components/Hero.vue': COMPONENT }));

  test('dry run counts every replacement and writes nothing', () => {
    p = project();
    const before = p.read('app/components/Hero.vue');
    const r = rename('--to', 'ps');
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /# Prefix rename: sb → ps \(dry run: nothing written\)/);
    assert.match(r.stdout, /\| app\/components\/Hero\.vue \| 4 \|/);
    assert.match(r.stdout, /Utilities renamed: 15\./);
    assert.equal(p.read('app/components/Hero.vue'), before);
  });

  test('--apply renames variables, utilities (with variants) and headers, and nothing else', () => {
    p = project();
    const r = rename('--to', 'ps', '--apply');
    assert.equal(r.code, 0, r.stderr);
    const vue = p.read('app/components/Hero.vue');
    assert.match(vue, /class="ps-h1 lg:ps-display"/);
    assert.match(vue, /class="ps-body-strong text-ink"/);
    assert.match(vue, /var\(--ps-primary\)/);
    assert.match(vue, /class="sb-card sb-h1x"/, 'not utilities of the style: untouched');
    assert.match(r.stdout, /`sb-card` × 1/);
    assert.match(r.stdout, /`sb-h1x` × 1/);

    const theme = p.read('app/assets/css/theme.css');
    assert.doesNotMatch(theme, /--sb-/);
    assert.match(theme, /Prefix "ps"/);
    const typo = p.read('app/assets/css/typography.css');
    assert.match(typo, /@utility ps-body-strong \{/);
    assert.match(typo, /h1 \{ @apply ps-h1; \}/);
    assert.doesNotMatch(typo, /\bsb-/);

    // the new prefix is now detected
    assert.equal(rename('--to', 'ps').code, 2);
    assert.equal(rename('--to', 'sb', '--apply').code, 0);
    assert.equal(p.read('app/components/Hero.vue'), COMPONENT, 'round trip');
  });

  test('rejects invalid, reserved, identical and colliding prefixes', () => {
    p = project();
    for (const bad of ['p', 'Ps', 'p-s', 'toolong', '1a', 'bg', 'ring'])
      assert.equal(rename('--to', bad).code, 2, bad);
    assert.match(rename('--to', 'sb').stderr, /already "sb"/);
    p.write('app/assets/css/extra.css', ':root { --zz-x: 1px; }');
    assert.match(rename('--to', 'zz').stderr, /already used/);
    assert.equal(rename().code, 2);
  });

  test('without an aligned style it needs --from', () => {
    p = makeProject({ 'app/assets/css/main.css': ':root { --ab-x: 1px; }\n@utility ab-title { color: red; }' });
    assert.match(rename('--to', 'cd').stderr, /Current prefix not detected/);
    const r = rename('--to', 'cd', '--from', 'ab', '--apply');
    assert.equal(r.code, 0, r.stderr);
    assert.equal(p.read('app/assets/css/main.css'), ':root { --cd-x: 1px; }\n@utility cd-title { color: red; }');
  });

  test('exit 2 when the project has no CSS', () => {
    p = makeProject();
    assert.match(rename('--to', 'ps').stderr, /No CSS found/);
  });
});
