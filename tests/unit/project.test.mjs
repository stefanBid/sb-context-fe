import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { isNuxtRoot, findProjectRoot, srcDirOf, cssDirOf, contextDirOf, legacyDirOf, ensureContextDir, GITIGNORE, relPath, isInside } from '../../core/lib/project.mjs';
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
    assert.equal(contextDirOf(p.root), p.path('.sb-context'));
    assert.equal(legacyDirOf(p.root), p.path('.sb-context-nuxt'));
  });

  test('ensureContextDir creates the folder and its .gitignore, and never touches git', () => {
    p = makeProject();
    p.write('.git/info/exclude', '# local\n*.log');
    assert.equal(ensureContextDir(p.root), 'created');
    assert.equal(p.read('.sb-context/.gitignore'), GITIGNORE);
    assert.match(GITIGNORE, /^github\.json$/m);
    assert.match(GITIGNORE, /^\*\.prev\.md$/m);
    assert.equal(ensureContextDir(p.root), 'exists');
    assert.equal(p.read('.git/info/exclude'), '# local\n*.log', 'the git exclude is not the plugin\'s any more');
  });

  test('ensureContextDir keeps a .gitignore the user edited', () => {
    p = makeProject({ '.sb-context/.gitignore': '*\n' }, { git: false });
    assert.equal(ensureContextDir(p.root), 'exists');
    assert.equal(p.read('.sb-context/.gitignore'), '*\n');
  });

  test('relPath gives / separators on every OS; isInside needs a real child', () => {
    const root = join(sep, 'proj');
    assert.equal(relPath(root, join(root, 'app', 'assets', 'css')), 'app/assets/css');
    assert.equal(relPath(root, root), '.');
    assert.equal(relPath(root, join(sep, 'other', 'x')), '../other/x');
    const dir = join(root, '.sb-context');
    assert.equal(isInside(dir, join(dir, 'design-source.md')), true);
    assert.equal(isInside(dir, join(dir, 'a', 'b.md')), true);
    assert.equal(isInside(dir, dir), false);
    assert.equal(isInside(dir, join(root, '.sb-context-old', 'x.md')), false, 'a sibling with the same prefix is outside');
    assert.equal(isInside(dir, join(root, 'snap', 'x.md')), false);
  });
});
