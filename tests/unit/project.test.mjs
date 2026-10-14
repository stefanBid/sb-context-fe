import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { isNuxtRoot, findProjectRoot, srcDirOf, cssDirOf, pluginDirOf, excludePluginDir, relPath, isInside } from '../../scripts/lib/project.mjs';
import { makeProject } from '../helpers/fixture.mjs';

describe('lib/project.mjs', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('isNuxtRoot: a nuxt.config.* or a package.json that depends on nuxt', () => {
    p = makeProject({}, { nuxtConfig: false, git: false, modules: false });
    assert.equal(isNuxtRoot(p.root), false);
    p.write('package.json', { dependencies: { vue: '^3' } });
    assert.equal(isNuxtRoot(p.root), false);
    p.write('package.json', { devDependencies: { nuxt: '^4' } });
    assert.equal(isNuxtRoot(p.root), true);
    p.write('package.json', '{ broken');
    assert.equal(isNuxtRoot(p.root), false);
    p.write('nuxt.config.mjs', '');
    assert.equal(isNuxtRoot(p.root), true);
  });

  test('findProjectRoot walks up from a nested folder, and returns null outside', () => {
    p = makeProject({ 'app/components/deep/x.txt': '' });
    assert.equal(findProjectRoot(p.path('app/components/deep')), p.root);
    const outside = makeProject({ 'a/b/c.txt': '' }, { nuxtConfig: false });
    try {
      assert.equal(findProjectRoot(outside.path('a/b')), null);
    } finally {
      outside.cleanup();
    }
  });

  test('srcDirOf: config srcDir, else app/ when present, else the root', () => {
    p = makeProject();
    assert.equal(srcDirOf(p.root), p.root);
    mkdirSync(p.path('app'));
    assert.equal(srcDirOf(p.root), p.path('app'));
    assert.equal(cssDirOf(p.root), p.path('app/assets/css'));
    p.write('nuxt.config.ts', "export default defineNuxtConfig({ srcDir: 'src/' })");
    assert.equal(srcDirOf(p.root), p.path('src'));
    assert.equal(pluginDirOf(p.root), p.path('.sb-context-nuxt'));
  });

  test('excludePluginDir appends once, on its own line', () => {
    p = makeProject();
    p.write('.git/info/exclude', '# local\n*.log');
    assert.equal(excludePluginDir(p.root), 'added to .git/info/exclude');
    excludePluginDir(p.root);
    assert.equal(p.read('.git/info/exclude'), '# local\n*.log\n.sb-context-nuxt/\n');
  });

  test('excludePluginDir creates .git/info when missing and skips non-git folders', () => {
    p = makeProject({}, { git: false });
    assert.equal(excludePluginDir(p.root), 'not a git repo');
    mkdirSync(p.path('.git'));
    excludePluginDir(p.root);
    assert.equal(p.read('.git/info/exclude'), '.sb-context-nuxt/\n');
  });

  test('excludePluginDir respects an entry written without the slash', () => {
    p = makeProject();
    p.write('.git/info/exclude', '.sb-context-nuxt\n');
    excludePluginDir(p.root);
    assert.equal(p.read('.git/info/exclude'), '.sb-context-nuxt\n');
  });

  test('relPath gives / separators on every OS; isInside needs a real child', () => {
    const root = join(sep, 'proj');
    assert.equal(relPath(root, join(root, 'app', 'assets', 'css')), 'app/assets/css');
    assert.equal(relPath(root, root), '.');
    assert.equal(relPath(root, join(sep, 'other', 'x')), '../other/x');
    const dir = join(root, '.sb-context-nuxt');
    assert.equal(isInside(dir, join(dir, 'design-source.md')), true);
    assert.equal(isInside(dir, join(dir, 'a', 'b.md')), true);
    assert.equal(isInside(dir, dir), false);
    assert.equal(isInside(dir, join(root, '.sb-context-nuxt-old', 'x.md')), false, 'a sibling with the same prefix is outside');
    assert.equal(isInside(dir, join(root, 'snap', 'x.md')), false);
  });
});
