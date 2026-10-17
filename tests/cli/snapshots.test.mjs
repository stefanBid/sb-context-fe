import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeProject, withExampleStyle, run, SCRIPTS, EXAMPLE_CSS, EXAMPLE_NUXT_CONFIG } from '../helpers/fixture.mjs';
import { extract, SOURCE } from '../helpers/design.mjs';
import { matchSnapshot } from '../helpers/snapshot.mjs';

// The formats other skills, and the model, read. Each test pins a whole output.
describe('output snapshots', () => {
  const p = withExampleStyle(makeProject({
    'nuxt.config.ts': readFileSync(EXAMPLE_NUXT_CONFIG, 'utf8'),
    'package.json': { devDependencies: { nuxt: '^4.1.0', tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0', '@nuxtjs/color-mode': '^3.5.0', '@nuxt/fonts': '^0.11.0' } },
    'app/pages/index.vue': '<template>\n  <main>\n    <h1 class="text-4xl font-medium text-gray-700">Title</h1>\n    <p class="sb-body text-ink-muted rounded-xl shadow">Text</p>\n  </main>\n</template>\n',
  }));
  const roots = [p.root];
  after(() => p.cleanup());

  test('design-source.md (design-extract-style → style-align, design-extract-ui)', () => {
    extract(p);
    matchSnapshot('design-source.md', p.read(SOURCE), { roots });
  });

  test('sync-values report on a drifted design', () => {
    const t = JSON.parse(p.read('design/tokens.json'));
    t.color.tokens.find((c) => c.name === 'primary').value.light = '#123456';
    t.radius.tokens.push({ name: 'radius-xl', value: '30px' });
    extract(p, t);
    matchSnapshot('sync-values.txt', p.run(SCRIPTS.syncValues, []).stdout, { roots });
  });

  test('inventory report (style-align)', () => {
    matchSnapshot('inventory.md', p.run(SCRIPTS.inventory, []).stdout, { roots });
  });

  test('template analysis (style-migrate)', () => {
    matchSnapshot('template.md', p.run(SCRIPTS.template, ['app/pages/index.vue']).stdout, { roots });
  });

  // a cell with an unescaped | splits into two: the row no longer lines up with its header (GFM, code spans included)
  const brokenRows = (md) => {
    const cells = (row) => row.replace(/\\\|/g, '').split('|').length;
    const out = [];
    let header = null;
    for (const line of md.split('\n')) {
      if (!line.startsWith('|')) header = null;
      else if (!header) header = cells(line);
      else if (cells(line) !== header) out.push(line);
    }
    return out;
  };

  test('report tables keep their columns', () => {
    for (const [name, md] of [
      ['inventory', p.run(SCRIPTS.inventory, []).stdout],
      ['template', p.run(SCRIPTS.template, ['app/pages/index.vue']).stdout],
      ['sync-values', p.run(SCRIPTS.syncValues, []).stdout],
      ['contrast', run(SCRIPTS.contrast, [`${EXAMPLE_CSS}/theme.css`, '--prefix', 'sb']).stdout],
      ['design-source', p.read(SOURCE)],
    ])
      assert.deepEqual(brokenRows(md), [], name);
  });

  test('contrast report (style-align)', () => {
    const out = run(SCRIPTS.contrast, [`${EXAMPLE_CSS}/theme.css`, '--prefix', 'sb']).stdout;
    matchSnapshot('contrast.md', out.replace(EXAMPLE_CSS.replaceAll('\\', '/'), '<example>').replace(EXAMPLE_CSS, '<example>'), { roots });
  });
});
