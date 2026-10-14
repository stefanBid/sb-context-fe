import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeProject, withExampleStyle, SCRIPTS, EXAMPLE_CSS } from '../helpers/fixture.mjs';

const PAGE = `<template>
  <div>
    <h1 class="sb-h1">Title</h1>
    <h3 class="text-xl font-medium text-gray-500">Skip</h3>
    <h1 class="text-[40px]">Second</h1>
    <p class="text-sm rounded-xl shadow-xl bg-surface dark:bg-surface foo-bar own-thing 2xl:p-4" style="color: #00804a; font-size: 18px">x</p>
    <button :class="isOn ? 'bg-blue-600 text-white' : 'bg-surface'">b</button>
  </div>
</template>
<style>
.own-thing { color: #ff0000; font-size: 15px; font-weight: 500; font-family: Arial; }
</style>
`;
const CLEAN = '<template>\n  <section class="bg-surface p-4">\n    <h2>Title</h2>\n    <p class="sb-small text-ink-muted rounded-md">Text</p>\n  </section>\n</template>\n';

describe('template.mjs', () => {
  let p;
  let result;
  before(() => {
    p = withExampleStyle(makeProject({
      'nuxt.config.ts': readFileSync(`${EXAMPLE_CSS}/nuxt.config.ts`, 'utf8'),
      'app/pages/index.vue': PAGE,
      'app/components/Clean.vue': CLEAN,
      'app/components/Broken.vue': '<template><div class="text-red-500"></template>',
    }));
    const r = p.run(SCRIPTS.template, ['app/pages/index.vue', '--out', 'out.json']);
    assert.equal(r.code, 0, r.stderr);
    result = p.json('out.json');
  });
  after(() => p.cleanup());
  const rows = () => result.results[0].rows.map((r) => `${r.line}|${r.class}|${r.status}|${r.proposal}`);

  test('reads the entry point and the prefix from the project', () => {
    assert.equal(result.cssEntry, 'app/assets/css/main.css');
    assert.equal(result.prefix, 'sb');
  });

  test('judges every class and proposes the theme equivalent', () => {
    assert.deepEqual(rows(), [
      '3|sb-h1|redundant|(remove)',
      '4|text-xl|broken|(remove)',
      '4|font-medium|broken|font-normal or font-semibold',
      '4|text-gray-500|broken|text-ink-muted or text-primary or text-border-strong',
      '5|text-[40px]|arbitrary value|(remove)',
      '6|text-sm|broken|sb-small',
      '6|rounded-xl|broken|rounded-sm',
      '6|shadow-xl|broken|shadow-lg',
      '6|dark:bg-surface|redundant|(remove)',
      '6|foo-bar|unknown|null',
      '6|2xl:p-4|broken|xl:p-4',
      '6|style="color: #00804a; font-size: 18px"|inline style|text-primary sb-lead',
      '7|bg-blue-600|broken|bg-primary-hover or bg-primary or bg-info',
      '7|text-white|broken|text-on-primary or text-on-error or text-surface',
    ]);
    assert.ok(!rows().some((r) => r.includes('own-thing')), 'defined in the file <style>');
    assert.ok(result.results[0].rows.filter((r) => r.line === 7).every((r) => r.dynamic));
  });

  test('checks the component <style> block', () => {
    assert.deepEqual(result.results[0].style.map((s) => `${s.line}|${s.prop}|${s.kind}|${s.proposal}`), [
      '11|color|literal color|var(--color-error) or var(--color-warning) or var(--color-border-strong)',
      '11|font-size|text size outside the theme|@apply sb-body or @apply sb-small',
      '11|font-weight|weight outside the theme|400, 600, 700',
      '11|font-family|hard-coded family|var(--font-display) or var(--font-body) or var(--font-mono)',
    ]);
  });

  test('checks the heading outline of a page', () => {
    assert.deepEqual(result.results[0].headings, ['2 h1 in the page (lines 3, 5): one per page.', 'Line 4: h3 after h1, a level is skipped.']);
  });

  test('--summary over the whole srcDir counts per file', () => {
    const r = p.run(SCRIPTS.template, ['--summary']);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /\| app\/pages\/index\.vue \| 9 \| 1 \| 2 \| 1 \| 1 \| 4 \| 2 \|/);
    assert.doesNotMatch(r.stdout, /Clean\.vue \|/);
    assert.match(r.stdout, /Files with nothing to change: 1 of 3\./);
  });

  test('a malformed SFC is reported as an error, not analyzed', () => {
    const r = p.run(SCRIPTS.template, ['--summary']);
    assert.match(r.stdout, /- ERROR app\/components\/Broken\.vue: Element is missing end tag\. \(line 1\)/);
    assert.doesNotMatch(r.stdout, /\| app\/components\/Broken\.vue \|/);
    const detail = p.run(SCRIPTS.template, ['app/components/Broken.vue']);
    assert.match(detail.stdout, /## app\/components\/Broken\.vue\n\nERROR: Element is missing end tag\./);
  });

  test('exit 2 without a global style or without .vue files', () => {
    assert.match(p.run(SCRIPTS.template, ['--css', 'nope.css']).stderr, /Global style not found/);
    assert.equal(p.run(SCRIPTS.template, ['app/assets']).code, 2);
  });
});
