import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeProject, withExampleStyle, SCRIPTS, EXAMPLE_CSS } from '../helpers/fixture.mjs';

const DEPS = { nuxt: '^4.1.0', tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0', '@nuxtjs/color-mode': '^3.5.0', '@nuxt/fonts': '^0.11.0' };

const LEGACY_CSS = `:root { --brand: #00804a; --size-big: 1.5rem; }
body { font: 400 16px/1.5 Inter, sans-serif; color: #1a1a1a; }
h1 { font-size: var(--size-big); line-height: 2rem; font-weight: 700; }
h2 { font-size: 23px; }
h3 { font-size: 15px; }
.lead { font-size: 17px; }
.note { font-size: 15px; }
.big { font-size: 28px; }
.bigger { font-size: 30px; }
.card { background: #fff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.1); color: rgb(255 0 0); }
.hero { font-size: clamp(2rem, 5vw, 4rem); }
@media (max-width: 900px) { .card { border-color: #eee; } }
@media (min-width: 768px) { .x { color: red; } }
`;

describe('inventory.mjs', () => {
  let p;
  afterEach(() => p?.cleanup());
  const inventory = (...args) => {
    const r = p.run(SCRIPTS.inventory, [...args, '--out', 'inv.json']);
    assert.equal(r.code, 0, r.stderr);
    return { md: r.stdout, inv: p.json('inv.json') };
  };

  test('recognizes the reference style as aligned', () => {
    p = withExampleStyle(makeProject({ 'nuxt.config.ts': readFileSync(`${EXAMPLE_CSS}/nuxt.config.ts`, 'utf8'), 'package.json': { devDependencies: DEPS } }));
    const { md, inv } = inventory();
    assert.equal(inv.structure.aligned, true, JSON.stringify(inv.structure.checks.filter((c) => !c.ok)));
    assert.equal(inv.structure.prefix, 'sb');
    assert.deepEqual(inv.project.warnings, []);
    assert.equal(inv.scale.source, 'tokens');
    assert.deepEqual(inv.scale.steps.map((s) => s.px), [12, 14, 16, 18, 19, 22, 30, 40, 56]);
    assert.equal(inv.resets.length, 12);
    assert.deepEqual(inv.scatteredColors, []);
    assert.deepEqual(inv.project.fonts.families, ['Poppins', 'Inter']);
    assert.match(md, /\*\*Already aligned: yes \(prefix "sb"\)\*\*/);
    assert.match(md, /Not analyzed \(optional: rerun with --classes/);
  });

  test('a legacy setup: warnings, clusters of sizes, scattered colors, breakpoints', () => {
    p = makeProject({
      'nuxt.config.ts': "export default defineNuxtConfig({\n  modules: ['@nuxtjs/tailwindcss'],\n  css: ['~/assets/css/legacy.css', '@/assets/css/missing.css'],\n})\n",
      'package.json': { dependencies: { nuxt: '^3.12.0', tailwindcss: '^3.4.0', '@nuxtjs/tailwindcss': '^6.0.0' } },
      'app/assets/css/legacy.css': LEGACY_CSS,
      'app/assets/css/orphan.css': '.o { color: #123; }',
      'app/components/A.vue': '<template><div/></template>\n<style scoped>.a { color: red; }</style>',
    });
    const { md, inv } = inventory();
    const w = inv.project.warnings.join('\n');
    for (const re of [/Nuxt \^3\.12\.0/, /Tailwind \^3\.4\.0/, /@nuxtjs\/tailwindcss is the Tailwind 3 module/, /color-mode is not installed/, /fonts is not installed/, /CSS file not found: app\/assets\/css\/missing\.css/])
      assert.match(w, re);
    assert.equal(inv.structure.aligned, false);
    assert.equal(inv.ignoredScopedStyles, 1);
    assert.deepEqual(inv.sources.map((s) => `${s.file}:${s.linked}`), ['app/assets/css/legacy.css:true', 'app/assets/css/orphan.css:false']);

    assert.equal(inv.scale.source, 'clusters (proposed, provisional)');
    assert.deepEqual(inv.scale.clusters.map((c) => [c.members.map((m) => m.px), c.proposed]), [
      [[15, 16], 15],
      [[17], 17],
      [[23, 24], 23],
      [[28, 30], 28],
    ]);
    const h1 = inv.sizes.find((s) => s.selector === 'h1');
    assert.equal(h1.px, 24, 'var() resolved');
    assert.equal(h1.lineHeightRatio, 1.333);
    assert.equal(h1.weight, '700');
    const body = inv.sizes.find((s) => s.selector === 'body');
    assert.equal(body.lineHeightRatio, 1.5, 'font shorthand');
    assert.ok(inv.sizes.some((s) => s.kind === 'clamp' && s.selector === '.hero'));

    assert.deepEqual(inv.scatteredColors.map((c) => c.color ?? c.prop).sort(), ['#123', '#1a1a1a', '#eee', '#fff', 'red', 'rgb(255 0 0)', 'rgba(0,0,0,.1)'].sort().filter((x) => x !== 'red'));
    assert.deepEqual(inv.widths.map((x) => `${x.px}:${x.inMethod}:${x.maxWidth}`), ['768:true:0', '900:false:1']);
    assert.match(md, /900px × 1 — \*\*not a method breakpoint\*\*/);
  });

  test('--file analyzes loose files outside a project', () => {
    p = makeProject({ 'loose/a.css': '.a { font-size: 14px; color: #000; }', 'loose/b.css': '@import "./a.css";\n.b { font-size: 18px; }' }, { nuxtConfig: false });
    const { inv } = inventory('--file', p.path('loose/b.css'));
    assert.deepEqual(inv.sources.map((s) => s.file), ['b.css', 'a.css']);
    assert.equal(inv.project.dependencies, undefined);
    assert.deepEqual(inv.sizes.map((s) => s.px).sort(), [14, 18]);
  });

  test('--classes measures the impact of closing the namespaces', () => {
    p = withExampleStyle(makeProject({ 'app/components/A.vue': '<template><p class="text-gray-500 md:text-sm rounded-xl rounded-t-2xl font-sans dark:bg-black text-[13px]"></p></template>' }));
    const { inv } = inventory('--classes');
    const byCat = Object.fromEntries(inv.impact.map((e) => [`${e.category}|${e.class}`, e.count]));
    for (const k of ['default palette|text-gray-500', 'default text sizes|md:text-sm', 'radii that change value|rounded-xl', 'removed radii|rounded-t-2xl', 'default families|font-sans', 'dark: variant|dark:bg-black', 'default palette|dark:bg-black', 'arbitrary values|text-[13px]'])
      assert.equal(byCat[k], 1, k);
  });
});
