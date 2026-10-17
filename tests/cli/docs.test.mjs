import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS, makeProject } from '../helpers/fixture.mjs';
import { nuxtApp, vueLibrary } from '../helpers/stacks.mjs';
import { START, END } from '../../core/lib/docs.mjs';

const today = new Date().toISOString().slice(0, 10);

describe('docs.mjs', () => {
  let p;
  const docs = (...args) => p.run(SCRIPTS.docs, args);
  afterEach(() => p?.cleanup());

  test('detect on a library: context, packages with status, proposals, nothing saved, writes nothing', () => {
    p = vueLibrary();
    const d = docs('detect').json();
    assert.equal(d.file, null);
    assert.deepEqual(d.claudeMd, { file: 'CLAUDE.md', exists: false, block: false });
    assert.equal(d.profile.kind, 'library');
    assert.equal(d.profile.saved, false);
    assert.match(d.context, /library in TypeScript, built with Vite 7 \(lib mode\), wrapping Floating UI\.$/);
    assert.deepEqual(d.packages.map((x) => [x.package, x.status]), [['vue', 'current'], ['vite', 'behind'], ['@floating-ui/vue', 'behind']]);
    assert.ok(d.proposals.some((x) => x.id === 'vite:library-mode' && x.saved === false));
    assert.deepEqual(d.saved, { count: 0, review: [] });
    assert.equal(p.exists('.sb-context'), false);
  });

  test('get without docs.json falls back on the catalog, filtered by skill', () => {
    p = nuxtApp();
    const g = docs('get', '--for', 'sb-health:seo').json();
    assert.equal(g.source, 'catalog');
    assert.deepEqual(g.links.map((l) => l.topic).sort(), ['rendering', 'seo']);
    assert.match(g.note, /\/sb-core:context/);
    assert.equal(docs('get', '--for', 'extract-ui').code, 2, 'a skill is plugin:skill');
  });

  test('add --catalog, add json, set, remove: the project links, then get reads them', () => {
    p = nuxtApp();
    assert.match(docs('add', '--catalog', 'nuxt:pages,tailwindcss:*').stdout, /\d+ added, 0 updated/);
    const user = { url: 'https://wiki.acme.dev/ui', title: 'Acme UI guide', summary: 'covers buttons, forms; version 2', usedBy: ['sb-design:extract-ui'], verifiedAt: 'today' };
    assert.equal(docs('add', JSON.stringify([user])).code, 0);
    let saved = p.json('.sb-context/docs.json');
    assert.equal(saved.schema, 1);
    assert.equal(saved.updatedAt, today);
    const acme = saved.links.find((l) => l.url === user.url);
    assert.deepEqual([acme.source, acme.verifiedAt, acme.package], ['user', today, null]);
    assert.match(docs('add', '--catalog', 'nuxt:pages').stdout, /Nothing changed/);

    assert.equal(docs('set', 'nuxt:pages', 'summary', '"file-based routing"').code, 0);
    assert.equal(docs('set', 'nuxt:pages', 'verifiedAt', 'today').code, 0);
    saved = p.json('.sb-context/docs.json');
    assert.deepEqual([saved.links[0].summary, saved.links[0].verifiedAt], ['file-based routing', today]);

    const forUi = docs('get', '--for', 'sb-design:extract-ui').json();
    assert.equal(forUi.source, 'project');
    assert.deepEqual(forUi.links.map((l) => l.title), ['Pages, dynamic routes and middleware', 'Theme variables', 'Acme UI guide']);
    const forSeo = docs('get', '--for', 'sb-health:seo').json();
    assert.deepEqual(forSeo.links, [], 'the project chose: no fallback on the catalog');
    assert.match(forSeo.note, /without --for/);

    assert.match(docs('remove', 'tailwindcss:theme', user.url).stdout, /Removed 2 link/);
    assert.equal(docs('remove', 'https://nope.dev').code, 2);
    assert.ok(!p.json('.sb-context/docs.json').links.some((l) => l.url === user.url));
  });

  test('bad input is refused and nothing is written', () => {
    p = nuxtApp();
    assert.equal(docs('add', '{"url":"nope","title":"x"}').code, 2);
    assert.equal(docs('add', '--catalog', 'nuxt:nope').code, 2);
    assert.equal(docs('add', '--catalog').code, 2);
    assert.equal(docs('add').code, 2);
    assert.equal(docs('remove', 'nuxt:pages').code, 2, 'no docs.json yet');
    assert.equal(docs('set', 'nuxt:pages', 'summary', '"x"').code, 2);
    assert.equal(docs('purge').code, 2);
    assert.equal(p.exists('.sb-context'), false);
    docs('add', '--catalog', 'nuxt:pages');
    assert.match(docs('set', 'nuxt:pages', 'source', '"catalog"').stderr, /source must be/);
    assert.match(docs('set', 'nuxt:seo', 'summary', '"x"').stderr, /not a saved link/);
  });

  test('a docs.json that is not valid stops every command', () => {
    p = nuxtApp({ '.sb-context/docs.json': '{ nope' });
    for (const args of [['detect'], ['get'], ['add', '--catalog', 'nuxt:pages'], ['render']]) {
      const r = docs(...args);
      assert.equal(r.code, 2, args.join(' '));
      assert.match(r.stderr, /not valid JSON/);
    }
    p.write('.sb-context/docs.json', { schema: 9, links: [] });
    assert.match(docs('get').stderr, /schema 9/);
  });

  test('render shows the action and the block, writes nothing; --write creates CLAUDE.md', () => {
    p = vueLibrary();
    docs('add', '--catalog', 'vue:script-setup,@floating-ui/vue:*');
    const dry = docs('render');
    assert.match(dry.stdout, /^Action: CLAUDE\.md does not exist: it would be created/);
    assert.ok(dry.stdout.includes(START) && dry.stdout.includes(END));
    assert.equal(p.exists('CLAUDE.md'), false);
    assert.match(docs('render', '--write').stdout, /Created CLAUDE\.md/);
    const text = p.read('CLAUDE.md');
    assert.ok(text.startsWith(START) && text.endsWith(`${END}\n`));
    assert.match(text, /- \*\*Floating UI 2\*\*: \[Vue: useFloating\]\(https:\/\/floating-ui\.com\/docs\/vue\)/);
    assert.match(docs('render', '--write').stdout, /Nothing written: .*already up to date/);
    assert.equal(docs('detect').json().claudeMd.block, true);
  });

  test('render --write touches only the block of an existing CLAUDE.md, and removes it when no link is left', () => {
    p = nuxtApp({ 'CLAUDE.md': '# Rules\n\nUse pnpm.\n' });
    docs('add', '--catalog', 'nuxt:pages');
    assert.match(docs('render').stdout, /appended at the end/);
    docs('render', '--write');
    assert.ok(p.read('CLAUDE.md').startsWith('# Rules\n\nUse pnpm.\n\n<!-- sb-context:docs:start -->'));
    p.write('CLAUDE.md', p.read('CLAUDE.md') + '\n## After\nkeep me\n');
    docs('add', '--catalog', 'nuxt:seo');
    assert.match(docs('render').stdout, /would be replaced/);
    docs('render', '--write');
    const text = p.read('CLAUDE.md');
    assert.ok(text.startsWith('# Rules\n\nUse pnpm.\n\n') && text.endsWith(`${END}\n\n## After\nkeep me\n`));
    assert.match(text, /SEO, meta tags and useSeoMeta/);
    docs('remove', 'nuxt:pages', 'nuxt:seo');
    assert.match(docs('render').stdout, /block would be removed/);
    docs('render', '--write');
    assert.equal(p.read('CLAUDE.md'), '# Rules\n\nUse pnpm.\n\n## After\nkeep me\n');
    assert.match(docs('render', '--write').stdout, /Nothing written: no links/);
  });

  test('render uses .claude/CLAUDE.md when that is the one the project has, and stops on broken markers', () => {
    p = nuxtApp({ '.claude/CLAUDE.md': '# Rules\n' });
    docs('add', '--catalog', 'nuxt:pages');
    docs('render', '--write');
    assert.match(p.read('.claude/CLAUDE.md'), /sb-context:docs:start/);
    assert.equal(p.exists('CLAUDE.md'), false);
    p.write('.claude/CLAUDE.md', `# Rules\n${START}\nhalf a block\n`);
    const r = docs('render', '--write');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /do not pair up/);
    assert.equal(p.read('.claude/CLAUDE.md'), `# Rules\n${START}\nhalf a block\n`);
  });

  test('detect lists saved links to review when the project moved on', () => {
    p = vueLibrary();
    docs('add', JSON.stringify({ url: 'https://v8.example.dev/lib', title: 'Lib mode', package: 'vite', version: '8' }));
    docs('add', JSON.stringify({ url: 'https://pinia.example.dev', title: 'Pinia', package: 'pinia', version: '3' }));
    assert.deepEqual(docs('detect').json().saved.review.map((r) => r.why), ['documents vite 8, the project uses 7', 'pinia is no longer a dependency of the project']);
  });
});

test('docs.mjs refuses to run outside a Nuxt or Vue project', () => {
  const p = makeProject({}, { nuxtConfig: false });
  try {
    const r = p.run(SCRIPTS.docs, ['detect']);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Not inside a Nuxt or Vue project/);
  } finally {
    p.cleanup();
  }
});
