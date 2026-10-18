import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { declaredTargets, isShipped, typesConditionIssues, siblingTypes, rangeMajors, importsPackage, checkLibrary } from '../../plugins/sb-health/scripts/lib/lib-check.mjs';

const BUILT = new Set(['package.json', 'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts']);
const PKG = {
  name: 'lib',
  files: ['dist'],
  exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js', require: './dist/index.cjs' } },
  types: './dist/index.d.ts',
  peerDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0' },
  devDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0' },
};
const OUT = [{ file: 'dist/index.js', code: "import { h } from 'vue'\nimport { useFloating } from '@floating-ui/vue'\n" }];
const SRC = [{ file: 'src/a.ts', code: "import { useFloating } from '@floating-ui/vue'\n" }];
const codes = (r) => r.findings.map((f) => `${f.code}:${f.subject}`);

describe('lib-check helpers', () => {
  test('declaredTargets walks exports through subpaths and conditions, plus main, module, types and bin', () => {
    const t = declaredTargets({ exports: { '.': { import: { types: './a.d.ts', default: './a.js' } }, './x': './x.js' }, main: 'm.js', bin: { cli: 'bin.js' } });
    assert.deepEqual(t.map((x) => `${x.field}=${x.path}`), ['exports["."]["import"]["types"]=./a.d.ts', 'exports["."]["import"]["default"]=./a.js', 'exports["./x"]=./x.js', 'main=m.js', 'bin["cli"]=bin.js']);
    assert.deepEqual(declaredTargets({ exports: './i.js' }).map((x) => x.field), ['exports["."]']);
  });

  test('isShipped: exact files and subpath patterns', () => {
    const files = new Set(['dist/a.js', 'dist/sub/b.js']);
    assert.equal(isShipped('./dist/a.js', files), true);
    assert.equal(isShipped('./dist/c.js', files), false);
    assert.equal(isShipped('./dist/*.js', files), true);
    assert.equal(isShipped('./lib/*.js', files), false);
  });

  test('typesConditionIssues: missing types without a sibling .d.ts, types not first', () => {
    assert.equal(siblingTypes('./dist/index.mjs'), 'dist/index.d.mts');
    const files = new Set(['dist/index.js', 'dist/index.d.ts', 'dist/b.mjs']);
    assert.deepEqual(typesConditionIssues({ types: 'dist/index.d.ts', exports: { '.': './dist/index.js' } }, files), [], 'the .d.ts next to the JS is found');
    assert.deepEqual(typesConditionIssues({ types: 'dist/index.d.ts', exports: { '.': { import: './dist/b.mjs' } } }, files), [{ sub: '.', kind: 'missing' }]);
    assert.deepEqual(typesConditionIssues({ types: 'dist/index.d.ts', exports: { import: './dist/index.js', types: './dist/index.d.ts' } }, files), [{ sub: '.', kind: 'order' }]);
    assert.deepEqual(typesConditionIssues({ exports: { '.': { import: './dist/b.mjs' } } }, files), [], 'no types declared at all: nothing to compare');
  });

  test('rangeMajors: carets, alternatives, bounds, open ranges', () => {
    const r = (s) => rangeMajors(s);
    assert.equal(r('^3.5.0').allows(3), true);
    assert.equal(r('^3.5.0').allows(4), false);
    assert.equal(r('^3 || ^4').allows(4), true);
    assert.equal(r('>=3 <5').allows(4), true);
    assert.equal(r('>=3 <5').allows(5), false);
    assert.equal(r('>=3 <5').open, false);
    assert.equal(r('>=3.0.0').open, true);
    assert.equal(r('*').open, true);
    assert.equal(r('3.x').allows(3), true);
    assert.equal(r('2 - 4').allows(3), true);
    assert.equal(r('<=5').allows(5), true);
  });

  test('importsPackage: from, dynamic import, require, subpaths, minified; not a longer name', () => {
    assert.equal(importsPackage("import { h } from 'vue'", 'vue'), true);
    assert.equal(importsPackage('import{h}from"vue"', 'vue'), true);
    assert.equal(importsPackage("const v = require('vue/dist/x')", 'vue'), true);
    assert.equal(importsPackage("await import('@floating-ui/vue')", '@floating-ui/vue'), true);
    assert.equal(importsPackage("import 'vue-router'", 'vue'), false);
    assert.equal(importsPackage("import x from '@floating-ui/vue'", 'vue'), false);
  });
});

describe('checkLibrary', () => {
  test('a clean build has no findings', () => {
    const r = checkLibrary({ pkg: PKG, files: BUILT, output: OUT, source: SRC, fromPack: true });
    assert.equal(r.built, true);
    assert.deepEqual(r.findings, []);
  });

  test('nothing built: built is false and no target is reported as missing', () => {
    const r = checkLibrary({ pkg: PKG, files: new Set(['package.json']) });
    assert.equal(r.built, false);
    assert.equal(r.findings.some((f) => f.code === 'L1'), false);
  });

  test('every rule', () => {
    const pkg = {
      ...PKG,
      files: undefined,
      sideEffects: false,
      exports: { '.': { import: './dist/index.mjs', types: './dist/index.d.ts' }, './extra': './dist/extra.js' },
      dependencies: { vue: '^3.5.0', '@vueuse/core': '^13.0.0', lodash: '^4.0.0', '@floating-ui/vue': '^1.0.0' },
      peerDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^1.1.0', pinia: '*', 'vue-router': '^4.0.0' },
      devDependencies: { vue: '^3.5.0', '@floating-ui/vue': '^2.0.0', pinia: '^3.0.0' },
    };
    const files = new Set(['dist/index.mjs', 'dist/index.d.ts', 'dist/style.css']);
    const metaOf = (n) => ({ '@vueuse/core': { peerDependencies: { vue: '^3.5.0' } }, lodash: { version: '4.17.21' } })[n] ?? null;
    const r = checkLibrary({ pkg, files, metaOf, output: [{ file: 'dist/index.mjs', code: "import 'vue'" }], source: SRC });
    assert.deepEqual(codes(r).sort(), [
      'L1:exports["./extra"]',
      'L10:sideEffects',
      'L2:files',
      'L3:exports["./extra"]',
      'L4:exports["."]',
      'L5:vue',
      'L6:@floating-ui/vue',
      'L6:@vueuse/core',
      'L7:@floating-ui/vue',
      'L7:vue-router',
      'L8:pinia',
      'L9:@floating-ui/vue',
    ].sort());
    assert.equal(r.findings.find((f) => f.code === 'L7' && f.subject === '@floating-ui/vue').severity, 'error');
    assert.equal(r.findings.find((f) => f.code === 'L7' && f.subject === 'vue-router').severity, 'warning');
    assert.match(r.findings.find((f) => f.code === 'L1').message, /missing from the build output/);
  });

  test('types declared but no .d.ts shipped', () => {
    const r = checkLibrary({ pkg: { ...PKG, exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } } }, files: new Set(['dist/index.js']), fromPack: true });
    assert.deepEqual(codes(r).sort(), ['L1:exports["."]["types"]', 'L1:types', 'L1:types']);
    assert.match(r.findings[0].message, /not in the published package/);
  });
});
