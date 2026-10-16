import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, SCRIPTS } from '../helpers/fixture.mjs';

describe('setup-state.mjs', () => {
  let p;
  const state = (...args) => p.run(SCRIPTS.setupState, args);
  afterEach(() => p?.cleanup());

  test('a bare project: nothing known, writes nothing, recommends /sb-design:align first', () => {
    p = makeProject();
    const s = state().json();
    assert.deepEqual(s.folder, { path: '.sb-context', exists: false, gitignore: false, ignoredByProject: false, initialized: null });
    assert.equal(Object.values(s.files).some(Boolean), false);
    assert.equal(s.style.cssDir, 'assets/css');
    assert.equal(s.style.prefix, null);
    assert.equal(s.github.remote, null);
    assert.equal(s.next[0].skill, '/sb-design:align');
    assert.equal(p.exists('.sb-context'), false);
    assert.equal(p.exists('.git/info/exclude'), false);
  });

  test('--init creates the folder with its .gitignore, and never writes the git exclude', () => {
    p = makeProject();
    const s = state('--init').json();
    assert.equal(s.folder.exists, true);
    assert.equal(s.folder.gitignore, true);
    assert.equal(s.folder.initialized, 'created');
    assert.match(p.read('.sb-context/.gitignore'), /^github\.json$/m);
    assert.equal(state('--init').json().folder.initialized, 'exists');
    assert.equal(p.exists('.git/info/exclude'), false);
  });

  test('--init without git creates the folder too', () => {
    p = makeProject({}, { git: false });
    const s = state('--init').json();
    assert.equal(s.git, false);
    assert.equal(s.folder.exists, true);
    assert.equal(s.folder.initialized, 'created');
  });

  test('the project keeping the whole folder local is reported, not changed', () => {
    p = makeProject({ '.gitignore': 'node_modules\n.sb-context/\n' });
    assert.equal(state().json().folder.ignoredByProject, true);
    assert.equal(p.read('.gitignore'), 'node_modules\n.sb-context/\n');
  });

  test('a project still on sb-context-nuxt 0.x is refused until it is migrated', () => {
    p = makeProject({ '.sb-context-nuxt/project-settings.json': '{}' });
    const r = state('--init');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /\/sb-core:migration/);
    assert.equal(p.exists('.sb-context'), false);
  });

  test('an aligned project with GitHub, snapshot and checks: style read, next steps only for what is missing', () => {
    p = withExampleStyle(makeProject({
      '.github/workflows/pr-title-lint.yml': 'jobs:\n  lint-pr-title:\n    runs-on: ubuntu-latest\n',
      'release-please-config.json': '{}',
      'CLAUDE.md': '# rules',
    }));
    p.write('.git/config', '[remote "origin"]\n\turl = git@github.com:a/b.git\n');
    p.write('.sb-context/design-source.md', '# snapshot');
    p.write('.sb-context/github.json', { signature: { enabled: false, name: null } });
    p.write('.sb-context/dependency-notes.json', { version: 1, notes: [{ id: 'a@2', status: 'deferred' }, { id: 'b@2', status: 'resolved' }] });
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
    assert.deepEqual(s.next.map((n) => n.skill), ['/sb-design:align', '/sb-health:deps']);
    assert.match(s.next[0].why, /never applied/);
  });

  test('corrupted local files do not stop the report', () => {
    p = makeProject();
    p.write('.sb-context/github.json', '{ nope');
    p.write('.sb-context/dependency-notes.json', '[]');
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
