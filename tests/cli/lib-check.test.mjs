import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SCRIPTS } from '../helpers/fixture.mjs';
import { vueLibrary, vueLibraryBuilt, vueApp } from '../helpers/stacks.mjs';

describe('lib-check.mjs', () => {
  let p;
  afterEach(() => p?.cleanup());
  const check = (...args) => p.run(SCRIPTS.libCheck, args);
  /** What the skill does: npm pack --dry-run --json, its output saved outside the project for --pack. */
  const pack = () => {
    const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: p.root, encoding: 'utf8', shell: process.platform === 'win32' });
    assert.equal(r.status, 0, r.stderr);
    const dir = mkdtempSync(join(tmpdir(), 'sbpack-'));
    const file = join(dir, 'pack.json');
    writeFileSync(file, r.stdout);
    const prev = p.cleanup;
    p.cleanup = () => {
      prev();
      rmSync(dir, { recursive: true, force: true });
    };
    return file;
  };

  test('a clean build: exit 0, from npm pack', () => {
    p = vueLibraryBuilt();
    const r = check('--json', '--pack', pack());
    assert.equal(r.code, 0, r.stdout + r.stderr);
    const out = r.json();
    assert.equal(out.fromPack, true);
    assert.deepEqual(out.findings, []);
    assert.ok(out.targets.every((t) => t.shipped));
    assert.match(check().stdout, /\*\*Result: 0 errors, 0 warnings\*\*/);
    assert.match(check().stdout, /the folder on disk/);
  });

  test('npm pack sees what "files" leaves out; the disk does not', () => {
    p = vueLibraryBuilt({ 'types/extra.d.ts': 'export {}\n' });
    const pkg = p.json('package.json');
    pkg.exports['./extra'] = { types: './types/extra.d.ts', import: './dist/index.js' };
    p.write('package.json', pkg);
    const packed = check('--json', '--pack', pack());
    assert.equal(packed.code, 10);
    assert.deepEqual(packed.json().findings.map((f) => `${f.code}:${f.subject}`), ['L1:exports["./extra"]["types"]']);
    assert.equal(check('--json').code, 0, 'the disk has the file');
  });

  test('a peer bundled into the output, vue in dependencies, a dependency that has vue as a peer', () => {
    p = vueLibraryBuilt(
      {
        'dist/index.js': "import { defineComponent } from 'vue'\nconst useFloating = () => {}\nexport const Tooltip = defineComponent({ setup: () => useFloating })\n",
        'dist/index.cjs': "const vue = require('vue')\nexports.Tooltip = vue.defineComponent({})\n",
        'node_modules/@vueuse/core/package.json': { name: '@vueuse/core', version: '13.0.0', peerDependencies: { vue: '^3.5.0' } },
      },
      { modules: false },
    );
    const pkg = p.json('package.json');
    pkg.dependencies = { vue: '^3.5.0', '@vueuse/core': '^13.0.0' };
    p.write('package.json', pkg);
    const r = check();
    assert.equal(r.code, 10);
    for (const re of [/\[L9\] `@floating-ui\/vue`: the source imports it but no built file does/, /\[L5\] `vue`/, /\[L6\] `@vueuse\/core`: it has "vue" as a peer/]) assert.match(r.stdout, re);
    assert.match(r.stdout, /\*\*Result: 2 errors, 1 warning\*\*/);
  });

  test('nothing built yet: exit 3', () => {
    p = vueLibrary({ 'package.json': { name: 'x', exports: { '.': './dist/index.js' }, peerDependencies: { vue: '^3.5.0' } } });
    const r = check();
    assert.equal(r.code, 3);
    assert.match(r.stderr, /Nothing built yet: \.\/dist\/index\.js not found/);
  });

  test('--pack that is not npm pack JSON: exit 2', () => {
    p = vueLibraryBuilt({ 'notes.txt': 'hello' });
    assert.equal(check('--pack', p.path('notes.txt')).code, 2);
  });

  test('an app is refused', () => {
    p = vueApp();
    const r = check();
    assert.equal(r.code, 2);
    assert.match(r.stderr, /is for library projects/);
  });
});
