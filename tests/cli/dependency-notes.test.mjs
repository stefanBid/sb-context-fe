import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, SCRIPTS } from '../helpers/fixture.mjs';

const today = new Date().toISOString().slice(0, 10);
const NOTES = '.sb-context/dependency-notes.json';

describe('dependency-notes.mjs', () => {
  let p;
  const notes = (...args) => p.run(SCRIPTS.dependencyNotes, args);
  const add = (...extra) => notes('add', 'nuxt', '--target', '5.0.0', '--summary', 'i18n not ready', '--recheck', 'i18n release notes', ...extra);
  beforeEach(() => (p = makeProject()));
  afterEach(() => p.cleanup());

  test('list on a project without notes is empty and writes nothing', () => {
    const r = notes('list');
    assert.equal(r.code, 0);
    assert.equal(r.json().count, 0);
    assert.equal(p.exists(NOTES), false);
  });

  test('add creates a note with id <package>@<target> and dates of today', () => {
    const r = add('--current', '4.1.0');
    assert.equal(r.code, 0);
    const note = r.json();
    assert.equal(note.id, 'nuxt@5.0.0');
    assert.equal(note.current, '4.1.0');
    assert.equal(note.status, 'deferred');
    assert.equal(note.firstSeen, today);
    assert.equal(note.lastChecked, today);
    assert.equal(note.openDays, 0);
    assert.deepEqual(p.json(NOTES).notes.map((n) => n.id), ['nuxt@5.0.0']);
  });

  test('add parses --blocked-by, including scoped packages and missing ranges', () => {
    const r = add('--blocked-by', '@nuxtjs/i18n@^9.0.0:upstream', '--blocked-by', 'vue:project', '--link', 'https://a', '--link', 'https://b');
    assert.equal(r.code, 0);
    assert.deepEqual(r.json().blockedBy, [
      { package: '@nuxtjs/i18n', range: '^9.0.0', owner: 'upstream' },
      { package: 'vue', range: null, owner: 'project' },
    ]);
    assert.deepEqual(r.json().links, ['https://a', 'https://b']);
  });

  test('add rejects a blocker without a valid owner', () => {
    for (const bad of ['vue@^3', 'vue@^3:someone']) {
      const r = add('--blocked-by', bad);
      assert.equal(r.code, 2, bad);
      assert.match(r.stderr, /:upstream or :project/);
    }
    assert.equal(p.exists(NOTES), false);
  });

  test('add rejects missing arguments and the resolved status', () => {
    assert.equal(notes('add', 'nuxt', '--target', '5.0.0').code, 2);
    assert.equal(notes('add', '--target', '5.0.0', '--summary', 's', '--recheck', 'r').code, 2);
    assert.equal(add('--status', 'resolved').code, 2);
    assert.equal(add('--status', 'whatever').code, 2);
    assert.equal(add('--status', 'watching').json().status, 'watching');
  });

  test('add on an existing id updates it in place and keeps firstSeen, current and history', () => {
    add('--current', '4.1.0');
    const data = p.json(NOTES);
    data.notes[0].firstSeen = '2020-01-01';
    data.notes[0].history = [{ date: '2020-01-02', text: 'old' }];
    p.write(NOTES, data);

    const r = notes('add', 'nuxt', '--target', '5.0.0', '--summary', 'still waiting', '--recheck', 'again');
    const note = r.json();
    assert.equal(note.firstSeen, '2020-01-01');
    assert.equal(note.current, '4.1.0');
    assert.equal(note.summary, 'still waiting');
    assert.deepEqual(note.history, [{ date: '2020-01-02', text: 'old' }]);
    assert.ok(note.openDays > 365);
    assert.equal(p.json(NOTES).notes.length, 1);
  });

  test('touch records a check and appends the note to the history', () => {
    add();
    const r = notes('touch', 'nuxt@5.0.0', '--note', 'still blocked');
    assert.equal(r.code, 0);
    assert.deepEqual(r.json().history, [{ date: today, text: 'still blocked' }]);
    assert.equal(r.json().status, 'deferred');
    // without --note: only lastChecked
    assert.equal(notes('touch', 'nuxt@5.0.0').json().history.length, 1);
  });

  test('resolve needs a resolution, closes the note and hides it from list', () => {
    add();
    assert.equal(notes('resolve', 'nuxt@5.0.0').code, 2);
    const r = notes('resolve', 'nuxt@5.0.0', '--resolution', 'updated');
    assert.equal(r.code, 0);
    const note = r.json();
    assert.equal(note.status, 'resolved');
    assert.equal(note.resolution, 'updated');
    assert.equal(note.resolvedAt, today);
    assert.equal(note.openDays, null);
    assert.equal(notes('list').json().count, 0);
    assert.equal(notes('list', '--all').json().count, 1);
  });

  test('touch/resolve on an unknown id fail and list the open ids', () => {
    add();
    const r = notes('touch', 'vue@4.0.0');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Open ones: nuxt@5\.0\.0/);
    assert.equal(notes('touch').code, 2);
  });

  test('a corrupted notes file is reported, never overwritten', () => {
    p.write(NOTES, '{ not json');
    assert.equal(notes('list').code, 2);
    assert.equal(add().code, 2);
    assert.equal(p.read(NOTES), '{ not json');
    p.write(NOTES, '{"version":1}');
    assert.match(notes('list').stderr, /no "notes" list/);
  });

  test('the notes are committable: the folder gets its .gitignore, the git exclude is not touched', () => {
    add();
    notes('touch', 'nuxt@5.0.0');
    assert.doesNotMatch(p.read('.sb-context/.gitignore'), /dependency-notes/);
    assert.equal(p.exists('.git/info/exclude'), false);
  });

  test('unknown command prints the usage', () => {
    const r = notes('purge');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Usage/);
  });
});

test('dependency-notes.mjs refuses to run outside a Nuxt project', () => {
  const p = makeProject({}, { nuxtConfig: false });
  try {
    const r = p.run(SCRIPTS.dependencyNotes, ['list']);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Not inside a Nuxt project/);
  } finally {
    p.cleanup();
  }
});
