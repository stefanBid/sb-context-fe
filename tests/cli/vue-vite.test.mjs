// sb-design's scripts on a Vue + Vite app: the same checks as on Nuxt, read through the vue-vite adapter
// (style in src/assets/css imported by src/main.ts, useColorMode + inline script, Fontsource).

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS } from '../helpers/fixture.mjs';
import { vueAppStyled } from '../helpers/stacks.mjs';
import { extract, tokens } from '../helpers/design.mjs';
import { matchSnapshot } from '../helpers/snapshot.mjs';

const MAIN = "import { createApp } from 'vue'\nimport './assets/css/main.css'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n";

describe('sb-design on a Vue + Vite app', () => {
  let p;
  afterEach(() => p?.cleanup());
  const inventory = (...args) => {
    const r = p.run(SCRIPTS.inventory, [...args, '--out', 'inv.json']);
    assert.equal(r.code, 0, r.stderr);
    return { md: r.stdout, inv: p.json('inv.json') };
  };

  test('inventory: the reference setup is aligned, with no warnings', () => {
    p = vueAppStyled();
    const { md, inv } = inventory();
    assert.equal(inv.structure.aligned, true, JSON.stringify(inv.structure.checks.filter((c) => !c.ok)));
    assert.deepEqual(inv.project.warnings, []);
    assert.equal(inv.project.srcDir, 'src');
    assert.deepEqual(inv.project.cssInConfig, ['./assets/css/main.css']);
    assert.equal(inv.project.colorMode.attribute, 'data-theme');
    assert.equal(inv.project.colorMode.antiFlash, true);
    assert.deepEqual(inv.project.fonts.packages, { '@fontsource/poppins': ['600', '700'], '@fontsource/inter': ['400', '600', '700'] });
    assert.deepEqual(inv.sources.map((s) => s.file), ['src/assets/css/main.css', 'src/assets/css/theme.css', 'src/assets/css/typography.css', 'src/assets/css/animation.css']);
    assert.match(md, /ok \[P9\] src\/main\.ts imports only src\/assets\/css\/main\.css/);
    matchSnapshot('inventory-vue-vite.md', p.run(SCRIPTS.inventory, []).stdout, { roots: [p.root] });
  });

  test('inventory: what is missing or wrong in a Vue setup is reported', () => {
    p = vueAppStyled({
      'package.json': { dependencies: { vue: '^3.5.0', '@fontsource/inter': '^5.2.0' }, devDependencies: { vite: '^5.1.0', tailwindcss: '^4.1.0' } },
      'vite.config.ts': "import vue from '@vitejs/plugin-vue'\nexport default { plugins: [vue()] }\n",
      'src/main.ts': "import './assets/css/main.css'\nimport '@/assets/css/legacy.css'\nimport 'floating-vue/dist/style.css'\n",
      'src/assets/css/legacy.css': '.dark .x { color: #fff; }\n',
      'src/composables/useTheme.ts': "import { useColorMode } from '@vueuse/core'\nexport const useTheme = () => useColorMode()\n",
      'index.html': '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"><script>document.documentElement.dataset.theme = localStorage.getItem(\'theme\') ?? \'light\'</script>',
    });
    const { inv } = inventory();
    const w = inv.project.warnings.join('\n');
    for (const re of [
      /Vite \^5\.1\.0: @tailwindcss\/vite needs Vite 5\.2 or later/,
      /not plugged in through @tailwindcss\/vite in vite\.config\.ts/,
      /@vueuse\/core is not installed/,
      /useColorMode writes "class", not data-theme/,
      /reads "theme", useColorMode stores "vueuse-color-scheme"/,
      /@fontsource\/inter is installed but not imported in src\/main\.ts/,
      /loads fonts from Google Fonts/,
    ])
      assert.match(w, re);
    assert.equal(inv.structure.checks.find((c) => c.code === 'P9').ok, false);
    assert.deepEqual(inv.project.cssInConfig, ['./assets/css/main.css', '@/assets/css/legacy.css'], 'package CSS is not the project style');
    assert.equal(inv.sources.find((s) => s.file === 'src/assets/css/legacy.css').linked, true);
  });

  test('inventory: no useColorMode and no inline script', () => {
    p = vueAppStyled({ 'src/composables/useTheme.ts': 'export const useTheme = () => {}\n', 'index.html': '<div id="app"></div>' });
    const w = inventory().inv.project.warnings.join('\n');
    assert.match(w, /useColorMode is not called anywhere/);
    assert.match(w, /no inline script that sets data-theme/);
  });

  test('template: the theme is the style imported by src/main.ts', () => {
    p = vueAppStyled({ 'src/main.ts': MAIN, 'src/views/AboutView.vue': '<template><p class="text-gray-500 sb-body">x</p></template>\n' });
    const r = p.run(SCRIPTS.template, ['--summary']);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /theme: src\/assets\/css\/main\.css · prefix: sb/);
    assert.match(r.stdout, /src\/views\/AboutView\.vue \| 1 \|/);
  });

  test('sync-values: in sync with the sample design; a new family points to the Fontsource imports', () => {
    p = vueAppStyled();
    assert.equal(extract(p).code, 0);
    assert.equal(p.run(SCRIPTS.syncValues, ['--check']).code, 0);
    const t = tokens();
    t.type.families.body = '"Roboto", ui-sans-serif, system-ui, sans-serif';
    extract(p, t);
    const r = p.run(SCRIPTS.syncValues, []);
    assert.match(r.stdout, /family changed: "Inter" → "Roboto"\. Update the stack here and the `@fontsource\/\*` imports \(weights\) in src\/main\.ts/);
  });

  test('rename-prefix: renames under src/ and leaves index.html alone when it has no utility', () => {
    p = vueAppStyled();
    const r = p.run(SCRIPTS.renamePrefix, ['--to', 'ps', '--apply']);
    assert.equal(r.code, 0, r.stderr);
    assert.match(p.read('src/views/HomeView.vue'), /class="ps-h1"/);
    assert.match(p.read('src/assets/css/theme.css'), /--ps-primary/);
    assert.doesNotMatch(r.stdout, /index\.html/);
  });
});
