import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, githubRemoteOf, STYLE_FILES, pluginPlan, skillsFor, pluginIdError, withPlugin } from '../../plugins/sb-core/scripts/lib/setup.mjs';

const allStyle = Object.fromEntries(STYLE_FILES.map((f) => [f, true]));
const base = () => ({
  style: { files: { ...allStyle } },
  design: { source: true, applied: true },
  github: { remote: 'git@github.com:a/b.git', cache: true, prTitleLint: true },
  dependencyNotes: { open: 0 },
});
const skills = (s) => recommend(s).map((r) => r.skill);

describe('recommend', () => {
  test('an aligned, audited project needs nothing', () => {
    assert.deepEqual(recommend(base()), []);
  });

  test('missing style files point to style-align and name them', () => {
    const s = base();
    s.style.files['animation.css'] = false;
    const [r] = recommend(s);
    assert.equal(r.skill, '/sb-design:align');
    assert.match(r.why, /missing animation\.css/);
  });

  test('design: no snapshot → design-extract-style (optional); snapshot never applied → style-align', () => {
    const s = base();
    s.design = { source: false, applied: false };
    assert.deepEqual(skills(s), ['/sb-design:extract-style']);
    assert.match(recommend(s)[0].why, /only if/);
    s.design = { source: true, applied: false };
    assert.deepEqual(skills(s), ['/sb-design:align']);
  });

  test('GitHub steps only with a GitHub remote', () => {
    const s = base();
    s.github = { remote: 'https://github.com/a/b.git', cache: false, prTitleLint: false };
    assert.deepEqual(skills(s), ['/sb-github:admin', '/sb-github:checks']);
    s.github.remote = null;
    assert.deepEqual(skills(s), []);
  });

  test('project docs: none chosen → context; chosen but CLAUDE.md not pointing to them → context again', () => {
    const s = base();
    s.docLinks = { saved: false, claudeBlock: false };
    assert.deepEqual(recommend(s), [{ skill: '/sb-core:context', why: 'no project docs chosen yet: the skills fall back on the catalog of official docs' }]);
    s.docLinks = { saved: true, claudeBlock: false };
    assert.match(recommend(s)[0].why, /CLAUDE\.md does not point to them/);
    s.docLinks = { saved: true, claudeBlock: true };
    assert.deepEqual(recommend(s), []);
  });

  test('open dependency notes point to dependency-check', () => {
    const s = base();
    s.dependencyNotes.open = 2;
    assert.deepEqual(recommend(s), [{ skill: '/sb-health:deps', why: '2 dependency note(s) still open' }]);
  });

  test('order: style first, then design, GitHub, dependencies', () => {
    const s = { style: { files: {} }, design: { source: false, applied: false }, github: { remote: 'x', cache: false, prTitleLint: false }, dependencyNotes: { open: 1 } };
    assert.deepEqual(skills(s), ['/sb-design:align', '/sb-design:extract-style', '/sb-github:admin', '/sb-github:checks', '/sb-health:deps']);
  });
});

describe('githubRemoteOf', () => {
  test('https and ssh origins on github.com', () => {
    assert.equal(githubRemoteOf('[core]\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/a/b.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n'), 'https://github.com/a/b.git');
    assert.equal(githubRemoteOf('[remote "origin"]\n\turl = git@github.com:a/b.git\n'), 'git@github.com:a/b.git');
  });

  test('no origin, another host, or github only on another remote → null', () => {
    assert.equal(githubRemoteOf(''), null);
    assert.equal(githubRemoteOf('[remote "origin"]\n\turl = https://gitlab.com/a/b.git\n'), null);
    assert.equal(githubRemoteOf('[remote "origin"]\n\turl = https://gitlab.com/a/b.git\n[remote "up"]\n\turl = https://github.com/a/b.git\n'), null);
  });
});

describe('plugins and skills for a project', () => {
  const nuxtApp = { kind: 'app', adapter: 'nuxt', rendering: 'ssr' };
  const vueApp = { kind: 'app', adapter: 'vue-vite', rendering: 'csr' };
  const lib = { kind: 'library', adapter: 'vue-vite', rendering: null };
  const need = (plan) => Object.fromEntries(plan.map((p) => [p.plugin, p.recommended]));

  test('a Nuxt app on GitHub needs all four', () => {
    assert.deepEqual(need(pluginPlan(nuxtApp, { github: true })), { 'sb-core': true, 'sb-github': true, 'sb-health': true, 'sb-design': true });
  });

  test('a library and an app without a design adapter do not need sb-design, and say why', () => {
    const l = pluginPlan(lib);
    assert.equal(need(l)['sb-design'], false);
    assert.match(l.find((p) => p.plugin === 'sb-design').why, /library/);
    assert.match(pluginPlan(vueApp).find((p) => p.plugin === 'sb-design').why, /no adapter for vue-vite/);
    assert.match(pluginPlan({ kind: null }).find((p) => p.plugin === 'sb-design').why, /unknown/);
    assert.equal(need(l)['sb-github'], false, 'no GitHub remote');
  });

  test('skillsFor lists the skills of the needed plugins, without seo for a library or a CSR app, without onboard outside a Nuxt app', () => {
    const libSkills = skillsFor(pluginPlan(lib, { github: true }), lib);
    assert.ok(libSkills.includes('/sb-health:deps'));
    assert.ok(libSkills.includes('/sb-github:admin'));
    assert.equal(libSkills.some((s) => s.startsWith('/sb-design:')), false);
    assert.equal(libSkills.includes('/sb-health:seo'), false);
    assert.equal(libSkills.includes('/sb-core:onboard'), false);
    const nuxtSkills = skillsFor(pluginPlan(nuxtApp, { github: true }), nuxtApp);
    assert.ok(nuxtSkills.includes('/sb-health:seo'));
    assert.ok(nuxtSkills.includes('/sb-core:onboard'));
    assert.ok(nuxtSkills.includes('/sb-design:align'));
  });

  test('pluginIdError accepts only name@marketplace ids of the four plugins', () => {
    assert.equal(pluginIdError('sb-design@sb-context-fe'), null);
    assert.equal(pluginIdError('sb-design@sb-context-nuxt'), null, 'a marketplace registered under its old name');
    assert.match(pluginIdError('sb-design'), /not a plugin id/);
    assert.match(pluginIdError('caveman@caveman'), /not one of/);
    assert.match(pluginIdError('sb-context-fe@sb-context-fe'), /not one of/, 'the bundle is not toggled');
  });

  test('withPlugin sets, overrides and removes one entry, keeping everything else', () => {
    const start = { permissions: { allow: ['Bash(npm test)'] }, enabledPlugins: { 'x@y': true } };
    const off = withPlugin(start, 'sb-design@m', false);
    assert.deepEqual(off, { permissions: { allow: ['Bash(npm test)'] }, enabledPlugins: { 'x@y': true, 'sb-design@m': false } });
    assert.deepEqual(start.enabledPlugins, { 'x@y': true }, 'the input is not changed');
    assert.deepEqual(withPlugin(off, 'sb-design@m', null), start);
    assert.deepEqual(withPlugin({}, 'sb-design@m', null), {});
  });

  test('recommend leaves the style steps out where sb-design does not apply', () => {
    const state = { profile: lib, style: { files: {} }, design: { source: false, applied: false }, github: {}, dependencyNotes: { open: 0 } };
    assert.deepEqual(recommend(state), []);
    assert.equal(recommend({ ...state, profile: nuxtApp })[0].skill, '/sb-design:align');
  });
});
