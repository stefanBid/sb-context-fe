import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPrefix, prefixInUse, utilityNames, renamer } from '../../plugins/sb-design/skills/align/scripts/lib/rename.mjs';

const CSS = `/* Prefix "sb". */
:root { --sb-bg: #fff; --sb-body-size: 1rem; }
@utility sb-body { font-size: var(--sb-body-size); }
@utility sb-body-strong { @apply sb-body; font-weight: 600; }
@utility sb-h1 { margin: 0; }
`;

test('detectPrefix, prefixInUse, utilityNames', () => {
  assert.equal(detectPrefix(CSS), 'sb');
  assert.equal(detectPrefix('@utility card-title {}'), null);
  assert.equal(prefixInUse(CSS, 'sb'), true);
  assert.equal(prefixInUse(CSS, 'ps'), false);
  assert.equal(prefixInUse('@utility ps-x {}', 'ps'), true);
  assert.deepEqual(utilityNames(CSS, 'sb'), ['body', 'body-strong', 'h1']);
});

test('renames variables, utilities and the header, counting each replacement', () => {
  const { rename } = renamer('sb', 'ps', utilityNames(CSS, 'sb'));
  const { out, n } = rename(CSS);
  assert.equal(out, CSS.replaceAll('sb', 'ps'));
  assert.equal(n, 8); // header, 3 variables, 4 utilities
});

test('longest utility first, variants kept, partial names and other words untouched', () => {
  const { rename, others } = renamer('sb', 'ps', ['body', 'body-strong', 'h1']);
  const src = '<p class="sb-body-strong lg:sb-h1 hover:sb-body sb-h1x sb-card xsb-h1 my-sb-h1">';
  const { out, n } = rename(src);
  assert.equal(out, '<p class="ps-body-strong lg:ps-h1 hover:ps-body sb-h1x sb-card xsb-h1 my-sb-h1">');
  assert.equal(n, 3);
  assert.deepEqual(others(out), ['sb-h1x', 'sb-card']);
});

test('variables need the double dash and a word boundary before it', () => {
  const { rename } = renamer('sb', 'ps', ['h1']);
  assert.equal(rename('a: var(--sb-x); b: var(--xsb-y); c: var(---sb-z)').out, 'a: var(--ps-x); b: var(--xsb-y); c: var(---sb-z)');
});

test('the header is matched in any case, only with the exact prefix', () => {
  const { rename } = renamer('sb', 'ps', ['h1']);
  assert.equal(rename('prefix "sb" · Prefix "sbx"').out, 'prefix "ps" · Prefix "sbx"');
});
