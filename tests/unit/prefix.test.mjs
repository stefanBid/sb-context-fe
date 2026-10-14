import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESERVED, prefixError, suggestPrefix, prefixFromUtilities } from '../../scripts/lib/prefix.mjs';

test('prefixError accepts 2–4 lowercase letters or digits starting with a letter', () => {
  for (const ok of ['ps', 'sb', 'abcd', 'a1', 'x2y3']) assert.equal(prefixError(ok), null, ok);
});

test('prefixError rejects bad shapes and Tailwind roots', () => {
  for (const bad of ['p', 'abcde', 'Ps', '1a', 'p-s', 'p_s', '', 'ps ']) assert.match(prefixError(bad), /not a valid prefix/, bad);
  for (const root of ['bg', 'text', 'ring', 'flex', 'sr']) assert.match(prefixError(root), /Tailwind utility root/, root);
});

test('suggestPrefix from the design name', () => {
  const cases = {
    PraticaSicura: 'ps',
    'Sample Brand': 'sb',
    'My Big Fancy Design System': 'mbfd',
    Acme: 'ac',
    P: 'px',
    'Été': 'tx',
    'Bold Grid': 'bgo',
    'B G': 'bgx',
    Sr: 'srr',
    'ACME corp': 'ac',
  };
  for (const [name, want] of Object.entries(cases)) assert.equal(suggestPrefix(name), want, name);
});

test('suggestPrefix has no proposal without letters', () => {
  for (const name of [null, undefined, '', '123', '---']) assert.equal(suggestPrefix(name), null, String(name));
});

test('every suggested prefix is a valid one', () => {
  const words = ['Acme', 'bg', 'Text', 'Ring', 'Sr', 'Grid', 'Flow', 'Été', 'x', 'Design', 'System', 'Ö', 'Studio', 'B', 'G', 'P', 'M'];
  for (const a of words) for (const b of ['', ...words]) for (const c of ['', 'Brand']) {
    const name = [a, b, c].filter(Boolean).join(' ');
    const p = suggestPrefix(name);
    if (p !== null) assert.equal(prefixError(p), null, `${name} → ${p}`);
  }
  assert.ok(RESERVED.has('bg'));
});

test('prefixFromUtilities reads <p>-h1 or <p>-body', () => {
  assert.equal(prefixFromUtilities(['sb-card', 'sb-h1']), 'sb');
  assert.equal(prefixFromUtilities(new Set(['ps-body', 'x'])), 'ps');
  assert.equal(prefixFromUtilities(['sb-h1x', 'title-h1', 'toolong-h1']), null);
  assert.equal(prefixFromUtilities([]), null);
});
