import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, SCRIPTS } from '../helpers/fixture.mjs';

/** A project as sb-context-nuxt 0.6 left it. */
const legacyProject = (extra = {}) =>
  makeProject({
    '.sb-context-nuxt/project-settings.json': { version: 1, style: { prefix: 'sb' } },
    '.sb-context-nuxt/github_settings.json': { signature: { enabled: false, name: null } },
    '.sb-context-nuxt/design-source.md': '# snapshot',
    '.git/info/exclude': '# local\n.sb-context-nuxt/\n*.log\n',
    'CLAUDE.md': 'Use /sb-context-nuxt:style-align and read .sb-context-nuxt/project-settings.json.\n',
    '.claude/settings.json': { enabledPlugins: { 'sb-context-nuxt@sb-context-nuxt': true } },
    'app/pages/index.vue': '<!-- /sb-context-nuxt:style-align is not rewritten in code -->\n',
    ...extra,
  });

describe('migrate-v1.mjs', () => {
  let p;
  const migrate = (...args) => p.run(SCRIPTS.migrate, args);
  afterEach(() => p?.cleanup());

  test('the plan lists moves, the exclude line and the references, and writes nothing', () => {
    p = legacyProject();
    const r = migrate();
    assert.equal(r.code, 0);
    const plan = r.json();
    assert.equal(plan.status, 'plan');
    assert.deepEqual(
      plan.moves.map((m) => `${m.from} → ${m.to}`),
      ['.sb-context-nuxt/design-source.md → .sb-context/design-source.md', '.sb-context-nuxt/github_settings.json → .sb-context/github.json', '.sb-context-nuxt/project-settings.json → .sb-context/settings.json'],
    );
    assert.deepEqual(plan.gitExclude, { file: '.git/info/exclude', linesToRemove: 1 });
    assert.deepEqual(plan.refs.map((x) => x.file).sort(), ['.claude/settings.json', 'CLAUDE.md']);
    assert.equal(p.exists('.sb-context'), false);
    assert.equal(p.exists('.sb-context-nuxt/project-settings.json'), true);
  });

  test('--apply moves the folder, renames the files, fixes the exclude, leaves the references', () => {
    p = legacyProject();
    const r = migrate('--apply');
    assert.equal(r.code, 0, r.stderr);
    const out = r.json();
    assert.equal(out.status, 'migrated');
    assert.equal(p.exists('.sb-context-nuxt'), false);
    assert.deepEqual(p.json('.sb-context/settings.json'), { version: 1, style: { prefix: 'sb' } });
    assert.equal(p.exists('.sb-context/github.json'), true);
    assert.equal(p.read('.sb-context/design-source.md'), '# snapshot');
    assert.match(p.read('.sb-context/.gitignore'), /^github\.json$/m);
    assert.equal(p.read('.git/info/exclude'), '# local\n*.log\n');
    assert.match(p.read('CLAUDE.md'), /sb-context-nuxt:style-align/, 'references need --refs');
    assert.equal(out.refsLeft.length, 2);
  });

  test('--apply --refs also rewrites docs and Claude settings, never the source code', () => {
    p = legacyProject();
    assert.equal(migrate('--apply', '--refs').code, 0);
    assert.equal(p.read('CLAUDE.md'), 'Use /sb-design:align and read .sb-context/settings.json.\n');
    assert.deepEqual(p.json('.claude/settings.json'), { enabledPlugins: { 'sb-context-fe@sb-context-fe': true } });
    assert.match(p.read('app/pages/index.vue'), /sb-context-nuxt:style-align/);
  });

  test('after the migration the other scripts run again', () => {
    p = legacyProject();
    assert.equal(p.run(SCRIPTS.projectSettings, ['get']).code, 2, 'refused before');
    migrate('--apply');
    const r = p.run(SCRIPTS.projectSettings, ['get', 'style.prefix']);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.json(), 'sb');
  });

  test('a file .sb-context/ already has is a conflict: nothing is written', () => {
    p = legacyProject({ '.sb-context/settings.json': { version: 1 } });
    const r = migrate('--apply');
    assert.equal(r.code, 3);
    assert.deepEqual(r.json().conflicts, ['.sb-context/settings.json']);
    assert.equal(p.exists('.sb-context-nuxt/project-settings.json'), true);
    assert.deepEqual(p.json('.sb-context/settings.json'), { version: 1 });
    assert.match(p.read('.git/info/exclude'), /\.sb-context-nuxt/);
  });

  test('a project already on 1.0 has nothing to migrate', () => {
    p = makeProject({ '.sb-context/settings.json': { version: 1 } });
    const r = migrate('--apply');
    assert.equal(r.code, 0);
    assert.equal(r.json().status, 'nothing-to-migrate');
  });

  test('a worktree: the exclude line is removed from the main repository', () => {
    const main = makeProject({ '.git/info/exclude': '.sb-context-nuxt/\n', '.git/worktrees/wt/commondir': '../..\n' });
    try {
      p = makeProject({ '.sb-context-nuxt/design-source.md': '# snapshot', '.git': `gitdir: ${main.path('.git/worktrees/wt')}\n` }, { git: false });
      const r = migrate('--apply');
      assert.equal(r.code, 0, r.stderr);
      assert.equal(main.read('.git/info/exclude'), '');
    } finally {
      main.cleanup();
    }
  });

  test('usage errors', () => {
    p = legacyProject();
    assert.equal(migrate('--refs').code, 2);
    assert.equal(migrate('--force').code, 2);
  });
});
