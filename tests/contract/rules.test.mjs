// The rules of sb-design, and the layer each one belongs to. A rule that disappears from the docs changes what
// the skills do without any error: here it fails the build. Moving a rule to another layer is a decision, made
// by editing this list.
//
//   standard  plugins/sb-design/standard/        fixed for every engine and framework
//   engine    plugins/sb-design/engines/tailwind4/   how the standard becomes Tailwind 4 CSS
//   framework plugins/sb-design/frameworks/nuxt.*    where the style lives and how it is registered in Nuxt

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, lf } from '../helpers/fixture.mjs';

const DESIGN = join(REPO, 'plugins/sb-design');
const files = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((e) => {
        const p = join(dir, e);
        return statSync(p).isDirectory() ? files(p) : [p];
      })
    : [];
const text = (paths) => paths.map((p) => lf(readFileSync(p, 'utf8'))).join('\n');

export const LAYERS = {
  standard: () => text(files(join(DESIGN, 'standard'))),
  engine: () => text(files(join(DESIGN, 'engines/tailwind4'))),
  framework: () => text(files(join(DESIGN, 'frameworks')).filter((p) => /[\\/]nuxt\.[a-z.]+$/.test(p))),
};

/** [id, layer, pattern] */
export const RULES = [
  // values vs structure
  ['design-source values win', 'standard', /if `design-source\.md` exists, its values win/],
  ['no eyebrows, ever', 'standard', /no eyebrows, ever/i],
  ['overline is never a kicker', 'standard', /never a kicker above a heading/i],
  ['example values are never copied', 'standard', /Never introduce a value from the `example\/` files/],
  ['only the global state', 'standard', /only and exclusively the global state/],
  ['the four files', 'standard', /`main\.css`, `theme\.css`, `typography\.css`, `animation\.css`/],
  // typography
  ['closed set of type roles', 'standard', /\| `overline` \| body \|/],
  ['body 1rem floor', 'standard', /body is \*\*1rem\*\* or more/],
  ['inputs never below 16px', 'standard', /never below \*\*16px\*\*/],
  ['prose measure', 'standard', /45–75ch/],
  ['display at most 6rem', 'standard', /at most \*\*6rem\*\*/],
  ['tracking floor', 'standard', /not below \*\*−0\.04em\*\*/],
  ['adjacent roles distinct', 'standard', /visibly distinct/],
  ['stepped sizes, only display h1 h2 at lg', 'standard', /Only `display`, `h1` and `h2` change, and they change at `lg`/],
  ['clamp only above display', 'standard', /clamp\(\): only above `display`/],
  ['clamp formula', 'standard', /slope = \(max − min\) \/ 40/],
  ['clamped line height unitless', 'standard', /always \*\*unitless\*\*/],
  ['one hero role', 'standard', /There is \*\*one\*\* `hero` role/],
  ['equidistant: the element decides', 'standard', /\*\*Equidistant between two steps\*\*: the \*\*element's role\*\* decides/],
  ['near-duplicates merged', 'standard', /\*\*Near-duplicates\*\*/],
  ['component text roles', 'standard', /\| button text \| `body-strong`/],
  // breakpoints and shapes
  ['fixed breakpoints', 'standard', /`sm` 640, `md` 768, `lg` 1024, `xl` 1280/],
  ['closed radii', 'standard', /`sm`, `md`, `lg` \(\+ `xl` if the project needs a fourth step/],
  ['three shadow levels', 'standard', /merged into three levels/],
  // color
  ['color roles vocabulary', 'standard', /`primary`, `primary-hover`, `on-primary`, `primary-soft`/],
  ['recommended base', 'standard', /\*\*Recommended base\.\*\*/],
  ['contrast 4.5:1 text', 'standard', /text: \*\*4\.5:1\*\*/],
  ['contrast 3:1 large text and controls', 'standard', /\*\*3:1\*\*/],
  ['correct only lightness', 'standard', /move \*\*only lightness\*\*/],
  ['contrast in both themes', 'standard', /in \*\*both themes\*\*/],
  ['dark is not an inversion', 'standard', /\*\*not\*\* an inversion/],
  ['calibration non-normative', 'standard', /\*\*Non-normative\.\*\* OKLCH lightness/],
  ['literal colors only in theme.css', 'standard', /Literal colors only in `theme\.css`/],
  // fonts
  ['two family roles', 'standard', /`--font-display`: headings/],
  ['no pairing judgement', 'standard', /does \*\*not\*\* judge font pairing/],
  ['more than two families: ask', 'standard', /More than two families in use/],
  // motion
  ['duration bands', 'standard', /`--\{p\}-duration-feedback` \| 120ms/],
  ['ease-out arrival', 'standard', /cubic-bezier\(0\.16, 1, 0\.3, 1\)/],
  ['exit faster than entrance', 'standard', /Exit faster than entrance/],
  ['never transition all', 'standard', /Never `transition: all`/],
  ['reduced motion through motion-distance', 'standard', /`--\{p\}-motion-distance` has a default value/],
  ['durations not zeroed', 'standard', /Durations are \*\*not\*\* zeroed/],

  // Tailwind 4
  ['Tailwind 4 required, Tailwind 3 stops', 'engine', /Tailwind 3/],
  ['text token shape', 'engine', /--text-<role>--line-height/],
  ['colors mapped in @theme inline', 'engine', /colors are mapped in `@theme inline`/],
  ['dark variant follows data-theme', 'engine', /@custom-variant dark/],
  ['closed namespaces', 'engine', /`color, font, text, shadow, radius, font-weight, inset-shadow, drop-shadow, text-shadow, ease, animate, breakpoint`/],
  ['only static utilities remain', 'engine', /`transparent`, `current`, `inherit`, `rounded-none`, `rounded-full`, `shadow-none`/],
  ['one utility per role', 'engine', /one utility per role: `\{p\}-display`/],
  ['mobile step inside the utility', 'engine', /`@variant lg`/],
  ['overline utility uppercase', 'engine', /`\{p\}-overline` adds `uppercase`/],
  ['prefix not a Tailwind root', 'engine', /cannot match a Tailwind utility root/],
  ['token names without prefix', 'engine', /Tailwind token names are the roles without a prefix/],
  ['font namespace reset', 'engine', /`--font-\*: initial`/],
  ['default font family', 'engine', /--default-font-family: var\(--font-body\)/],
  ['weights closed', 'engine', /`--font-weight-\*: initial`/],
  ['easings closed', 'engine', /`--ease-\*: initial`/],
  ['animations closed', 'engine', /`--animate-\*: initial`/],
  ['class mapping: role before similarity', 'engine', /role before similarity/i],
  ['@reference before @apply in components', 'engine', /@reference/],

  // Nuxt
  ['Nuxt 4 required', 'framework', /Nuxt 4/],
  ['global style in app/assets/css', 'framework', /app\/assets\/css/],
  ['only main.css in nuxt.config css', 'framework', /`css` contains \*\*only\*\* `~\/assets\/css\/main\.css`/],
  ['nuxt.config keys align may change', 'framework', /`modules`, `css`, `colorMode`, `fonts`/],
  ['tailwind vite plugin', 'framework', /`vite\.plugins`/],
  ['install color-mode and fonts', 'framework', /npx nuxi module add color-mode/],
  ['color-mode writes data-theme', 'framework', /`dataValue: 'theme'`/],
  ['color-mode no class suffix', 'framework', /`classSuffix: ''`/],
  ['color-mode follows the system', 'framework', /`preference: 'system'`/],
  ['fonts.families with the weights in use', 'framework', /`fonts\.families`/],
  ['local fonts from public/', 'framework', /serves them from `public\/`/],
  ['build command', 'framework', /npx nuxi build/],
  ['extract-ui: layouts', 'framework', /`app\/layouts\/<name>\.vue`/],
  ['extract-ui: auto-import naming', 'framework', /components\/form\/Field\.vue/],
  ['extract-ui: localized links', 'framework', /NuxtLinkLocale/],
  ['extract-ui: SEO', 'framework', /useSeoMeta/],
  ['extract-ui: page meta', 'framework', /definePageMeta/],
  ['extract-ui: images', 'framework', /<NuxtImg>/],
  ['extract-ui: icons', 'framework', /`@nuxt\/icon`/],
  ['@reference path alias', 'framework', /@reference "~\/assets\/css\/main\.css";/],
];

/** Every issue code of the catalog, with the layer whose file says how to correct it. */
export const CODES = {
  standard: ['P6', 'P7', 'P8', 'P10', 'P11', 'S1', 'S2', 'S4', 'S6', 'S7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T8', 'T9', 'T10', 'T12', 'T13', 'T14', 'T16', 'B1', 'B3', 'C1', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C12', 'F1', 'F2', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  engine: ['P2', 'P5', 'S3', 'B2', 'S5', 'T11', 'T15', 'C2', 'C13', 'F3'],
  framework: ['P1', 'P3', 'P4', 'P9', 'T7', 'C11'],
};

describe('sb-design rules: each one lives in its layer', () => {
  const layer = Object.fromEntries(Object.entries(LAYERS).map(([k, f]) => [k, f()]));
  for (const [id, where, re] of RULES) test(`${where}: ${id}`, () => assert.match(layer[where], re));

  test('every issue code is in the catalog with its layer', () => {
    const catalog = lf(readFileSync(join(DESIGN, 'standard/issues.md'), 'utf8'));
    for (const [where, codes] of Object.entries(CODES))
      for (const c of codes) assert.match(catalog, new RegExp(`^\\| ${c} \\|[^\\n]*\\| ${where} \\|`, 'm'), `${c} (${where})`);
    const all = Object.values(CODES).flat();
    const listed = [...catalog.matchAll(/^\| ([PSTBCFMI]\d+) \|/gm)].map((m) => m[1]).filter((c) => !c.startsWith('I'));
    assert.deepEqual([...listed].sort(), [...all].sort(), 'codes in the catalog and in this list differ');
  });

  test('the framework file corrects every framework code', () => {
    for (const c of CODES.framework) assert.match(layer.framework, new RegExp(`\\b${c}\\b`), c);
  });
});
