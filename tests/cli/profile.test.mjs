import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS } from '../helpers/fixture.mjs';
import { nuxtApp, vueApp, vueLibrary } from '../helpers/stacks.mjs';

describe('profile.mjs', () => {
  let p;
  const profile = (...args) => p.run(SCRIPTS.profile, args);
  afterEach(() => p?.cleanup());

  test('detect prints the profile, nothing saved, and writes nothing', () => {
    p = vueLibrary();
    const d = profile('detect').json();
    assert.equal(d.file, null);
    assert.equal(d.saved, null);
    assert.equal(d.profile.kind, 'library');
    assert.equal(d.profile.adapter, 'vue-vite');
    assert.deepEqual(d.drift, []);
    assert.deepEqual(d.unknown, []);
    assert.equal(p.exists('.sb-context'), false);
  });

  test('it runs from a nested folder of a Vue project (no nuxt.config)', () => {
    p = vueApp();
    const r = p.run(SCRIPTS.profile, ['get', 'kind'], { cwd: p.path('src/views') });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.json(), 'app');
  });

  test('set confirms a value that a new detection keeps, and drift is reported', () => {
    p = vueLibrary();
    assert.equal(profile('set', 'kind', '"app"').code, 0);
    const saved = p.json('.sb-context/profile.json');
    assert.deepEqual(saved.confirmed, ['kind']);
    assert.equal(profile('get', 'kind').json(), 'app');
    assert.match(p.read('.sb-context/.gitignore'), /github\.json/);
    const d = profile('detect').json();
    assert.deepEqual(d.drift.filter((x) => x.confirmed), [{ key: 'kind', saved: 'app', detected: 'library', confirmed: true }]);
  });

  test('write saves the profile in use and keeps the confirmed values', () => {
    p = nuxtApp();
    profile('set', 'paths.styles', '"app/styles"');
    p.write('nuxt.config.ts', "export default defineNuxtConfig({ ssr: false })\n");
    assert.equal(profile('write').code, 0);
    const saved = p.json('.sb-context/profile.json');
    assert.equal(saved.paths.styles, 'app/styles', 'confirmed');
    assert.equal(saved.rendering, 'csr', 'refreshed from the files');
  });

  test('a confirmed styles folder is where the other scripts look', () => {
    p = nuxtApp({ 'app/styles/theme.css': ':root { --sb-bg: #fff; }\n' });
    profile('set', 'paths.styles', '"app/styles"');
    const s = p.run(SCRIPTS.setupState, []).json();
    assert.equal(s.style.cssDir, 'app/styles');
    assert.equal(s.style.prefix, 'sb');
    assert.deepEqual(s.profile.confirmed, ['paths.styles']);
  });

  test('unknown keys, bookkeeping keys and bad usage are refused without writing', () => {
    p = nuxtApp();
    assert.equal(profile('set', 'colour', '"x"').code, 2);
    assert.equal(profile('set', 'adapter', '"vue-vite"').code, 2);
    assert.equal(profile('set', 'kind').code, 2);
    assert.equal(profile('purge').code, 2);
    assert.equal(p.exists('.sb-context/profile.json'), false);
  });
});

describe('project-plugins.mjs', () => {
  let p;
  const plugins = (...args) => p.run(SCRIPTS.projectPlugins, args);
  const ids = 'sb-core@sb-context-fe,sb-github@sb-context-fe,sb-health@sb-context-fe,sb-design@sb-context-fe';
  afterEach(() => p?.cleanup());

  test('plan for a library: sb-design not needed, no seo, ids matched, writes nothing', () => {
    p = vueLibrary();
    const plan = plugins('plan', '--installed', ids).json();
    const design = plan.plugins.find((x) => x.plugin === 'sb-design');
    assert.equal(design.recommended, false);
    assert.equal(design.id, 'sb-design@sb-context-fe');
    assert.equal(design.project, null);
    assert.equal(plan.profile.kind, 'library');
    assert.equal(plan.skills.includes('/sb-health:seo'), false);
    assert.equal(p.exists('.claude'), false);
  });

  test('plan for a Nuxt app with a GitHub remote: all four needed', () => {
    p = nuxtApp({ '.git/config': '[remote "origin"]\n\turl = git@github.com:a/b.git\n' });
    const plan = plugins('plan', '--installed', ids).json();
    assert.deepEqual(plan.plugins.map((x) => x.recommended), [true, true, true, true]);
    assert.ok(plan.skills.includes('/sb-design:align'));
  });

  test('disable, enable and reset edit only enabledPlugins of settings.local.json', () => {
    p = vueLibrary({ '.claude/settings.local.json': { permissions: { allow: ['Bash(npm test)'] } } });
    assert.equal(plugins('disable', 'sb-design@sb-context-fe').code, 0);
    assert.deepEqual(p.json('.claude/settings.local.json'), { permissions: { allow: ['Bash(npm test)'] }, enabledPlugins: { 'sb-design@sb-context-fe': false } });
    assert.equal(plugins('plan', '--installed', ids).json().plugins.find((x) => x.plugin === 'sb-design').project, false);
    plugins('enable', 'sb-design@sb-context-fe');
    assert.equal(p.json('.claude/settings.local.json').enabledPlugins['sb-design@sb-context-fe'], true);
    plugins('reset', 'sb-design@sb-context-fe');
    assert.deepEqual(p.json('.claude/settings.local.json'), { permissions: { allow: ['Bash(npm test)'] } });
  });

  test('sb-core, other plugins and bad ids are refused', () => {
    p = vueLibrary();
    assert.match(plugins('disable', 'sb-core@sb-context-fe').stderr, /cannot be turned off/);
    assert.match(plugins('disable', 'caveman@caveman').stderr, /not one of/);
    assert.match(plugins('disable', 'sb-design').stderr, /not a plugin id/);
    assert.equal(plugins('disable').code, 2);
    assert.equal(p.exists('.claude/settings.local.json'), false);
  });

  test('a broken settings.local.json is reported, never overwritten', () => {
    p = vueLibrary({ '.claude/settings.local.json': '{ nope' });
    const r = plugins('disable', 'sb-design@sb-context-fe');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /not valid JSON/);
    assert.equal(p.read('.claude/settings.local.json'), '{ nope');
  });
});

describe('sb-design refuses the stacks it has no adapter for', () => {
  let p;
  afterEach(() => p?.cleanup());

  for (const [name, make, why] of [
    ['a Vue + Vite app', vueApp, /supports nuxt projects for now; this project is vue \+ vite/],
    ['a Vue library', vueLibrary, /supports nuxt projects for now/],
    ['a Nuxt module (library)', () => nuxtApp({ 'package.json': { devDependencies: { nuxt: '^4.0.0', '@nuxt/module-builder': '^1.0.0' } } }), /is for app projects; this project is a library/],
  ])
    test(name, () => {
      p = make();
      for (const script of [SCRIPTS.inventory, SCRIPTS.syncValues, SCRIPTS.template, SCRIPTS.renamePrefix]) {
        const r = p.run(script, script === SCRIPTS.renamePrefix ? ['--to', 'ps'] : []);
        assert.equal(r.code, 2, `${script.split('/').pop()}: ${r.stderr}`);
        assert.match(r.stderr, why, script.split('/').pop());
      }
      assert.equal(p.exists('.sb-context'), false);
    });
});
