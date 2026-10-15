import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setPreference, refreshCache, diffValue, status, PREFERENCES, CACHE, STALE_DAYS } from '../../scripts/lib/github-settings.mjs';

const DAY = 86400000;
const NOW = Date.parse('2026-10-15');

describe('preferences', () => {
  test('setPreference sets a dotted key and leaves the cache alone', () => {
    const d = setPreference({ labels: ['feat'] }, 'defaults.draftPrs', true);
    assert.deepEqual(d, { labels: ['feat'], defaults: { draftPrs: true } });
  });

  test('signing needs a name, and enabled must be a boolean', () => {
    assert.throws(() => setPreference({}, 'signature', { enabled: true, name: null }), /without a name/);
    assert.throws(() => setPreference({}, 'signature', { enabled: true, name: '  ' }), /without a name/);
    assert.throws(() => setPreference({}, 'signature', { enabled: 'yes' }), /true or false/);
    assert.throws(() => setPreference({ signature: { enabled: false, name: null } }, 'signature.enabled', true), /without a name/);
    assert.deepEqual(setPreference({}, 'signature', { enabled: false, name: null }).signature, { enabled: false, name: null });
    assert.deepEqual(setPreference({ signature: { enabled: false, name: 'Ada' } }, 'signature.enabled', true).signature, { enabled: true, name: 'Ada' });
  });

  test('a cache key is refused, pointing to refresh', () => {
    assert.throws(() => setPreference({}, 'labels', ['x']), /"labels" is cache: use refresh/);
    assert.throws(() => setPreference({}, 'whatever', 1), /not a preference key/);
  });
});

describe('cache', () => {
  test('refreshCache stores the value and stamps that key and checkedAt', () => {
    const d = { signature: { enabled: false, name: null } };
    const diff = refreshCache(d, 'labels', ['feat', 'fix'], '2026-10-15');
    assert.deepEqual(diff, { status: 'new' });
    assert.deepEqual(d.labels, ['feat', 'fix']);
    assert.deepEqual(d.checked, { labels: '2026-10-15' });
    assert.equal(d.checkedAt, '2026-10-15');
    assert.deepEqual(d.signature, { enabled: false, name: null });
  });

  test('a dotted refresh stamps its top-level key', () => {
    const d = { repo: { slug: 'a/b', defaultBranch: 'master' }, checked: { repo: '2026-01-01', labels: '2026-01-01' } };
    const diff = refreshCache(d, 'repo.defaultBranch', 'main', '2026-10-15');
    assert.deepEqual(diff, { status: 'changed', before: 'master', after: 'main' });
    assert.deepEqual(d.repo, { slug: 'a/b', defaultBranch: 'main' });
    assert.deepEqual(d.checked, { repo: '2026-10-15', labels: '2026-01-01' });
  });

  test('a preference key is refused, pointing to set', () => {
    assert.throws(() => refreshCache({}, 'signature.enabled', true, 'd'), /"signature" is a preference: use set/);
    assert.throws(() => refreshCache({}, 'checkedAt', 'd', 'd'), /not a cache key/);
  });

  test('values that look like GitHub tokens are refused anywhere in the value', () => {
    const tok = `ghp_${'a'.repeat(36)}`;
    assert.throws(() => refreshCache({}, 'repo', { slug: 'a/b', note: tok }, 'd'), /looks like a GitHub token/);
    assert.throws(() => refreshCache({}, 'labels', [`github_pat_${'A1_'.repeat(10)}`], 'd'), /GitHub token/);
    assert.throws(() => setPreference({}, 'signature', { enabled: true, name: tok }), /GitHub token/);
    assert.doesNotThrow(() => refreshCache({}, 'labels', ['ghp_short', 'gh-pages'], 'd'));
  });
});

describe('diffValue', () => {
  test('lists: added and removed items, objects compared by value', () => {
    assert.deepEqual(diffValue(['feat', 'fix'], ['feat', 'docs']), { status: 'changed', added: ['docs'], removed: ['fix'] });
    assert.deepEqual(diffValue([{ id: 1, n: 'a' }], [{ id: 1, n: 'a' }]), { status: 'same' });
    assert.deepEqual(diffValue([{ id: 1, n: 'a' }], [{ id: 1, n: 'b' }]), { status: 'changed', added: [{ id: 1, n: 'b' }], removed: [{ id: 1, n: 'a' }] });
  });

  test('objects: changed keys with before and after', () => {
    assert.deepEqual(diffValue({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }), { status: 'changed', changed: { b: { before: 2, after: 3 }, c: { before: null, after: 4 } } });
  });

  test('new, same and a change of shape', () => {
    assert.deepEqual(diffValue(undefined, 1), { status: 'new' });
    assert.deepEqual(diffValue(null, null), { status: 'same' });
    assert.deepEqual(diffValue(['a'], { a: 1 }), { status: 'changed', before: ['a'], after: { a: 1 } });
  });
});

describe('status', () => {
  test('an empty file: signature not asked, everything missing, nothing stale', () => {
    const s = status({}, NOW);
    assert.deepEqual(s.signature, { asked: false });
    assert.deepEqual(s.missing, CACHE);
    assert.deepEqual(s.stale, []);
    assert.equal(s.staleAfterDays, STALE_DAYS);
  });

  test('age per key; stale after STALE_DAYS', () => {
    const fresh = new Date(NOW - STALE_DAYS * DAY).toISOString().slice(0, 10);
    const old = new Date(NOW - (STALE_DAYS + 1) * DAY).toISOString().slice(0, 10);
    const s = status({ signature: { enabled: false, name: null }, labels: [], repo: {}, checked: { labels: fresh, repo: old } }, NOW);
    assert.deepEqual(s.signature, { asked: true, enabled: false, name: null });
    assert.equal(s.cache.labels.ageDays, STALE_DAYS);
    assert.equal(s.cache.labels.stale, false);
    assert.equal(s.cache.repo.stale, true);
    assert.deepEqual(s.stale, ['repo']);
    assert.deepEqual(s.missing, CACHE.filter((k) => !['labels', 'repo'].includes(k)));
  });

  test('a file written before per-key stamps falls back to checkedAt, or is stale without it', () => {
    assert.equal(status({ labels: [], checkedAt: '2026-10-14' }, NOW).cache.labels.ageDays, 1);
    assert.deepEqual(status({ labels: [] }, NOW).stale, ['labels']);
  });

  test('preference and cache keys do not overlap', () => {
    assert.deepEqual(PREFERENCES.filter((k) => CACHE.includes(k)), []);
  });
});
