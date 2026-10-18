import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, START, END, packagesOf, catalogFor, catalogLink, catalogIds, applies, statusOf, emptyDocs, docsError, normalizeLink, fieldValue, upsertLinks, removeLinks, setField, findLink, linksFor, reviewOf, contextLine, groupsOf, renderBlock, applyBlock } from '../../core/lib/docs.mjs';
import { detectProfile, readPackage } from '../../core/lib/profile.mjs';
import { REPO } from '../helpers/fixture.mjs';
import { nuxtApp, vueApp, vueLibrary } from '../helpers/stacks.mjs';
import { rng } from '../helpers/random.mjs';

const today = '2026-10-17';
const SKILLS = new Set(readdirSync(join(REPO, 'plugins')).flatMap((p) => (existsSync(join(REPO, 'plugins', p, 'skills')) ? readdirSync(join(REPO, 'plugins', p, 'skills')).map((s) => `${p}:${s}`) : [])));
const link = (over = {}) => normalizeLink({ url: 'https://example.com/a', title: 'A', ...over }, { today });
/** The profile and packages of a fixture, as docs.mjs reads them. */
const read = (p) => ({ profile: detectProfile(p.root), packages: packagesOf(p.root, readPackage(p.root)) });

describe('the catalog', () => {
  test('ids are unique, urls are https, majors are numbers, usedBy names real skills', () => {
    const ids = CATALOG.flatMap((e) => e.links.map((l) => `${e.package}:${l.topic}`));
    assert.equal(new Set(ids).size, ids.length, 'duplicate id');
    assert.equal(new Set(CATALOG.map((e) => e.package)).size, CATALOG.length, 'duplicate package');
    for (const e of CATALOG) {
      assert.ok(Number.isInteger(e.major), e.package);
      assert.ok(e.older === null || e.older.includes('{major}'), `${e.package}: older needs {major}`);
      for (const l of e.links) {
        assert.match(l.url, /^https:\/\//, `${e.package}:${l.topic}`);
        assert.match(l.topic, /^[a-z][a-z0-9-]*$/, `${e.package}:${l.topic}`);
        for (const s of l.usedBy ?? []) assert.ok(SKILLS.has(s), `${e.package}:${l.topic}: unknown skill ${s}`);
      }
    }
  });

  test('every link the old fixed list gave a skill is still there for it', () => {
    const forSkill = (s) => CATALOG.flatMap((e) => e.links.filter((l) => l.usedBy?.includes(s)).map((l) => `${e.package}:${l.topic}`));
    assert.deepEqual(forSkill('sb-health:seo').sort(), ['@nuxtjs/sitemap:module', '@unhead/vue:seo-meta', 'nuxt:rendering', 'nuxt:seo']);
    for (const id of ['@fontsource:install', '@vueuse/core:color-mode', 'vite:config']) assert.ok(forSkill('sb-design:align').includes(id), id);
    for (const id of ['@unhead/vue:seo-meta', 'vue-router:guide', 'vue-i18n:composition']) assert.ok(forSkill('sb-design:extract-ui').includes(id), id);
    assert.ok(forSkill('sb-health:build').includes('vite:library-mode'));
    for (const id of ['nuxt:components', 'nuxt:layouts', 'nuxt:pages', 'nuxt:seo', 'tailwindcss:theme', '@nuxt/icon:module', '@nuxt/image:module', '@nuxtjs/i18n:started']) assert.ok(forSkill('sb-design:extract-ui').includes(id), id);
    for (const id of ['tailwindcss:theme', '@nuxt/fonts:module', '@nuxtjs/color-mode:module', 'nuxt:config']) assert.ok(forSkill('sb-design:align').includes(id), id);
  });

  test('catalogLink and catalogIds: exact ids, package:*, unknown ids throw', () => {
    assert.deepEqual(catalogLink('nuxt:pages'), { url: 'https://nuxt.com/docs/4.x/directory-structure/app/pages', title: 'Pages, dynamic routes and middleware', topic: 'pages', package: 'nuxt', version: '4', summary: null, source: 'proposed', usedBy: ['sb-design:extract-ui'], verifiedAt: null });
    assert.equal(catalogLink('@floating-ui/vue:middleware').package, '@floating-ui/vue', 'a scoped package keeps its own colon-free name');
    assert.equal(catalogLink('nuxt:nope'), null);
    const lib = { kind: 'library', framework: { name: 'vue' } };
    const vite = catalogIds(['vite:*'], lib);
    assert.ok(vite.includes('vite:library-mode') && !vite.includes('vite:build'), 'only the links that fit the profile');
    assert.throws(() => catalogIds(['nope:*'], lib), /no package nope/);
    assert.throws(() => catalogIds(['nuxt:nope'], lib), /not a link of the catalog/);
  });

  test('Fontsource is matched through the profile (one package per family, no package named @fontsource)', () => {
    const app = { kind: 'app', framework: { name: 'vue' }, styling: { fonts: '@fontsource' } };
    assert.ok(catalogFor(app, []).proposals.some((l) => l.id === '@fontsource:install'));
    assert.equal(catalogFor({ ...app, kind: 'library' }, []).proposals.some((l) => l.id === '@fontsource:install'), false);
  });

  test('applies: every key must match, a list is any of', () => {
    const p = { kind: 'app', framework: { name: 'vue' } };
    assert.equal(applies(p, undefined), true);
    assert.equal(applies(p, { kind: 'app', 'framework.name': 'vue' }), true);
    assert.equal(applies(p, { kind: 'library' }), false);
    assert.equal(applies(p, { kind: ['library', 'app'] }), true);
  });

  test('statusOf compares the major the project uses with the one the docs document', () => {
    assert.equal(statusOf(null, 4), 'unknown');
    assert.equal(statusOf(3, 4), 'behind');
    assert.equal(statusOf(5, 4), 'ahead');
    assert.equal(statusOf(4, 4), 'current');
  });
});

describe('matching a project', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('a Vue library wrapping Floating UI: Vue, Vite lib mode, Floating UI; no Nuxt, no Tailwind, no app pages', () => {
    p = vueLibrary();
    const { profile, packages } = read(p);
    const found = catalogFor(profile, packages);
    assert.deepEqual(found.packages.map((x) => x.package), ['vue', 'vite', '@floating-ui/vue']);
    const ids = found.proposals.map((x) => x.id);
    assert.ok(ids.includes('vite:library-mode') && ids.includes('@floating-ui/vue:vue') && ids.includes('vue:script-setup'));
    assert.ok(!ids.includes('vite:build'), 'the app build page does not fit a library');
    assert.ok(!ids.some((id) => id.startsWith('nuxt:') || id.startsWith('tailwindcss:')));
    const vite = found.packages.find((x) => x.package === 'vite');
    assert.equal(vite.installed, 7);
    assert.equal(vite.status, 'behind');
    assert.equal(vite.older, 'https://v7.vite.dev');
    assert.equal(found.packages.find((x) => x.package === 'vue').status, 'current', 'vue is installed in the fixture (3.x)');
  });

  test('a Nuxt app: the modules declared only in nuxt.config are matched through the profile', () => {
    p = nuxtApp();
    const { profile, packages } = read(p);
    const found = catalogFor(profile, packages);
    for (const pkg of ['nuxt', 'tailwindcss', '@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts']) assert.ok(found.packages.some((x) => x.package === pkg), pkg);
    const i18n = found.packages.find((x) => x.package === '@nuxtjs/i18n');
    assert.equal(i18n.status, 'unknown', 'not in package.json: no version to compare');
    const ids = found.proposals.map((x) => x.id);
    assert.ok(!ids.includes('tailwindcss:vite'), 'Tailwind with Vite is for Vue projects');
    assert.ok(!ids.includes('vite:config'));
  });

  test('a Vue app: VueUse useColorMode and Tailwind with Vite fit; uncatalogued runtime deps are listed, dev tooling and types are not', () => {
    p = vueApp();
    const pkg = readPackage(p.root);
    pkg.dependencies['@acme/charts'] = '^2.0.0';
    pkg.devDependencies['@types/node'] = '^22.0.0';
    pkg.devDependencies['some-tool'] = '^1.0.0';
    p.write('package.json', pkg);
    const { profile, packages } = read(p);
    const found = catalogFor(profile, packages);
    const ids = found.proposals.map((x) => x.id);
    assert.ok(ids.includes('@vueuse/core:color-mode') && ids.includes('tailwindcss:vite') && ids.includes('vue-router:guide') && ids.includes('vue-i18n:started'));
    assert.deepEqual(found.uncatalogued, [{ package: '@acme/charts', version: '2', homepage: null }]);
  });

  test('packagesOf: installed versions win over ranges, homepage from the installed package', () => {
    p = vueLibrary();
    const vue = packagesOf(p.root, readPackage(p.root)).find((x) => x.package === 'vue');
    assert.deepEqual(vue.in, ['peerDependencies']);
    assert.match(vue.installed, /^3\.\d+\.\d+/);
    assert.match(vue.version, /^3\.\d+$/);
    assert.match(vue.homepage, /^https:\/\//);
    const floating = packagesOf(p.root, readPackage(p.root)).find((x) => x.package === '@floating-ui/vue');
    assert.deepEqual([floating.installed, floating.major, floating.version, floating.homepage], [null, 1, '1', null]);
    assert.deepEqual(packagesOf(p.root, {}), []);
  });
});

describe('docs.json', () => {
  test('docsError', () => {
    assert.equal(docsError(emptyDocs()), null);
    assert.match(docsError([]), /not a JSON object/);
    assert.match(docsError({ schema: 2, links: [] }), /schema 2/);
    assert.match(docsError({ schema: 1, links: {} }), /not a list/);
  });

  test('normalizeLink: every field, in order, with defaults; wrong values throw', () => {
    assert.deepEqual(link({ version: 7, usedBy: ['sb-design:extract-ui', 'sb-design:extract-ui'], verifiedAt: 'today' }), {
      url: 'https://example.com/a', title: 'A', topic: null, package: null, version: '7', summary: null, source: 'user', usedBy: ['sb-design:extract-ui'], verifiedAt: today,
    });
    assert.throws(() => link({ url: 'ftp://x' }), /http\(s\) URL/);
    assert.throws(() => link({ url: 'not a url' }), /http\(s\) URL/);
    assert.throws(() => link({ title: '' }), /title is required/);
    assert.throws(() => link({ source: 'catalog' }), /source must be/);
    assert.throws(() => link({ usedBy: ['extract-ui'] }), /plugin:skill/);
    assert.throws(() => link({ verifiedAt: 'yesterday' }), /verifiedAt/);
    assert.throws(() => link({ colour: 'x' }), /colour: not a field/);
    assert.throws(() => normalizeLink([]), /JSON object/);
    assert.throws(() => fieldValue('nope', 1), /not a field/);
  });

  test('upsertLinks adds, replaces by url, and reports nothing when the link is the same', () => {
    let r = upsertLinks(emptyDocs(), [link(), link({ url: 'https://example.com/b' })]);
    assert.deepEqual([r.added, r.updated], [['https://example.com/a', 'https://example.com/b'], []]);
    r = upsertLinks(r.docs, [link({ summary: 'covers x' }), link({ url: 'https://example.com/b' })]);
    assert.deepEqual([r.added, r.updated], [[], ['https://example.com/a']]);
    assert.equal(r.docs.links[0].summary, 'covers x');
    assert.equal(r.docs.links.length, 2);
  });

  test('removeLinks and findLink accept a url or a catalog id', () => {
    const docs = upsertLinks(emptyDocs(), [link(), catalogLink('nuxt:pages')]).docs;
    assert.equal(findLink(docs, 'nuxt:pages').topic, 'pages');
    assert.equal(findLink(docs, 'nuxt:seo'), null);
    const r = removeLinks(docs, ['nuxt:pages', 'https://example.com/zzz']);
    assert.deepEqual(r.removed, ['https://nuxt.com/docs/4.x/directory-structure/app/pages']);
    assert.deepEqual(r.missing, ['https://example.com/zzz']);
    assert.equal(r.docs.links.length, 1);
    assert.equal(docs.links.length, 2, 'the input is not changed');
  });

  test('setField changes one checked field; a url already saved or a link not saved throw', () => {
    const docs = upsertLinks(emptyDocs(), [link(), link({ url: 'https://example.com/b' })]).docs;
    const next = setField(docs, 'https://example.com/a', 'verifiedAt', 'today', { today });
    assert.equal(next.links[0].verifiedAt, today);
    assert.equal(docs.links[0].verifiedAt, null);
    assert.throws(() => setField(docs, 'https://example.com/a', 'url', 'https://example.com/b'), /already saved/);
    assert.throws(() => setField(docs, 'https://example.com/zzz', 'title', 'x'), /not a saved link/);
    assert.throws(() => setField(docs, 'https://example.com/a', 'usedBy', 'sb-design:align'), /list of skills/);
  });

  test('linksFor filters by skill', () => {
    const links = [link({ usedBy: ['sb-health:seo'] }), link({ url: 'https://example.com/b' })];
    assert.equal(linksFor(links, 'sb-health:seo').length, 1);
    assert.equal(linksFor(links).length, 2);
  });

  test('reviewOf: a package no longer declared, docs of another major', () => {
    const packages = [{ package: 'vite', major: 7 }, { package: 'vue', major: 3 }];
    const links = [link({ package: 'vite', version: '8' }), link({ url: 'https://example.com/b', package: 'nuxt', version: '4' }), link({ url: 'https://example.com/c', package: 'vue', version: '3.x' }), link({ url: 'https://example.com/d' })];
    assert.deepEqual(reviewOf(links, packages), [
      { url: 'https://example.com/a', why: 'documents vite 8, the project uses 7' },
      { url: 'https://example.com/b', why: 'nuxt is no longer a dependency of the project' },
    ]);
  });
});

describe('the CLAUDE.md block', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('contextLine for the three stacks', () => {
    p = vueLibrary();
    assert.match(contextLine(...Object.values(read(p))), /^Vue 3\.\d+ library in TypeScript, built with Vite 7 \(lib mode\), wrapping Floating UI\.$/);
    p.cleanup();
    p = nuxtApp();
    assert.match(contextLine(...Object.values(read(p))), /^Nuxt 4 app \(SSR\) in TypeScript, styled with Tailwind CSS 4\.\d+\.$/);
    p.cleanup();
    p = vueApp();
    assert.match(contextLine(...Object.values(read(p))), /^Vue 3\.\d+ app \(client-side rendering\) in TypeScript, built with Vite 7, styled with Tailwind CSS 4\.\d+\.$/);
    assert.equal(contextLine(null), null);
  });

  test('contextLine: unknown kind, several wrapped libraries, webpack in Nuxt', () => {
    const base = { framework: { name: 'nuxt', major: 4 }, bundler: { name: 'webpack', major: 5 }, kind: null, language: 'js', styling: { engine: null } };
    assert.equal(contextLine(base), 'Nuxt 4 project, built with webpack 5.');
    const lib = { framework: { name: 'vue', major: 3 }, bundler: null, kind: 'library', language: 'ts', styling: { engine: { name: 'scss' } }, library: { peers: ['vue', 'vue-router', '@floating-ui/vue', '@floating-ui/dom', 'dayjs', 'pinia'] } };
    assert.equal(contextLine(lib), 'Vue 3 library in TypeScript, styled with SCSS, wrapping Floating UI, dayjs and Pinia.');
  });

  test('groupsOf: catalog order, then other packages, then the links of no package; versions in the label', () => {
    const links = [link({ url: 'https://x.dev/1' }), link({ url: 'https://x.dev/2', package: 'dayjs', version: '1' }), link({ url: 'https://x.dev/3', package: 'vite', version: '7' }), link({ url: 'https://x.dev/4', package: 'nuxt', version: '4' }), link({ url: 'https://x.dev/5', package: 'nuxt', version: '4' })];
    assert.deepEqual(groupsOf(links).map((g) => [g.label, g.links.length]), [['Nuxt 4', 2], ['Vite 7', 1], ['dayjs 1', 1], ['Other', 1]]);
  });

  test('renderBlock: markers, context, rule, one line per package; titles escaped; no links = no block', () => {
    p = vueLibrary();
    const { profile, packages } = read(p);
    const block = renderBlock({ profile, packages, links: [catalogLink('vue:script-setup'), link({ title: 'Notes [draft]', url: 'https://example.com/n' })] });
    const lines = block.split('\n');
    assert.equal(lines[0], START);
    assert.equal(lines.at(-1), END);
    assert.ok(lines.includes('## Project docs'));
    assert.ok(lines.some((l) => l.startsWith('Vue 3.') && l.endsWith('wrapping Floating UI.')));
    assert.ok(lines.some((l) => /source of truth/.test(l) && /not verified/.test(l)));
    assert.ok(lines.includes('- **Vue 3**: [`<script setup>`](https://vuejs.org/api/sfc-script-setup.html)'));
    assert.ok(lines.includes('- **Other**: [Notes \\[draft\\]](https://example.com/n)'));
    assert.equal(renderBlock({ profile, packages, links: [] }), null);
  });

  const block = `${START}\n## Project docs\n- a\n${END}`;
  const other = `${START}\n## Project docs\n- b\n${END}`;

  test('applyBlock: create, insert, replace, unchanged, remove, none', () => {
    assert.deepEqual(applyBlock(null, block), { text: `${block}\n`, action: 'create' });
    assert.deepEqual(applyBlock(null, null), { text: null, action: 'none' });
    assert.deepEqual(applyBlock('# Rules\n\n- be nice\n\n\n', block), { text: `# Rules\n\n- be nice\n\n${block}\n`, action: 'insert' });
    assert.deepEqual(applyBlock('', block), { text: `${block}\n`, action: 'insert' });
    const text = `# Rules\n\n${block}\n\n## More\ntext\n`;
    assert.deepEqual(applyBlock(text, other), { text: `# Rules\n\n${other}\n\n## More\ntext\n`, action: 'replace' });
    assert.deepEqual(applyBlock(text, block), { text, action: 'unchanged' });
    assert.deepEqual(applyBlock(text, null), { text: '# Rules\n\n## More\ntext\n', action: 'remove' });
    assert.deepEqual(applyBlock(`${block}\n`, null), { text: '', action: 'remove' });
    assert.deepEqual(applyBlock('# Rules\n', null), { text: '# Rules\n', action: 'none' });
  });

  test('applyBlock keeps CRLF files CRLF', () => {
    const r = applyBlock('# Rules\r\n', block);
    assert.equal(r.text, `# Rules\r\n\r\n${block.replaceAll('\n', '\r\n')}\r\n`);
    assert.equal(applyBlock(r.text, block).action, 'unchanged');
  });

  test('applyBlock refuses markers that do not pair up', () => {
    for (const bad of [`${START}\nx`, `x\n${END}`, `${END}\n${START}`, `${block}\n${block}`]) assert.throws(() => applyBlock(bad, block), /do not pair up/, bad);
  });

  test('property: text outside the markers never changes, and a second apply is unchanged', () => {
    const r = rng();
    const pieces = ['# Title', '', 'text', '- item', '```', '<!-- note -->', '  ', 'Ünïcode', '\t', 'sb-context'];
    const textOf = () => Array.from({ length: r.int(0, 8) }, () => r.pick(pieces)).join(r.pick(['\n', '\r\n']));
    for (let i = 0; i < 500; i++) {
      const before = textOf();
      const after = textOf();
      const ctx = `seed ${r.seed}, case ${i}`;
      const withBlock = r.int(0, 1) ? `${before}\n${block}\n${after}` : before;
      const first = applyBlock(withBlock, other);
      assert.equal(applyBlock(first.text, other).action, 'unchanged', ctx);
      const crlf = withBlock.includes('\r\n');
      const kept = first.text.replace((crlf ? other.replaceAll('\n', '\r\n') : other), '');
      if (withBlock.includes(START)) assert.equal(kept, withBlock.replace(block, ''), ctx);
      else assert.ok(first.text.startsWith(withBlock.replace(/\s+$/, '')), ctx);
      const removed = applyBlock(first.text, null);
      assert.ok(!removed.text.includes(START), ctx);
    }
  });
});
