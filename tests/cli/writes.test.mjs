import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { makeProject, withExampleStyle, run, SCRIPTS, EXAMPLE_CSS, onWindows } from '../helpers/fixture.mjs';
import { extract, tokens } from '../helpers/design.mjs';

// Every file of the project (node_modules link excluded) with a hash of its content.
function tree(root) {
  const out = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === 'node_modules') continue;
      if (lstatSync(p).isDirectory()) walk(p);
      else out[relative(root, p).replaceAll('\\', '/')] = createHash('sha1').update(readFileSync(p)).digest('hex');
    }
  };
  walk(root);
  return out;
}
/** The paths a command created, changed or removed. */
function changed(p, fn) {
  const before = tree(p.root);
  fn();
  const after = tree(p.root);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => before[k] !== after[k]).sort();
}

const PAGE = '<template>\n  <main>\n    <h1 class="text-4xl text-gray-700">{{ $t(\'home.title\') }}</h1>\n    <p class="sb-body">Ciao</p>\n  </main>\n</template>\n';

describe('what the scripts write', () => {
  let p;
  beforeEach(() => {
    p = withExampleStyle(makeProject({ 'app/pages/index.vue': PAGE, 'i18n/locales/it.json': { home: { title: 'x' } } }));
    extract(p);
  });
  afterEach(() => p.cleanup());

  test('read-only commands change nothing', () => {
    const commands = [
      [SCRIPTS.inventory, []],
      [SCRIPTS.inventory, ['--classes']],
      [SCRIPTS.template, ['--summary']],
      [SCRIPTS.template, ['app/pages/index.vue']],
      [SCRIPTS.contrast, ['app/assets/css/theme.css', '--prefix', 'sb', '--json']],
      [SCRIPTS.checkI18n, ['app']],
      [SCRIPTS.syncValues, []],
      [SCRIPTS.syncValues, ['--check']],
      [SCRIPTS.syncValues, ['--json']],
      [SCRIPTS.renamePrefix, ['--to', 'ps']],
      [SCRIPTS.projectSettings, ['detect']],
      [SCRIPTS.projectSettings, ['get']],
      [SCRIPTS.dependencyNotes, ['list']],
    ];
    for (const [script, args] of commands) assert.deepEqual(changed(p, () => p.run(script, args)), [], `${script.split('/').pop()} ${args.join(' ')}`);
  });

  test('--out writes only the file it names', () => {
    assert.deepEqual(changed(p, () => p.run(SCRIPTS.inventory, ['--out', 'inv.json'])), ['inv.json']);
    assert.deepEqual(changed(p, () => p.run(SCRIPTS.template, ['--summary', '--out', 'tpl.json'])), ['tpl.json']);
  });

  test('settings, notes and the role map stay in .sb-context-nuxt', () => {
    const all = [
      ...changed(p, () => p.run(SCRIPTS.projectSettings, ['set', 'i18n.enabled', 'true'])),
      ...changed(p, () => p.run(SCRIPTS.dependencyNotes, ['add', 'nuxt', '--target', '5.0.0', '--summary', 's', '--recheck', 'r'])),
      ...changed(p, () => p.run(SCRIPTS.dependencyNotes, ['resolve', 'nuxt@5.0.0', '--resolution', 'done'])),
      ...changed(p, () => p.run(SCRIPTS.syncValues, ['--record'])),
      ...changed(p, () => p.run(SCRIPTS.syncValues, ['--map', 'colors.bg=bg'])),
    ];
    assert.deepEqual([...new Set(all)].sort(), ['.sb-context-nuxt/dependency-notes.json', '.sb-context-nuxt/design-applied.json', '.sb-context-nuxt/design-map.json', '.sb-context-nuxt/project-settings.json']);
  });

  test('a design extraction writes only the snapshot, its previous version and the git exclude', { todo: onWindows('.sb-context-nuxt/ is never added to .git/info/exclude (startsWith(dir + "/"))') }, () => {
    const t = tokens();
    t.color.tokens[0].value.light = '#000000';
    p.write('.git/info/exclude', '');
    assert.deepEqual(changed(p, () => extract(p, t)), ['.git/info/exclude', '.sb-context-nuxt/design-source.md', '.sb-context-nuxt/design-source.prev.md', 'design/tokens.json']);
  });

  test('sync-values --apply edits only theme.css and typography.css, plus its record', () => {
    const t = tokens();
    t.color.tokens.find((c) => c.name === 'primary').value.light = '#123456';
    t.type.groups[0].styles[1].fontSize = '42px';
    extract(p, t);
    assert.deepEqual(changed(p, () => p.run(SCRIPTS.syncValues, ['--apply'])), ['.sb-context-nuxt/design-applied.json', 'app/assets/css/theme.css', 'app/assets/css/typography.css']);
  });

  test('rename-prefix --apply edits exactly the files its dry run listed', () => {
    const dry = p.run(SCRIPTS.renamePrefix, ['--to', 'ps']).stdout;
    const listed = [...dry.matchAll(/^\| (\S+) \| \d+ \|$/gm)].map((m) => m[1].replaceAll('\\', '/')).sort();
    assert.ok(listed.length > 1);
    assert.deepEqual(changed(p, () => p.run(SCRIPTS.renamePrefix, ['--to', 'ps', '--apply'])), listed);
  });

  test('scripts do not write outside the project', () => {
    const outside = makeProject({}, { nuxtConfig: false, modules: false });
    try {
      const before = tree(outside.root);
      p.run(SCRIPTS.syncValues, ['--apply']);
      p.run(SCRIPTS.renamePrefix, ['--to', 'ps', '--apply']);
      run(SCRIPTS.contrast, [`${EXAMPLE_CSS}/theme.css`, '--json']);
      assert.deepEqual(tree(outside.root), before);
    } finally {
      outside.cleanup();
    }
  });
});
