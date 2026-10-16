import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, SCRIPTS } from '../helpers/fixture.mjs';

const today = new Date().toISOString().slice(0, 10);
const FILE = '.sb-context/github.json';

describe('github-settings.mjs', () => {
  let p;
  const gs = (...args) => p.run(SCRIPTS.githubSettings, args);
  beforeEach(() => (p = makeProject()));
  afterEach(() => p.cleanup());

  test('get and status on a project without the file write nothing', () => {
    assert.deepEqual(gs('get').json(), {});
    assert.equal(gs('get', 'repo.slug').json(), null);
    const s = gs('status').json();
    assert.equal(s.exists, false);
    assert.equal(s.file, FILE);
    assert.deepEqual(s.signature, { asked: false });
    assert.equal(s.missing.length, 6);
    assert.equal(p.exists('.sb-context'), false);
  });

  test('set saves the signature; "no" is stored too', () => {
    const r = gs('set', 'signature', '{"enabled":false,"name":null}');
    assert.equal(r.code, 0);
    assert.deepEqual(p.json(FILE), { signature: { enabled: false, name: null } });
    assert.deepEqual(gs('status').json().signature, { asked: true, enabled: false, name: null });
  });

  test('set refuses signing without a name and cache keys, and writes nothing', () => {
    assert.match(gs('set', 'signature', '{"enabled":true}').stderr, /without a name/);
    assert.match(gs('set', 'labels', '["feat"]').stderr, /use refresh/);
    assert.equal(p.exists(FILE), false);
  });

  test('refresh stores the cache, stamps the key and prints the diff', () => {
    let r = gs('refresh', 'labels', '["feat","fix","chore"]');
    assert.equal(r.code, 0);
    assert.deepEqual(r.json(), { refreshed: 'labels', file: FILE, status: 'new' });

    r = gs('refresh', 'labels', '["feat","fix","docs"]');
    assert.deepEqual(r.json(), { refreshed: 'labels', file: FILE, status: 'changed', added: ['docs'], removed: ['chore'] });

    assert.equal(gs('refresh', 'labels', '["feat","fix","docs"]').json().status, 'same');
    const data = p.json(FILE);
    assert.deepEqual(data.labels, ['feat', 'fix', 'docs']);
    assert.deepEqual(data.checked, { labels: today });
    assert.equal(data.checkedAt, today);
  });

  test('refresh never touches the preferences', () => {
    gs('set', 'signature', '{"enabled":true,"name":"Ada"}');
    gs('set', 'defaults.draftPrs', 'true');
    gs('refresh', 'repo', '{"slug":"a/b","defaultBranch":"main"}');
    gs('refresh', 'rulesets', '[{"id":1,"name":"main-protected","requiredChecks":["build","lint-pr-title"]}]');
    const data = p.json(FILE);
    assert.deepEqual(data.signature, { enabled: true, name: 'Ada' });
    assert.deepEqual(data.defaults, { draftPrs: true });
    assert.match(gs('refresh', 'signature.enabled', 'false').stderr, /use set/);
  });

  test('a refresh of a ruleset reports the added required check', () => {
    gs('refresh', 'rulesets', '[{"id":1,"name":"main-protected","requiredChecks":["build"]}]');
    const r = gs('refresh', 'rulesets', '[{"id":1,"name":"main-protected","requiredChecks":["build","lint-pr-title"]}]').json();
    assert.equal(r.status, 'changed');
    assert.deepEqual(r.added[0].requiredChecks, ['build', 'lint-pr-title']);
    assert.deepEqual(r.removed[0].requiredChecks, ['build']);
  });

  test('status reports stale keys from an old snapshot', () => {
    p.write(FILE, { labels: ['feat'], repo: { slug: 'a/b' }, checked: { labels: '2020-01-01', repo: today }, checkedAt: today });
    const s = gs('status').json();
    assert.deepEqual(s.stale, ['labels']);
    assert.equal(s.cache.repo.ageDays, 0);
  });

  test('a token is never written', () => {
    const r = gs('refresh', 'repo', JSON.stringify({ slug: 'a/b', token: `gho_${'x'.repeat(36)}` }));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /GitHub token/);
    assert.equal(p.exists(FILE), false);
  });

  test('a corrupted file is reported, never overwritten', () => {
    for (const bad of ['{ not json', '[1,2]']) {
      p.write(FILE, bad);
      assert.equal(gs('get').code, 2);
      assert.equal(gs('refresh', 'labels', '[]').code, 2);
      assert.equal(p.read(FILE), bad);
    }
  });

  test('github.json stays out of git through the folder\'s .gitignore; the git exclude is not touched', () => {
    gs('set', 'signature', '{"enabled":false,"name":null}');
    gs('refresh', 'labels', '[]');
    assert.match(p.read('.sb-context/.gitignore'), /^github\.json$/m);
    assert.equal(p.exists('.git/info/exclude'), false);
  });

  test('missing arguments and unknown commands print the usage', () => {
    assert.equal(gs('set', 'signature').code, 2);
    assert.equal(gs('refresh').code, 2);
    const r = gs('purge');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Usage/);
  });
});

test('github-settings.mjs refuses to run outside a Nuxt or Vue project', () => {
  const p = makeProject({}, { nuxtConfig: false });
  try {
    const r = p.run(SCRIPTS.githubSettings, ['status']);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Not inside a Nuxt or Vue project/);
  } finally {
    p.cleanup();
  }
});
