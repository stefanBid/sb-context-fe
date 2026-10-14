import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseBlocker, daysSince, view, upsertNote, recordCheck } from '../../scripts/lib/dependency-notes.mjs';

describe('parseBlocker', () => {
  test('splits package, range and owner', () => {
    const cases = {
      'vue@^3.5:upstream': { package: 'vue', range: '^3.5', owner: 'upstream' },
      '@nuxtjs/i18n@^9.0.0:upstream': { package: '@nuxtjs/i18n', range: '^9.0.0', owner: 'upstream' },
      '@nuxtjs/i18n:project': { package: '@nuxtjs/i18n', range: null, owner: 'project' },
      'vue:project': { package: 'vue', range: null, owner: 'project' },
      'pkg@>=1 <2:upstream': { package: 'pkg', range: '>=1 <2', owner: 'upstream' },
    };
    for (const [raw, want] of Object.entries(cases)) assert.deepEqual(parseBlocker(raw), want, raw);
  });

  test('throws without a known owner', () => {
    for (const raw of ['vue', 'vue@^3', 'vue:someone', 'vue:Upstream', '']) assert.throws(() => parseBlocker(raw), /:upstream or :project/, raw);
  });
});

describe('ages', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  test('daysSince counts whole days and never goes negative', () => {
    assert.equal(daysSince('2026-10-14', now), 0);
    assert.equal(daysSince('2026-10-01', now), 13);
    assert.equal(daysSince('2027-01-01', now), 0);
  });

  test('view: a resolved note has no open days', () => {
    const n = { status: 'deferred', firstSeen: '2026-10-04', lastChecked: '2026-10-13' };
    assert.deepEqual(view(n, now), { ...n, openDays: 10, sinceLastCheckDays: 1 });
    assert.equal(view({ ...n, status: 'resolved' }, now).openDays, null);
  });
});

describe('upsertNote', () => {
  const input = { pkg: 'nuxt', target: '5.0.0', summary: 's', recheck: 'r' };

  test('creates a note with defaults', () => {
    const { notes, note } = upsertNote([], input, '2026-10-14');
    assert.deepEqual(note, {
      id: 'nuxt@5.0.0', package: 'nuxt', current: null, target: '5.0.0', status: 'deferred', summary: 's',
      blockedBy: [], recheck: 'r', links: [], firstSeen: '2026-10-14', lastChecked: '2026-10-14', history: [],
    });
    assert.deepEqual(notes, [note]);
  });

  test('replaces the note with the same id in place, keeping first-seen, history and current', () => {
    const other = { id: 'vue@4.0.0' };
    const prev = { id: 'nuxt@5.0.0', current: '4.0.0', firstSeen: '2026-01-01', history: [{ date: '2026-02-01', text: 'x' }] };
    const { notes, note } = upsertNote([prev, other], { ...input, summary: 'new', status: 'watching' }, '2026-10-14');
    assert.deepEqual(notes.map((n) => n.id), ['nuxt@5.0.0', 'vue@4.0.0']);
    assert.equal(note.firstSeen, '2026-01-01');
    assert.equal(note.current, '4.0.0');
    assert.equal(note.status, 'watching');
    assert.deepEqual(note.history, prev.history);
    assert.equal(upsertNote([prev], { ...input, current: '4.2.0' }, 'd').note.current, '4.2.0');
  });

  test('rejects resolved and unknown statuses, and bad blockers', () => {
    assert.throws(() => upsertNote([], { ...input, status: 'resolved' }, 'd'), /deferred or watching/);
    assert.throws(() => upsertNote([], { ...input, status: 'later' }, 'd'), /deferred or watching/);
    assert.throws(() => upsertNote([], { ...input, blockedBy: ['vue'] }, 'd'), /:upstream or :project/);
  });

  test('does not mutate the list it receives', () => {
    const notes = [];
    upsertNote(notes, input, 'd');
    assert.deepEqual(notes, []);
  });
});

describe('recordCheck', () => {
  const fresh = () => ({ id: 'a@1', status: 'deferred', lastChecked: '2026-01-01', history: [] });

  test('touch: updates lastChecked, appends text only when given', () => {
    const n = recordCheck(fresh(), {}, '2026-10-14');
    assert.equal(n.lastChecked, '2026-10-14');
    assert.deepEqual(n.history, []);
    assert.deepEqual(recordCheck(n, { text: 'x' }, '2026-10-15').history, [{ date: '2026-10-15', text: 'x' }]);
    assert.equal(n.status, 'deferred');
  });

  test('resolve: needs a text, closes the note', () => {
    assert.throws(() => recordCheck(fresh(), { resolve: true }, 'd'), /needs --resolution/);
    const n = recordCheck(fresh(), { text: 'updated', resolve: true }, '2026-10-14');
    assert.equal(n.status, 'resolved');
    assert.equal(n.resolvedAt, '2026-10-14');
    assert.equal(n.resolution, 'updated');
  });

  test('a note without history gets one', () => {
    const n = { id: 'a@1', status: 'deferred' };
    assert.deepEqual(recordCheck(n, { text: 't' }, 'd').history, [{ date: 'd', text: 't' }]);
  });
});
