import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ADAPTERS, ADAPTER_NAMES, adapterFor } from '../../plugins/sb-design/scripts/lib/frameworks/index.mjs';
import { styleImportsOf, antiFlashOf, resolveAlias, cssEntries } from '../../plugins/sb-design/scripts/lib/frameworks/vue-vite.mjs';
import * as nuxt from '../../plugins/sb-design/scripts/lib/frameworks/nuxt.mjs';
import { DESIGN_ADAPTERS } from '../../plugins/sb-core/scripts/lib/setup.mjs';
import { makeProject } from '../helpers/fixture.mjs';
import { nuxtApp } from '../helpers/stacks.mjs';

const EXPORTS = ['name', 'IGNORE', 'MODULE_BASES', 'resolveAlias', 'cssEntries', 'p9', 'defaultCss', 'configTargets', 'fontNote', 'styleSetup', 'projectLines'];

describe('sb-design framework adapters', () => {
  test('every adapter exports the whole interface, under its own name', () => {
    for (const [key, a] of Object.entries(ADAPTERS)) {
      assert.equal(a.name, key);
      for (const e of EXPORTS) assert.ok(a[e] !== undefined, `${key}: ${e}`);
    }
  });

  test('sb-core recommends sb-design for exactly the stacks it has an adapter for', () => {
    assert.deepEqual([...DESIGN_ADAPTERS].sort(), [...ADAPTER_NAMES].sort());
  });

  test('adapterFor picks the profile adapter, null otherwise', () => {
    assert.equal(adapterFor({ adapter: 'vue-vite' }).name, 'vue-vite');
    assert.equal(adapterFor({ adapter: null }), null);
    assert.equal(adapterFor(null), null);
  });
});

describe('vue-vite adapter', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('styleImportsOf: side-effect style imports only', () => {
    const code = [
      "import { createApp } from 'vue'",
      "import './assets/css/main.css'",
      'import "@fontsource/inter/400.css"',
      "import styles from './x.module.scss'",
      "import raw from './y.css?inline'",
      "  import '../legacy.sass'",
      "// import './commented.css' is still a line that starts with //",
    ].join('\n');
    assert.deepEqual(styleImportsOf(code), ['./assets/css/main.css', '@fontsource/inter/400.css', './x.module.scss', '../legacy.sass']);
  });

  test('resolveAlias: @/ to src, relative to the importer, / to the root, packages are not files', () => {
    p = makeProject({ 'package.json': { dependencies: { vue: '^3.5.0' } }, 'src/main.ts': '' }, { nuxtConfig: false });
    assert.equal(resolveAlias(p.root, '@/assets/css/main.css'), join(p.root, 'src/assets/css/main.css'));
    assert.equal(resolveAlias(p.root, './assets/a.css', join(p.root, 'src')), join(p.root, 'src/assets/a.css'));
    assert.equal(resolveAlias(p.root, '/src/b.css'), join(p.root, 'src/b.css'));
    assert.equal(resolveAlias(p.root, '@fontsource/inter/400.css'), null);
  });

  test('cssEntries: the entry of the profile, project files apart from package CSS', () => {
    p = makeProject({ 'package.json': { dependencies: { vue: '^3.5.0' } }, 'src/boot.ts': "import './style.css'\nimport 'pkg/a.css'\n" }, { nuxtConfig: false });
    const css = cssEntries(p.root, { entries: { css: 'src/boot.ts' } });
    assert.equal(css.registry, 'src/boot.ts');
    assert.deepEqual(css.entries, [{ spec: './style.css', path: join(p.root, 'src/style.css') }]);
    assert.deepEqual(css.packages, ['pkg/a.css']);
  });

  test('antiFlashOf: an inline script that sets data-theme, with the key it reads', () => {
    assert.deepEqual(antiFlashOf("<script>const m = localStorage.getItem('color-mode'); document.documentElement.setAttribute('data-theme', m)</script>"), { storageKey: 'color-mode' });
    assert.deepEqual(antiFlashOf('<script>document.documentElement.dataset.theme = "dark"</script>'), { storageKey: null });
    assert.equal(antiFlashOf('<script type="module" src="/src/main.ts"></script>'), null);
    assert.equal(antiFlashOf('<script>console.log(1)</script>'), null);
  });
});

describe('nuxt adapter', () => {
  let p;
  afterEach(() => p?.cleanup());

  test('cssEntries: the css array of nuxt.config, aliases resolved against srcDir and root', () => {
    p = nuxtApp({ 'nuxt.config.ts': "export default defineNuxtConfig({ css: ['~/assets/css/main.css', '~~/shared/x.css'] })\n" });
    const css = nuxt.cssEntries(p.root);
    assert.equal(css.registry, 'nuxt.config');
    assert.deepEqual(css.entries.map((e) => e.path), [join(p.root, 'app/assets/css/main.css'), join(p.root, 'shared/x.css')]);
    assert.equal(nuxt.p9(p.root, css).ok, false);
  });
});
