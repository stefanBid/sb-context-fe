import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, SCRIPTS } from '../helpers/fixture.mjs';

describe('setup-state.mjs', () => {
  let p;
  const state = (...args) => p.run(SCRIPTS.setupState, args);
  afterEach(() => p?.cleanup());

  test('a bare project: nothing known, writes nothing, recommends style-align first', () => {
    p = makeProject();
    const s = state().json();
    assert.deepEqual(s.folder, { path: '.sb-context-nuxt', exists: false, excluded: false, initialized: null });
    assert.equal(Object.values(s.files).some(Boolean), false);
    assert.equal(s.style.cssDir, 'assets/css');
    assert.equal(s.style.prefix, null);
    assert.equal(s.github.remote, null);
    assert.equal(s.next[0].skill, 'style-align');
    assert.equal(p.exists('.sb-context-nuxt'), false);
    assert.equal(p.exists('.git/info/exclude'), false);
  });

  test('--init creates the folder and excludes it from git, once', () => {
    p = makeProject();
    const s = state('--init').json();
    assert.equal(s.folder.exists, true);
    assert.equal(s.folder.excluded, true);
    assert.equal(s.folder.initialized, 'added to .git/info/exclude');
    state('--init');
    assert.equal(p.read('.git/info/exclude').split('\n').filter((l) => l === '.sb-context-nuxt/').length, 1);
  });

  test('--init without git creates the folder and says so', () => {
    p = makeProject({}, { git: false });
    const s = state('--init').json();
    assert.equal(s.git, false);
    assert.equal(s.folder.exists, true);
    assert.equal(s.folder.initialized, 'not a git repo');
  });

  test('an aligned project with GitHub, snapshot and checks: style read, next steps only for what is missing', () => {
    p = withExampleStyle(makeProject({
      '.github/workflows/pr-title-lint.yml': 'jobs:\n  lint-pr-title:\n    runs-on: ubuntu-latest\n',
      'release-please-config.json': '{}',
      'CLAUDE.md': '# rules',
    }));
    p.write('.git/config', '[remote "origin"]\n\turl = git@github.com:a/b.git\n');
    p.write('.sb-context-nuxt/design-source.md', '# snapshot');
    p.write('.sb-context-nuxt/github_settings.json', { signature: { enabled: false, name: null } });
    p.write('.sb-context-nuxt/dependency-notes.json', { version: 1, notes: [{ id: 'a@2', status: 'deferred' }, { id: 'b@2', status: 'resolved' }] });
    const s = state().json();
    assert.equal(s.style.cssDir, 'app/assets/css');
    assert.equal(Object.values(s.style.files).every(Boolean), true);
    assert.equal(s.style.prefix, 'sb');
    assert.equal(s.github.remote, 'git@github.com:a/b.git');
    assert.equal(s.github.signatureAsked, true);
    assert.equal(s.github.prTitleLint, true);
    assert.equal(s.github.releasePlease, true);
    assert.equal(s.dependencyNotes.open, 1);
    assert.equal(s.docs['CLAUDE.md'], true);
    assert.deepEqual(s.next.map((n) => n.skill), ['style-align', 'dependency-check']);
    assert.match(s.next[0].why, /never applied/);
  });

  test('corrupted local files do not stop the report', () => {
    p = makeProject();
    p.write('.sb-context-nuxt/github_settings.json', '{ nope');
    p.write('.sb-context-nuxt/dependency-notes.json', '[]');
    const r = state();
    assert.equal(r.code, 0);
    assert.equal(r.json().github.signatureAsked, false);
    assert.equal(r.json().dependencyNotes.open, 0);
  });

  test('an unknown argument prints the usage', () => {
    p = makeProject();
    const r = state('--force');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Usage/);
  });
});

test('setup-state.mjs refuses to run outside a Nuxt project', () => {
  const p = makeProject({}, { nuxtConfig: false });
  try {
    const r = p.run(SCRIPTS.setupState, []);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Not inside a Nuxt project/);
  } finally {
    p.cleanup();
  }
});
