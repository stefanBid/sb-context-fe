#!/usr/bin/env node
// Line-by-line analysis of Vue templates against the project's global style.
//
// Usage (from the root of a Nuxt 4 + Tailwind 4 project):
//   node template.mjs --summary                           counts per file (cheap)
//   node template.mjs app/pages/index.vue app/components  detailed analysis of files or folders
//   options:
//     --css <file>      global style entry point (default: first css entry in nuxt.config,
//                       otherwise <srcDir>/assets/css/main.css)
//     --root <dir>      project root (default: the Nuxt project found from the current folder upward)
//     --out <file>      also save the result as JSON
//
// Each class is judged by compiling it with Tailwind:
//   - "ok":       the project's theme generates it;
//   - "broken":   stock Tailwind generates it, the project's theme does not (closed namespace);
//   - "own":      not a Tailwind class, but defined in the project's CSS or in the file's <style>;
//   - "unknown":  nothing generates it and it is not defined anywhere.
// Never modifies any file.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, extname } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { projectRoot } from '../../../core/lib/project.mjs';
import { prefixFromUtilities } from '../../../scripts/lib/prefix.mjs';
import { parseColor, findColors } from './color.mjs';
import { splitVariants, rootOf, COLOR_ROOTS, classesFromExpression, remPx, lab, PREF, nearestColors as nearestOf, nearestTextRole as nearestRoleOf, headingIssues } from './lib/classes.mjs';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};
const root = projectRoot(opt('--root'));
const summaryOnly = argv.includes('--summary');
const outFile = opt('--out');
const valued = new Set(['--css', '--root', '--out']);
const targets = argv.filter((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1])).map((t) => resolve(root, t));

// ---------------------------------------------------------------------------
// Module resolution (works with pnpm, where transitive deps are not hoisted):
// the project root first, then the location of @tailwindcss/vite and nuxt.
// ---------------------------------------------------------------------------
const req = createRequire(join(root, 'package.json'));
const bases = [req];
for (const pkgName of ['@tailwindcss/vite', 'nuxt']) {
  for (const target of [`${pkgName}/package.json`, pkgName]) {
    try {
      bases.push(createRequire(req.resolve(target)));
      break;
    } catch {}
  }
}
function locate(name) {
  for (const r of bases) {
    try {
      return { r, path: r.resolve(name) };
    } catch {}
  }
  return null;
}
function need(name) {
  const found = locate(name);
  if (!found) {
    console.error(`Module "${name}" not found from the project root, from @tailwindcss/vite or from nuxt. Run the script from the root of a Nuxt 4 project with Tailwind 4 (@tailwindcss/vite) and install its dependencies first.`);
    process.exit(2);
  }
  return found.r(name);
}
async function needEsm(name) {
  const found = locate(name);
  if (!found) return need(name);
  try {
    return await import(pathToFileURL(found.path).href);
  } catch {
    return found.r(name);
  }
}
const postcss = need('postcss');
const { parse: parseSfc } = need('vue/compiler-sfc');
const { compile } = await needEsm('@tailwindcss/node');
const twDir = dirname(locate('tailwindcss/package.json')?.path ?? need('tailwindcss/package.json'));

// ---------------------------------------------------------------------------
// Project configuration
// ---------------------------------------------------------------------------
const configPath = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'].map((f) => join(root, f)).find(existsSync);
const cfg = configPath ? readFileSync(configPath, 'utf8') : '';
const sd = cfg.match(/srcDir\s*:\s*['"`]([^'"`]+)['"`]/);
const srcDir = sd ? resolve(root, sd[1]) : existsSync(join(root, 'app')) ? join(root, 'app') : root;
const firstCss = cfg.match(/\bcss\s*:\s*\[\s*['"`]([^'"`]+)['"`]/)?.[1];
const aliasPath = (e) => (/^~~\/|^@@\//.test(e) ? join(root, e.slice(3)) : /^~\/|^@\//.test(e) ? join(srcDir, e.slice(2)) : resolve(root, e));
const cssEntry = opt('--css') ? resolve(root, opt('--css')) : firstCss ? aliasPath(firstCss) : join(srcDir, 'assets/css/main.css');
if (!existsSync(cssEntry)) {
  console.error(`Global style not found: ${relative(root, cssEntry)}. Pass it with --css.`);
  process.exit(2);
}
const rel = (p) => relative(root, p) || p;

// ---------------------------------------------------------------------------
// Project theme: tokens, color values, utilities, own classes
// ---------------------------------------------------------------------------
const globalCss = new Map();
(function load(p) {
  if (globalCss.has(p) || !existsSync(p)) return;
  const txt = readFileSync(p, 'utf8');
  globalCss.set(p, txt);
  for (const m of txt.matchAll(/@import\s+(?:url\()?['"](\.[^'"]+)['"]/g)) load(resolve(dirname(p), m[1]));
})(cssEntry);

const themeTokens = new Map(); // --color-x -> value (from @theme)
const lightVars = new Map();
const utilities = new Set();
const ownClasses = new Set();
for (const [p, txt] of globalCss) {
  const ast = postcss.parse(txt, { from: p });
  ast.walkAtRules('utility', (a) => utilities.add(a.params.trim()));
  ast.walkRules((r) => {
    for (const m of r.selector.matchAll(/\.((?:\\.|[\w-])+)/g)) ownClasses.add(m[1].replace(/\\/g, ''));
  });
  ast.walkDecls((d) => {
    if (!d.prop.startsWith('--')) return;
    let inTheme = false;
    let sel = '';
    for (let n = d.parent; n && n.type !== 'root'; n = n.parent) {
      if (n.type === 'atrule' && n.name === 'theme') inTheme = true;
      if (n.type === 'rule' && !sel) sel = n.selector;
    }
    if (inTheme) themeTokens.set(d.prop, d.value);
    else if (/:root|\[data-theme=["']?light/.test(sel)) lightVars.set(d.prop, d.value);
  });
}
const resolveVar = (v, depth = 0) =>
  depth > 10 ? v : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, n, fb) => {
    const val = lightVars.get(n) ?? themeTokens.get(n);
    return val !== undefined ? resolveVar(val, depth + 1) : fb ?? `var(${n})`;
  });

const prefix = prefixFromUtilities(utilities);

const themeColors = [];
const textRoles = [];
const radii = [];
const shadows = [];
const families = [];
const weights = [];
const eases = [];
const animations = [];
for (const [k, v] of themeTokens) {
  if (k.endsWith('-*')) continue;
  let m;
  if ((m = k.match(/^--color-([\w-]+)$/))) {
    const c = parseColor(resolveVar(v));
    if (c) themeColors.push({ name: m[1], lab: lab(c) });
  } else if ((m = k.match(/^--text-([\w-]+)$/)) && !k.includes('--', 2) && !k.startsWith('--text-shadow')) {
    const vv = resolveVar(v);
    textRoles.push({ name: m[1], px: remPx(vv) ?? remPx(vv.match(/,\s*([\d.]+rem)\s*\)\s*$/)?.[1] ?? '') ?? null, clamp: /clamp\(/.test(vv) });
  } else if ((m = k.match(/^--radius-([\w-]+)$/))) radii.push({ name: m[1], px: remPx(resolveVar(v)) });
  else if ((m = k.match(/^--shadow-([\w-]+)$/))) shadows.push(m[1]);
  else if ((m = k.match(/^--font-weight-([\w-]+)$/))) weights.push({ name: m[1], w: parseInt(v, 10) });
  else if ((m = k.match(/^--font-([\w-]+)$/)) && !k.startsWith('--font-weight')) families.push(m[1]);
  else if ((m = k.match(/^--ease-([\w-]+)$/))) eases.push(m[1]);
  else if ((m = k.match(/^--animate-([\w-]+)$/))) animations.push(m[1]);
}

// Stock Tailwind: reference values for suggestions
const stock = readFileSync(join(twDir, 'theme.css'), 'utf8');
const stockVal = (name) => stock.match(new RegExp(`${name.replace(/[-]/g, '\\-')}:\\s*([^;]+);`))?.[1]?.trim();

// ---------------------------------------------------------------------------
// Compilers: project and stock Tailwind
// ---------------------------------------------------------------------------
const projectCompiler = await compile(readFileSync(cssEntry, 'utf8'), { base: dirname(cssEntry), onDependency() {} });
const stockCompiler = await compile('@import "tailwindcss";', { base: dirname(cssEntry), onDependency() {} });
const memo = new Map();
let projLen = projectCompiler.build([]).length;
let stockLen = stockCompiler.build([]).length;
function judge(cls, localClasses) {
  if (memo.has(cls)) return memo.get(cls);
  // build() returns the accumulated CSS: a class is generated if the output grows
  const p = projectCompiler.build([cls]).length;
  const inProject = p > projLen;
  projLen = p;
  let res;
  if (inProject) res = 'ok';
  else {
    const s = stockCompiler.build([cls]).length;
    const inStock = s > stockLen;
    stockLen = s;
    const bare = cls.split(':').pop().replace(/^!/, '');
    res = inStock ? 'broken' : ownClasses.has(bare) || localClasses.has(bare) ? 'own' : 'unknown';
  }
  memo.set(cls, res);
  return res;
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------
const nearestColors = (c, n, pref) => nearestOf(themeColors, c, n, pref);
const nearestTextRole = (px, ctx) => nearestRoleOf(textRoles, px, ctx);
function weightOf(classes) {
  for (const c of classes) {
    const v = splitVariants(c);
    if (v.variants.length) continue;
    const m = v.utility.match(/^font-([\w-]+)$/);
    if (!m) continue;
    const w = parseInt(themeTokens.get(`--font-weight-${m[1]}`) ?? stockVal(`--font-weight-${m[1]}`) ?? '', 10);
    if (w) return w;
  }
  return 400;
}
function ctxOf(el) {
  return {
    tag: el.tag,
    weight: /^h[1-6]$/.test(el.tag) ? 700 : weightOf(el.classes),
    uppercase: el.classes.includes('uppercase'),
    display: el.classes.includes('font-display'),
  };
}
const u = (role) => (prefix ? `${prefix}-${role}` : `text-${role}`);
const HEADING_ROLE = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4' };
const REMOVE = '(remove)';

function suggest(cls, el) {
  const { variants, utility } = splitVariants(cls);
  const { root, value } = rootOf(utility);
  const vprefix = variants.length ? variants.join(':') + ':' : '';
  const out = { category: 'other', proposal: null, note: null };

  // removed breakpoint
  const badBp = variants.find((v) => v === '2xl' || v === 'max-2xl' || /^min-\[|^max-\[/.test(v));
  if (badBp && judge(utility, el.local) === 'ok') {
    out.category = 'breakpoint';
    out.proposal = badBp.startsWith('min-[') || badBp.startsWith('max-[') ? null : cls.replace(/(^|:)(max-)?2xl:/, '$1$2xl:');
    out.note = 'Breakpoint outside the method (sm 640, md 768, lg 1024, xl 1280).';
    return out;
  }
  if (!root) return out;

  const isArbitrary = /^\[.*\]$/.test(value) || /^\(.*\)$/.test(value);
  const arb = isArbitrary ? value.slice(1, -1) : null;

  // text sizes
  if (root === 'text') {
    const stockSize = !isArbitrary && stockVal(`--text-${value}`);
    const px = isArbitrary ? remPx(arb) : stockSize ? remPx(stockSize) : null;
    if (px) {
      out.category = 'text';
      const roles = nearestTextRole(px, ctxOf(el));
      const tag = el.tag.toLowerCase();
      if (HEADING_ROLE[tag] && roles.includes(HEADING_ROLE[tag])) {
        out.proposal = REMOVE;
        out.note = `The <${tag}> tag already gets the ${HEADING_ROLE[tag]} style from the base layer.`;
      } else {
        out.proposal = roles.map((r) => vprefix + u(r)).join(' or ');
        out.note = roles.length > 1 ? 'Equidistant: the element\'s role decides.' : `${px}px → ${roles[0]} role.`;
        const maxFixed = Math.max(...textRoles.filter((r) => r.px && !r.clamp).map((r) => r.px));
        if (px > maxFixed && !textRoles.some((r) => r.clamp))
          out.note = `${px}px is larger than display and the theme has no hero role: either display, or add hero to the global style.`;
      }
      return out;
    }
    const roleTok = textRoles.find((r) => r.name === value);
    if (roleTok && prefix && utilities.has(`${prefix}-${value}`)) {
      out.category = 'text';
      out.proposal = vprefix + `${prefix}-${value}`;
      out.note = `text-${value} only sets size and weight: ${prefix}-${value} also sets the family.`;
      return out;
    }
  }

  // weights
  if (root === 'font' && !isArbitrary) {
    const stockW = stockVal(`--font-weight-${value}`);
    if (stockW) {
      const w = parseInt(stockW, 10);
      let best = Infinity;
      for (const x of weights) best = Math.min(best, Math.abs(x.w - w));
      const cands = weights.filter((x) => Math.abs(Math.abs(x.w - w) - best) < 1).map((x) => vprefix + `font-${x.name}`);
      out.category = 'weight';
      out.proposal = cands.join(' or ');
      out.note = cands.length > 1 ? `Weight ${w} is equidistant: the intended emphasis decides.` : `Weight ${w} is not in the theme.`;
      return out;
    }
    if (['sans', 'serif', 'mono'].includes(value)) {
      out.category = 'family';
      const map = { sans: 'body', serif: 'display', mono: 'mono' };
      out.proposal = families.includes(map[value]) ? vprefix + `font-${map[value]}` : null;
      out.note = 'Default Tailwind family.';
      return out;
    }
  }

  // radii
  if (root.startsWith('rounded')) {
    const stockR = value === '' ? '0.25rem' : stockVal(`--radius-${value}`);
    const px = isArbitrary ? remPx(arb) : remPx(stockR ?? '');
    if (px !== null && radii.length) {
      const best = radii.filter((r) => r.px !== null).sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px))[0];
      out.category = 'radius';
      out.proposal = vprefix + `${root}-${best.name}`;
      out.note = `${px}px → ${best.name} (${best.px}px).`;
      return out;
    }
  }

  // shadows
  if (root === 'shadow' && (value === '' || /^(2xs|xs|sm|md|lg|xl|2xl|inner)$/.test(value))) {
    const map = { '': 'sm', '2xs': 'sm', xs: 'sm', sm: 'sm', md: 'md', lg: 'lg', xl: 'lg', '2xl': 'lg' };
    out.category = 'shadow';
    out.proposal = value === 'inner' ? null : shadows.includes(map[value]) ? vprefix + `shadow-${map[value]}` : null;
    out.note = value === 'inner' ? 'No equivalent in the theme: to decide.' : null;
    return out;
  }

  // easings and animations
  if (root === 'ease') {
    // same names as the theme tokens: only valid when the theme defines them
    out.category = 'motion';
    if (['in', 'out', 'in-out'].includes(value) && eases.includes(value)) out.proposal = vprefix + `ease-${value}`;
    else out.note = `The theme has no ease-${value} token: report it, do not guess.`;
    return out;
  }
  if (root === 'animate') {
    out.category = 'motion';
    out.note = animations.length ? `Theme animations: ${animations.join(', ')}.` : null;
    return out;
  }

  // colors
  if (COLOR_ROOTS.has(root)) {
    const raw = isArbitrary ? arb : value.split('/')[0];
    const alpha = value.includes('/') ? '/' + value.split('/').pop() : '';
    const stockC = isArbitrary ? null : stockVal(`--color-${raw}`);
    const c = parseColor(isArbitrary ? raw : stockC ?? '');
    if (c && themeColors.length) {
      out.category = 'color';
      // dark: next to a base class of the same kind: the theme role is enough
      const hasBase = el.classes.some((x) => {
        const s = splitVariants(x);
        return !s.variants.includes('dark') && rootOf(s.utility).root === root;
      });
      if (variants.includes('dark') && hasBase) {
        out.proposal = REMOVE;
        out.note = 'With theme colors the dark theme is automatic: the base class with its role is enough.';
        return out;
      }
      const tag = el.tag.toLowerCase();
      const action = tag === 'button' || (tag === 'a' && el.classes.some((x) => /^(px|py|p)-/.test(x)));
      const pref = root === 'text' ? (/^(white|black)$/.test(raw) ? ['on-primary', 'on-accent', 'on-error', ...PREF.text] : PREF.text)
        : root === 'bg' ? (action ? PREF.bgAction : PREF.bg)
        : /^(border|divide|ring|outline)/.test(root) ? PREF.border : null;
      let names = nearestColors(c, 3, pref);
      if (root === 'text' && /^(white|black)$/.test(raw)) names = [...new Set(['on-primary', 'on-accent', 'on-error', ...names])].filter((n) => themeColors.some((t) => t.name === n)).slice(0, 3);
      out.proposal = names.map((n) => `${vprefix}${root}-${n}${isArbitrary ? '' : alpha}`).join(' or ');
      out.note = /^(white|black)$/.test(raw) && root === 'text'
        ? 'Text on a fill: on-primary, on-accent or on-error, depending on the background.'
        : 'Nearby theme colors, ordered by the role that suits the property: choose by role, not by similarity.';
      return out;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Files to analyze
// ---------------------------------------------------------------------------
const IGNORE = new Set(['node_modules', '.nuxt', '.output', '.git', 'dist', '.data', 'coverage']);
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  if (statSync(dir).isFile()) {
    if (extname(dir) === '.vue') out.push(dir);
    return out;
  }
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name) || name.startsWith('.')) continue;
    walk(join(dir, name), out);
  }
  return out;
}
const files = (targets.length ? targets : [srcDir]).flatMap((t) => walk(t));
if (!files.length) {
  console.error('No .vue files found in the given paths.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
const results = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let descriptor;
  try {
    const parsed = parseSfc(src, { filename: file });
    // the parser does not throw on a malformed template: it lists the errors and returns a partial tree
    if (parsed.errors.length) {
      const e = parsed.errors[0];
      results.push({ file: rel(file), error: `${e.message}${e.loc ? ` (line ${e.loc.start.line})` : ''}${parsed.errors.length > 1 ? ` and ${parsed.errors.length - 1} more` : ''}` });
      continue;
    }
    descriptor = parsed.descriptor;
  } catch (e) {
    results.push({ file: rel(file), error: e.message });
    continue;
  }
  const local = new Set();
  const styleIssues = [];
  for (const st of descriptor.styles) {
    const offset = st.loc.start.line - 1;
    let ast;
    try {
      ast = postcss.parse(st.content);
    } catch {
      continue;
    }
    ast.walkRules((r) => {
      for (const m of r.selector.matchAll(/\.((?:\\.|[\w-])+)/g)) local.add(m[1]);
    });
    ast.walkDecls((d) => {
      if (d.prop.startsWith('--')) return;
      const line = (d.source?.start?.line ?? 0) + offset;
      const sel = d.parent?.selector ?? '';
      const cols = findColors(d.value);
      if (cols.length) styleIssues.push({ line, selector: sel, prop: d.prop, value: d.value, kind: 'literal color', proposal: nearestColors(parseColor(cols[0]) ?? { r: 0, g: 0, b: 0, a: 1 }).map((n) => `var(--color-${n})`).join(' or ') });
      if (/^(font-size|font)$/.test(d.prop) && !/var\(/.test(d.value)) {
        const px = remPx(d.value.match(/([\d.]+(?:px|rem))/)?.[1] ?? '');
        if (px) styleIssues.push({ line, selector: sel, prop: d.prop, value: d.value, kind: 'text size outside the theme', proposal: nearestTextRole(px).map((r) => `@apply ${u(r)}`).join(' or ') });
      }
      if (d.prop === 'font-weight' && !/^var\(/.test(d.value) && weights.length && !weights.some((x) => x.w === (d.value === 'normal' ? 400 : d.value === 'bold' ? 700 : parseInt(d.value, 10)))) styleIssues.push({ line, selector: sel, prop: d.prop, value: d.value, kind: 'weight outside the theme', proposal: weights.map((x) => x.w).join(', ') });
      if (/^(font-family)$/.test(d.prop) && !/var\(/.test(d.value)) styleIssues.push({ line, selector: sel, prop: d.prop, value: d.value, kind: 'hard-coded family', proposal: families.map((f) => `var(--font-${f})`).join(' or ') });
    });
  }

  const rows = [];
  const headings = [];
  const ast = descriptor.template?.ast;
  const walkNode = (node) => {
    if (node.type === 1) {
      const line = node.loc.start.line;
      const tag = node.tag;
      if (/^h[1-6]$/.test(tag)) headings.push({ line, level: +tag[1] });
      const statics = [];
      const dynamics = [];
      let style = null;
      for (const pr of node.props) {
        if (pr.type === 6 && pr.name === 'class' && pr.value) statics.push(...pr.value.content.split(/\s+/).filter(Boolean));
        if (pr.type === 7 && pr.name === 'bind' && pr.arg?.content === 'class' && pr.exp) dynamics.push(...classesFromExpression(pr.exp.content));
        if (pr.type === 6 && pr.name === 'style' && pr.value) style = pr.value.content;
        if (pr.type === 7 && pr.name === 'bind' && pr.arg?.content === 'style') style = style ?? `(dynamic) ${pr.exp?.content ?? ''}`;
      }
      const el = { tag, classes: [...statics, ...dynamics], local };
      for (const [list, dynamic] of [[statics, false], [dynamics, true]]) {
        for (const cls of list) {
          const status = judge(cls, local);
          const { utility } = splitVariants(cls);
          const arbitrary = /\[.*\]/.test(utility) && rootOf(utility).root;
          const isDarkColor = cls.startsWith('dark:') && COLOR_ROOTS.has(rootOf(utility).root ?? '') && status === 'ok' && themeColors.some((t) => utility.endsWith('-' + t.name));
          const roleTextNoFamily = status === 'ok' && /^text-/.test(utility) && prefix && utilities.has(`${prefix}-${utility.slice(5)}`);
          const sameAsBase = status === 'ok' && prefix && /^h[1-4]$/.test(tag) && utility === `${prefix}-${tag}`;
          if (status === 'broken' || arbitrary || isDarkColor || roleTextNoFamily || sameAsBase) {
            const s = status === 'broken' || arbitrary || roleTextNoFamily
              ? suggest(cls, el)
              : { category: isDarkColor ? 'color' : 'text', proposal: REMOVE, note: isDarkColor ? 'The theme color already changes in dark mode.' : `The <${tag}> tag already has this style from the base layer.` };
            rows.push({ line, tag, class: cls, dynamic, status: status === 'broken' ? 'broken' : arbitrary ? 'arbitrary value' : 'redundant', ...s });
          } else if (status === 'unknown') {
            rows.push({ line, tag, class: cls, dynamic, status: 'unknown', category: 'other', proposal: null, note: 'Not a Tailwind class and not defined in the CSS: a typo or a removed class?' });
          }
        }
      }
      if (style && (findColors(style).length || /font-size|font-weight|font-family|border-radius|box-shadow/.test(style))) {
        const props = [];
        if (!style.startsWith('(dynamic)')) {
          for (const decl of style.split(';')) {
            const [k, ...rest] = decl.split(':');
            const prop = k?.trim().toLowerCase();
            const val = rest.join(':').trim();
            if (!prop || !val) continue;
            const col = findColors(val)[0];
            if (col && parseColor(col)) {
              const r = prop === 'color' ? 'text' : prop.startsWith('background') ? 'bg' : prop.startsWith('border') ? 'border' : null;
              if (r) props.push(`${r}-${nearestColors(parseColor(col), 1, r === 'text' ? PREF.text : r === 'bg' ? PREF.bg : PREF.border)[0]}`);
            }
            if (prop === 'font-size') {
              const px = remPx(val);
              if (px) props.push(nearestTextRole(px, ctxOf(el)).map(u).join(' or '));
            }
          }
        }
        rows.push({ line, tag, class: `style="${style}"`, dynamic: style.startsWith('(dynamic)'), status: 'inline style', category: 'inline', proposal: props.length ? props.join(' ') : null, note: 'Inline style with theme values: move it into classes.' });
      }
    }
    for (const ch of node.children ?? []) walkNode(ch);
    if (node.branches) for (const b of node.branches) walkNode(b);
  };
  if (ast) walkNode(ast);

  // headings
  const isPage = /[\\/]pages[\\/]/.test(file);
  results.push({ file: rel(file), rows: rows.sort((a, b) => a.line - b.line), style: styleIssues, headings: headingIssues(headings, isPage), outline: headings });
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
if (outFile) writeFileSync(outFile, JSON.stringify({ cssEntry: rel(cssEntry), prefix, results }, null, 2));
const L = [];
const p = (s = '') => L.push(s);
const count = (r, st) => r.rows?.filter((x) => x.status === st).length ?? 0;

if (summaryOnly) {
  p(`# Template summary — theme: ${rel(cssEntry)} · prefix: ${prefix ?? 'not detected'}\n`);
  p('| File | Broken | Arbitrary | Redundant | Unknown | Inline | `<style>` | Headings |');
  p('| --- | --- | --- | --- | --- | --- | --- | --- |');
  const sorted = results.filter((r) => !r.error).map((r) => ({ r, tot: (r.rows?.length ?? 0) + r.style.length + r.headings.length })).sort((a, b) => b.tot - a.tot);
  for (const { r, tot } of sorted) {
    if (!tot) continue;
    p(`| ${r.file} | ${count(r, 'broken')} | ${count(r, 'arbitrary value')} | ${count(r, 'redundant')} | ${count(r, 'unknown')} | ${count(r, 'inline style')} | ${r.style.length} | ${r.headings.length} |`);
  }
  const clean = sorted.filter((s) => !s.tot).length;
  p(`\nFiles with nothing to change: ${clean} of ${results.length}.`);
  for (const r of results.filter((r) => r.error)) p(`- ERROR ${r.file}: ${r.error}`);
} else {
  p(`# Template analysis — theme: ${rel(cssEntry)} · prefix: ${prefix ?? 'not detected'}\n`);
  for (const r of results) {
    if (r.error) {
      p(`## ${r.file}\n\nERROR: ${r.error}\n`);
      continue;
    }
    if (!r.rows.length && !r.style.length && !r.headings.length) continue;
    p(`## ${r.file}\n`);
    if (r.rows.length) {
      p('| Line | Tag | Class | Status | Proposal | Note |');
      p('| --- | --- | --- | --- | --- | --- |');
      for (const x of r.rows) p(`| ${x.line} | \`<${x.tag}>\` | \`${x.class}\`${x.dynamic ? ' (dynamic)' : ''} | ${x.status} | ${x.proposal ? `\`${x.proposal}\`` : '—'} | ${x.note ?? ''} |`);
      p();
    }
    if (r.style.length) {
      p('**Component `<style>`**\n');
      for (const s of r.style) p(`- line ${s.line} \`${s.selector}\` ${s.prop}: ${s.value} — ${s.kind}${s.proposal ? ` → \`${s.proposal}\`` : ''}`);
      p();
    }
    if (r.headings.length) {
      p('**Headings**\n');
      for (const t of r.headings) p(`- ${t}`);
      p();
    }
  }
  const tot = results.reduce((s, r) => s + (r.rows?.length ?? 0) + (r.style?.length ?? 0), 0);
  p(`Total changes flagged: ${tot} in ${results.filter((r) => (r.rows?.length ?? 0) + (r.style?.length ?? 0) + (r.headings?.length ?? 0)).length} of ${results.length} files.`);
}
console.log(L.join('\n'));
