import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPx, parseFontShorthand, nearestStep, scaleFromTokens, clusterSizes, scaleFromClusters, mediaWidths, commonDir } from '../../skills/style-align/scripts/lib/scale.mjs';

test('toPx: every unit at 16px per rem/em, unitless as a ratio', () => {
  assert.deepEqual(toPx('18px'), { px: 18, unit: 'px' });
  assert.deepEqual(toPx('1.5rem'), { px: 24, unit: 'rem' });
  assert.deepEqual(toPx('2em'), { px: 32, unit: 'em' });
  assert.deepEqual(toPx('125%'), { px: 20, unit: '%' });
  assert.deepEqual(toPx('1.5'), { px: null, ratio: 1.5, unit: '' });
  assert.equal(toPx('clamp(1rem, 2vw, 3rem)'), null);
  assert.equal(toPx('var(--x)'), null);
  assert.deepEqual(toPx('var(--x)', (v) => v.replace('var(--x)', '1rem')), { px: 16, unit: 'rem' });
});

test('parseFontShorthand', () => {
  assert.deepEqual(parseFontShorthand('400 16px/1.5 Inter, sans-serif'), { weight: '400', size: '16px', lineHeight: '1.5', family: 'Inter, sans-serif' });
  assert.deepEqual(parseFontShorthand('italic bold 1rem "Inter"'), { weight: 'bold', size: '1rem', lineHeight: null, family: '"Inter"' });
  assert.deepEqual(parseFontShorthand('var(--size)/var(--lh) var(--font)'), { weight: null, size: 'var(--size)', lineHeight: 'var(--lh)', family: 'var(--font)' });
  assert.equal(parseFontShorthand('inherit'), null);
  assert.equal(parseFontShorthand('16px'), null, 'a family is required');
});

test('nearestStep: offset, ties and an empty scale', () => {
  const scale = [[14, 'small'], [16, 'body'], [20, 'h4']];
  assert.deepEqual(nearestStep(scale, 15.5), { step: 16, role: 'body', offset: -0.5, equidistant: false });
  assert.deepEqual(nearestStep(scale, 18), { step: '16 / 20', role: 'body or h4: the role decides', offset: 2, equidistant: true });
  assert.deepEqual(nearestStep(scale, 15), { step: '14 / 16', role: 'small or body: the role decides', offset: 1, equidistant: true });
  assert.deepEqual(nearestStep(scale, 40), { step: 20, role: 'h4', offset: 20, equidistant: false });
  assert.deepEqual(nearestStep([], 12), { step: null, role: null, offset: null, equidistant: false });
});

test('scaleFromTokens groups roles of the same size, ascending', () => {
  const tokens = [{ px: 16, selector: '--text-body' }, { px: 14, selector: '--text-small' }, { px: 16, selector: '--text-body-strong' }];
  assert.deepEqual(scaleFromTokens(tokens), [[14, 'small'], [16, 'body / body-strong']]);
});

test('clusterSizes: within 1px (2px above 24px) of the first member; the most frequent is proposed', () => {
  const clusters = clusterSizes([15, 16, 16, 17, 23, 24, 24, 24, 28, 30, 31]);
  assert.deepEqual(clusters.map((c) => [c.members.map((m) => `${m.px}×${m.n}`), c.count, c.proposed]), [
    [['15×1', '16×2'], 3, 16],
    [['17×1'], 1, 17],
    [['23×1', '24×3'], 4, 24],
    [['28×1', '30×1'], 2, 28],
    [['31×1'], 1, 31],
  ]);
  assert.deepEqual(scaleFromClusters(clusters).slice(0, 2), [[16, 'cluster 15/16'], [17, 'single value']]);
  assert.deepEqual(clusterSizes([]), []);
});

test('clusterSizes: on a tie the smaller value is proposed', () => {
  assert.equal(clusterSizes([15, 16])[0].proposed, 15);
});

test('mediaWidths: min/max-width and range syntax, rem at 16px', () => {
  assert.deepEqual(mediaWidths('(min-width: 768px)'), [{ px: 768, max: false }]);
  assert.deepEqual(mediaWidths('(max-width: 56.25rem)'), [{ px: 900, max: true }]);
  assert.deepEqual(mediaWidths('(width >= 40rem) and (width < 64rem)'), [{ px: 640, max: false }, { px: 1024, max: true }]);
  assert.deepEqual(mediaWidths('(prefers-color-scheme: dark)'), []);
});

test('commonDir', () => {
  assert.equal(commonDir(['/a/b/c.css', '/a/b/d/e.css'], '/x'), '/a/b');
  assert.equal(commonDir(['/a/b/c.css'], '/x'), '/a/b');
  assert.equal(commonDir(['/a/c.css', '/b/d.css'], '/x'), '/');
  assert.equal(commonDir([], '/x'), '/x');
});
