import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FILE_RENAMES, SKILL_RENAMES, newFileName, rewriteRefs, dropLegacyExclude, gitdirOf } from '../../plugins/sb-core/scripts/lib/migration.mjs';

describe('lib/migration.mjs', () => {
  test('only the settings and the GitHub file change name', () => {
    assert.deepEqual(FILE_RENAMES, { 'project-settings.json': 'settings.json', 'github_settings.json': 'github.json' });
    assert.equal(newFileName('project-settings.json'), 'settings.json');
    assert.equal(newFileName('design-source.md'), 'design-source.md');
    assert.equal(newFileName('dependency-notes.json'), 'dependency-notes.json');
  });

  test('every 0.6 skill has a 1.0 home', () => {
    assert.equal(Object.keys(SKILL_RENAMES).length, 14);
    for (const to of Object.values(SKILL_RENAMES)) assert.match(to, /^sb-(core|github|health|design):[a-z-]+$/);
  });

  test('rewriteRefs: commands, plugin id, folder and renamed files, counted', () => {
    const src = [
      'Run /sb-context-nuxt:style-align, then /sb-context-nuxt:design-extract-ui.',
      'Also sb-context-nuxt:full-checkup weekly.',
      '"enabledPlugins": { "sb-context-nuxt@sb-context-nuxt": true }',
      'Settings: .sb-context-nuxt/project-settings.json and .sb-context-nuxt/github_settings.json',
      'Snapshot: .sb-context-nuxt/design-source.md; the folder .sb-context-nuxt is local.',
    ].join('\n');
    const { text, changes } = rewriteRefs(src);
    assert.equal(
      text,
      [
        'Run /sb-design:align, then /sb-design:extract-ui.',
        'Also sb-health:checkup weekly.',
        '"enabledPlugins": { "sb-context-fe@sb-context-fe": true }',
        'Settings: .sb-context/settings.json and .sb-context/github.json',
        'Snapshot: .sb-context/design-source.md; the folder .sb-context is local.',
      ].join('\n'),
    );
    const byChange = Object.fromEntries(changes.map((c) => [c.change, c.times]));
    assert.equal(byChange['/sb-context-nuxt:style-align → /sb-design:align'], 1);
    assert.equal(byChange['.sb-context-nuxt → .sb-context'], 2);
  });

  test('rewriteRefs leaves unrelated text alone, and is idempotent', () => {
    const plain = 'nothing about sb-context-nuxt-like names: sb-context-nuxtish, my-setup';
    assert.deepEqual(rewriteRefs('just text'), { text: 'just text', changes: [] });
    const once = rewriteRefs('/sb-context-nuxt:setup').text;
    assert.equal(once, '/sb-core:setup');
    assert.deepEqual(rewriteRefs(once).changes, []);
    assert.equal(rewriteRefs(plain).text, plain);
  });

  test('dropLegacyExclude removes both spellings and keeps every other line', () => {
    assert.deepEqual(dropLegacyExclude('# local\n.sb-context-nuxt/\n*.log\n/.sb-context-nuxt\n'), { text: '# local\n*.log\n', removed: 2 });
    assert.deepEqual(dropLegacyExclude('*.log\n'), { text: '*.log\n', removed: 0 });
  });

  test('gitdirOf reads a worktree .git file', () => {
    assert.equal(gitdirOf('gitdir: /repo/.git/worktrees/x\n'), '/repo/.git/worktrees/x');
    assert.equal(gitdirOf('nonsense'), null);
  });
});
