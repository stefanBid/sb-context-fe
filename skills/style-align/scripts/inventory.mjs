#!/usr/bin/env node
// Inventory of the global style of a Nuxt 4 + Tailwind 4 project.
//
// Usage (from the project root):
//   node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs"                     analyze the project
//   node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs" --root ../app       another root
//   node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs" --file a.css --file b.css   only these files
//   --out path.json   also save the full inventory as JSON
//   --classes         also scan the classes used in components (impact of closing
//                     the Tailwind namespaces). Off by default: it reads every
//                     .vue/.ts/.js file in the project; use it only if the user asks.
//
// Prints a Markdown summary. Never modifies any file.
// Requires postcss, which a Nuxt project already has (resolved from the project root,
// then from @tailwindcss/vite and nuxt, so it also works with pnpm).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, extname } from 'node:path';
import { createRequire } from 'node:module';
import { findColors, parseColor, toHex } from './color.mjs';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const getAll = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
const get = (n) => getAll(n)[0] ?? null;
const root = resolve(get('--root') || process.cwd());
const explicitFiles = getAll('--file').map((f) => resolve(f));
const outFile = get('--out');
const scanClasses = argv.includes('--classes');

// ---------------------------------------------------------------------------
// postcss: from the project root, then from the location of @tailwindcss/vite
// and nuxt (pnpm does not hoist transitive dependencies), then fail clearly
// ---------------------------------------------------------------------------
function loadPostcss() {
  const bases = [createRequire(join(root, 'package.json'))];
  const first = bases[0];
  for (const pkgName of ['@tailwindcss/vite', 'nuxt']) {
    for (const target of [`${pkgName}/package.json`, pkgName]) {
      try {
        bases.push(createRequire(first.resolve(target)));
        break;
      } catch {}
    }
  }
  bases.push(createRequire(join(process.cwd(), 'package.json')));
  for (const r of bases) {
    try {
      return r('postcss');
    } catch {}
  }
  console.error('postcss not found from the project root, from @tailwindcss/vite or from nuxt. Run the script from the root of a Nuxt 4 project with its dependencies installed.');
  process.exit(2);
}
const postcss = loadPostcss();

function commonDir(paths) {
  if (!paths.length) return root;
  const parts = paths.map((p) => dirname(p).split('/'));
  const out = [];
  for (let i = 0; parts.every((p) => p[i] !== undefined && p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join('/') || '/';
}
const displayRoot = explicitFiles.length ? commonDir(explicitFiles) : root;
const rel = (p) => relative(displayRoot, p) || p;
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// 1. Project: versions, modules, configuration
// ---------------------------------------------------------------------------
const project = { root, warnings: [] };
const pkg = readJson(join(root, 'package.json'));
if (pkg && !explicitFiles.length) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const ver = (n) => deps[n] ?? null;
  project.dependencies = {
    nuxt: ver('nuxt'),
    tailwindcss: ver('tailwindcss'),
    '@tailwindcss/vite': ver('@tailwindcss/vite'),
    '@nuxtjs/tailwindcss': ver('@nuxtjs/tailwindcss'),
    '@nuxtjs/color-mode': ver('@nuxtjs/color-mode'),
    '@nuxt/fonts': ver('@nuxt/fonts'),
  };
  const major = (v) => (v ? parseInt(String(v).replace(/^[^\d]*/, ''), 10) : null);
  if (major(ver('nuxt')) !== null && major(ver('nuxt')) < 4) project.warnings.push(`Nuxt ${ver('nuxt')}: the skill only works with Nuxt 4.`);
  if (!ver('tailwindcss')) project.warnings.push('tailwindcss is not among the dependencies.');
  else if (major(ver('tailwindcss')) < 4) project.warnings.push(`Tailwind ${ver('tailwindcss')}: the skill only works with Tailwind 4.`);
  if (ver('@nuxtjs/tailwindcss')) project.warnings.push('@nuxtjs/tailwindcss is the Tailwind 3 module: with Tailwind 4, use @tailwindcss/vite.');
  if (!ver('@nuxtjs/color-mode')) project.warnings.push('@nuxtjs/color-mode is not installed (required).');
  if (!ver('@nuxt/fonts')) project.warnings.push('@nuxt/fonts is not installed (required).');
}

const configPath = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'].map((f) => join(root, f)).find(existsSync);
let srcDir = root;
const cssEntries = [];
if (configPath && !explicitFiles.length) {
  const cfg = readFileSync(configPath, 'utf8');
  project.config = rel(configPath);
  const sd = cfg.match(/srcDir\s*:\s*['"`]([^'"`]+)['"`]/);
  srcDir = sd ? resolve(root, sd[1]) : existsSync(join(root, 'app')) ? join(root, 'app') : root;
  const cssArr = cfg.match(/\bcss\s*:\s*\[([\s\S]*?)\]/);
  if (cssArr) for (const m of cssArr[1].matchAll(/['"`]([^'"`]+)['"`]/g)) cssEntries.push(m[1]);
  const mods = cfg.match(/\bmodules\s*:\s*\[([\s\S]*?)\]/);
  project.modules = mods ? [...mods[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [];
  project.colorMode = {
    configured: /colorMode\s*:/.test(cfg),
    dataValue: cfg.match(/dataValue\s*:\s*['"`]([^'"`]+)/)?.[1] ?? null,
    classSuffix: cfg.match(/classSuffix\s*:\s*['"`]([^'"`]*)/)?.[1] ?? null,
  };
  project.fonts = { configured: /\bfonts\s*:/.test(cfg), families: [...cfg.matchAll(/name\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*provider/g)].map((m) => m[1]) };
  project.tailwindVite = /@tailwindcss\/vite/.test(cfg);
  for (const m of ['@nuxtjs/color-mode', '@nuxt/fonts'])
    if (project.dependencies?.[m] && !project.modules.includes(m)) project.warnings.push(`${m} is installed but not listed in modules.`);
  if (project.colorMode.configured && project.colorMode.dataValue !== 'theme')
    project.warnings.push('colorMode.dataValue is not "theme": the method uses data-theme on <html>.');
}
project.srcDir = rel(srcDir);
project.cssInConfig = cssEntries;

// ---------------------------------------------------------------------------
// 2. Global style sources
// ---------------------------------------------------------------------------
const IGNORE = new Set(['node_modules', '.nuxt', '.output', '.git', 'dist', '.data', 'coverage']);
function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(name))) out.push(p);
  }
  return out;
}
function resolveAlias(entry) {
  if (/^~~\/|^@@\//.test(entry)) return join(root, entry.slice(3));
  if (/^~\/|^@\//.test(entry)) return join(srcDir, entry.slice(2));
  if (entry.startsWith('/')) return entry;
  return join(root, entry);
}

const sources = new Map(); // path -> { type, linked, css, offset }
function addCss(path, linked, via) {
  if (sources.has(path)) {
    if (linked) sources.get(path).linked = true;
    return;
  }
  if (!existsSync(path)) {
    project.warnings.push(`CSS file not found: ${rel(path)}${via ? ` (imported by ${via})` : ''}`);
    return;
  }
  const css = readFileSync(path, 'utf8');
  sources.set(path, { type: extname(path).slice(1), linked, css, offset: 0, via });
  for (const m of css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?/g)) {
    const target = m[1];
    if (/^(https?:)?\/\//.test(target) || !/\.(s?css)$/.test(target) && !target.startsWith('.')) continue;
    addCss(resolve(dirname(path), target.endsWith('.css') || target.endsWith('.scss') ? target : `${target}.css`), linked, rel(path));
  }
}

let vueScoped = 0;
if (explicitFiles.length) {
  for (const f of explicitFiles) addCss(f, true, null);
} else {
  for (const e of cssEntries) addCss(resolveAlias(e), true, 'nuxt.config');
  for (const f of walk(join(srcDir, 'assets'), ['.css', '.scss', '.sass'])) addCss(f, false, null);
  for (const f of walk(srcDir, ['.vue'])) {
    const txt = readFileSync(f, 'utf8');
    for (const m of txt.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
      const attrs = m[1];
      if (/\bscoped\b|\bmodule\b/.test(attrs)) {
        vueScoped++;
        continue;
      }
      const offset = txt.slice(0, m.index).split('\n').length - 1;
      const key = `${f}#style${offset}`;
      sources.set(key, { type: /lang=["']?(s[ac]ss)/.exec(attrs)?.[1] ?? 'css', linked: true, css: m[2], offset, vue: f });
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Extraction
// ---------------------------------------------------------------------------
const TYPE_PROPS = new Set(['font-size', 'line-height', 'font-weight', 'letter-spacing', 'font-family', 'font']);
const COLOR_PROPS = /^(color|background|background-color|border|border-(top|right|bottom|left|block|inline)(-color)?|border-color|outline|outline-color|fill|stroke|caret-color|accent-color|text-decoration|text-decoration-color|column-rule-color)$/;
const RADIUS_PROPS = /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/;
const SHADOW_PROPS = /^(box-shadow|text-shadow)$/;
const MOTION_PROPS = /^(transition|transition-duration|transition-timing-function|transition-property|animation|animation-duration|animation-timing-function|animation-name)$/;

const inv = {
  customProperties: [],
  typography: [],
  literalColors: [],
  radii: [],
  shadows: [],
  motion: [],
  clamp: [],
  media: [],
  atRules: [],
  apply: [],
  fontFaces: [],
  keyframes: [],
  parseErrors: [],
};

function contextOf(node) {
  const chain = [];
  let p = node.parent;
  let selector = null;
  while (p && p.type !== 'root') {
    if (p.type === 'rule' && selector === null) selector = p.selector;
    if (p.type === 'atrule') chain.unshift(`@${p.name}${p.params ? ' ' + p.params : ''}`);
    p = p.parent;
  }
  if (selector === null) {
    const util = chain.find((a) => a.startsWith('@utility'));
    selector = util ?? chain[chain.length - 1] ?? null;
  }
  return { selector, atRules: chain };
}

for (const [key, src] of sources) {
  const file = src.vue ? `${rel(src.vue)} <style>` : rel(key);
  if (src.type === 'scss' || src.type === 'sass') inv.parseErrors.push({ file, reason: 'SCSS/Sass: the skill works on CSS; the file must be converted.' });
  let ast;
  try {
    ast = postcss.parse(src.css, { from: key });
  } catch (e) {
    inv.parseErrors.push({ file, reason: e.reason || e.message });
    continue;
  }
  const line = (n) => (n.source?.start?.line ?? 0) + src.offset;

  ast.walkAtRules((at) => {
    const base = { file, line: line(at) };
    if (at.name === 'media') inv.media.push({ ...base, query: at.params });
    else if (at.name === 'apply') inv.apply.push({ ...base, classes: at.params.split(/\s+/), ...contextOf(at) });
    else if (at.name === 'font-face') inv.fontFaces.push({ ...base, family: at.nodes?.find((d) => d.prop === 'font-family')?.value ?? null });
    else if (at.name === 'keyframes') inv.keyframes.push({ ...base, name: at.params, ...contextOf(at) });
    else if (['tailwind', 'config', 'plugin', 'import', 'theme', 'utility', 'layer', 'custom-variant', 'variant', 'source', 'reference'].includes(at.name))
      inv.atRules.push({ ...base, name: at.name, params: at.params });
  });

  ast.walkDecls((d) => {
    const ctx = contextOf(d);
    const base = { file, line: line(d), selector: ctx.selector, context: ctx.atRules, prop: d.prop, value: d.value };
    if (/clamp\(/.test(d.value)) inv.clamp.push(base);
    if (d.prop.startsWith('--')) {
      inv.customProperties.push(base);
      return;
    }
    if (TYPE_PROPS.has(d.prop)) inv.typography.push(base);
    if (RADIUS_PROPS.test(d.prop)) inv.radii.push(base);
    if (SHADOW_PROPS.test(d.prop)) inv.shadows.push(base);
    if (MOTION_PROPS.test(d.prop)) inv.motion.push(base);
    if (COLOR_PROPS.test(d.prop) || SHADOW_PROPS.test(d.prop)) {
      for (const c of findColors(d.value)) inv.literalColors.push({ ...base, color: c });
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Analysis
// ---------------------------------------------------------------------------
// Known variables (to resolve var() in sizes): the last definition wins.
const vars = new Map();
for (const c of inv.customProperties) vars.set(c.prop, c.value);
const resolveVar = (v, depth = 0) =>
  depth > 10 ? v : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, n, fb) => (vars.has(n) ? resolveVar(vars.get(n), depth + 1) : fb ?? `var(${n})`));

function toPx(raw) {
  const v = resolveVar(String(raw)).trim();
  const m = v.match(/^(-?[\d.]+)(px|rem|em|%)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2] ?? '';
  if (u === 'px') return { px: n, unit: 'px' };
  if (u === 'rem') return { px: n * 16, unit: 'rem' };
  if (u === 'em') return { px: n * 16, unit: 'em' };
  if (u === '%') return { px: (n / 100) * 16, unit: '%' };
  return { px: null, ratio: n, unit: '' };
}

function parseFontShorthand(v) {
  const m = v.match(/^(?:(?:italic|oblique|normal)\s+)?(?:small-caps\s+)?(?:(\d{3}|bold|normal|lighter|bolder)\s+)?([\d.]+(?:px|rem|em|%)|var\([^)]+\))(?:\s*\/\s*([\d.]+(?:px|rem|em|%)?|var\([^)]+\)))?\s+(.+)$/);
  if (!m) return null;
  return { weight: m[1] ?? null, size: m[2], lineHeight: m[3] ?? null, family: m[4] };
}

// The scale is the project's own: --text-<role> tokens when present, otherwise
// clusters of the distinct sizes found in the CSS (see buildScale below).
let SCALE = [];
function nearest(px) {
  if (!SCALE.length) return { step: null, role: null, offset: null, equidistant: false };
  let best = SCALE[0];
  for (const s of SCALE) if (Math.abs(s[0] - px) < Math.abs(best[0] - px)) best = s;
  const tie = SCALE.find((s) => s !== best && Math.abs(Math.abs(s[0] - px) - Math.abs(best[0] - px)) < 0.01);
  return {
    step: tie ? `${best[0]} / ${tie[0]}` : best[0],
    role: tie ? `${best[1]} or ${tie[1]}: the role decides` : best[1],
    offset: +(px - best[0]).toFixed(2),
    equidistant: Boolean(tie),
  };
}

// Text sizes
const sizes = [];
const rules = new Map(); // file|selector|context -> { size, lh }
for (const t of inv.typography) {
  let size = null, lh = null, weight = null, family = null;
  if (t.prop === 'font') {
    const f = parseFontShorthand(t.value);
    if (!f) continue;
    size = f.size; lh = f.lineHeight; weight = f.weight; family = f.family;
  } else if (t.prop === 'font-size') size = t.value;
  else if (t.prop === 'line-height') lh = t.value;
  else if (t.prop === 'font-weight') weight = t.value;
  else if (t.prop === 'font-family') family = t.value;
  const k = `${t.file}|${t.selector}|${t.context.join(',')}`;
  const r = rules.get(k) ?? { file: t.file, selector: t.selector, context: t.context, line: t.line };
  if (size) r.size = size;
  if (lh) r.lh = lh;
  if (weight) r.weight = weight;
  if (family) r.family = family;
  rules.set(k, r);
}
for (const r of rules.values()) {
  if (!r.size) continue;
  if (/clamp\(/.test(r.size)) {
    sizes.push({ ...r, kind: 'clamp' });
    continue;
  }
  const p = toPx(r.size);
  if (!p || p.px === null) {
    sizes.push({ ...r, kind: 'unresolved' });
    continue;
  }
  const lhPx = r.lh ? toPx(r.lh) : null;
  const ratio = lhPx ? (lhPx.px !== null ? lhPx.px / p.px : lhPx.ratio) : null;
  sizes.push({ ...r, kind: 'fixed', px: +p.px.toFixed(2), unit: p.unit, lineHeightRatio: ratio ? +ratio.toFixed(3) : null });
}

// Text tokens already defined in @theme
const textTokens = inv.customProperties.filter((c) => /^--text-[\w-]+$/.test(c.prop) && !c.prop.includes('--', 2) && c.context.some((a) => a.startsWith('@theme')));
for (const t of textTokens) {
  if (/clamp\(/.test(t.value)) {
    sizes.push({ file: t.file, line: t.line, selector: t.prop, context: t.context, size: t.value, kind: 'clamp (token)' });
    continue;
  }
  const p = toPx(t.value);
  if (p?.px) sizes.push({ file: t.file, line: t.line, selector: t.prop, context: t.context, size: t.value, kind: 'token', px: +p.px.toFixed(2), unit: p.unit });
}


// Build the project's scale
let scaleSource = 'none';
const clusters = [];
{
  const tokenSizes = sizes.filter((m) => m.kind === 'token');
  if (tokenSizes.length) {
    scaleSource = 'tokens';
    const byPx = new Map();
    for (const t of tokenSizes) {
      const role = t.selector.replace(/^--text-/, '');
      byPx.set(t.px, [...(byPx.get(t.px) ?? []), role]);
    }
    SCALE = [...byPx.entries()].sort((a, b) => a[0] - b[0]).map(([px, roles]) => [px, roles.join(' / ')]);
  } else {
    // no tokens: distinct sizes with their count, clustered (within 1px, or 2px above 24px)
    const counts = new Map();
    for (const m of sizes.filter((x) => x.kind === 'fixed')) counts.set(m.px, (counts.get(m.px) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);
    for (const [px, n] of sorted) {
      const last = clusters[clusters.length - 1];
      const tol = px > 24 ? 2 : 1;
      if (last && px - last.members[0].px <= tol) last.members.push({ px, n });
      else clusters.push({ members: [{ px, n }] });
    }
    for (const c of clusters) {
      c.count = c.members.reduce((s, m) => s + m.n, 0);
      c.proposed = c.members.reduce((a, b) => (b.n > a.n ? b : a)).px;
    }
    if (clusters.length) {
      scaleSource = 'clusters (proposed, provisional)';
      SCALE = clusters.map((c) => [c.proposed, c.members.length > 1 ? `cluster ${c.members.map((m) => m.px).join('/')}` : 'single value']);
    }
  }
  for (const m of sizes) if (m.px !== undefined) Object.assign(m, nearest(m.px));
}

// Literal colors: inside theme blocks (definitions) or scattered
const isThemeBlock = (c) => /:root|\[data-theme|\.dark\b|^html\b/.test(c.selector ?? '') || c.context.some((a) => /prefers-color-scheme|@theme/.test(a));
const themeColorDefs = inv.customProperties.filter((c) => findColors(c.value).length).map((c) => ({ ...c, inTheme: isThemeBlock(c) }));
const scatteredColors = [
  ...inv.literalColors.filter((c) => !isThemeBlock(c)),
  ...themeColorDefs.filter((c) => !c.inTheme),
];
const distinct = new Map();
for (const c of [...inv.literalColors, ...themeColorDefs.flatMap((c) => findColors(c.value).map((col) => ({ ...c, color: col })))]) {
  const col = c.color ?? findColors(c.value)[0];
  const parsed = parseColor(col);
  const k = parsed ? `${toHex(parsed)}${parsed.a < 1 ? ` a${+parsed.a.toFixed(2)}` : ''}` : col;
  distinct.set(k, (distinct.get(k) ?? 0) + 1);
}

// Media query breakpoints
const METHOD_BP = [640, 768, 1024, 1280];
const widths = new Map();
for (const m of inv.media) {
  for (const w of m.query.matchAll(/(?:min|max)-width\s*:\s*([\d.]+)(px|rem|em)|width\s*[<>]=?\s*([\d.]+)(px|rem|em)/g)) {
    const n = parseFloat(w[1] ?? w[3]);
    const u = w[2] ?? w[4];
    const px = u === 'px' ? n : n * 16;
    const k = Math.round(px);
    const e = widths.get(k) ?? { px: k, count: 0, maxWidth: 0, inMethod: METHOD_BP.includes(k), where: [] };
    e.count++;
    if (/max-width|width\s*<=?/.test(w[0])) e.maxWidth++;
    if (e.where.length < 5) e.where.push(`${m.file}:${m.line}`);
    widths.set(k, e);
  }
}

// Light/dark theme
const allText = [...sources.values()].map((s) => s.css).join('\n');
const darkTheme = {
  dataTheme: /\[data-theme=["']?dark/.test(allText),
  darkClass: /\.dark\b/.test(allText),
  prefersColorScheme: /prefers-color-scheme\s*:\s*dark/.test(allText),
  colorScheme: /color-scheme\s*:/.test(allText),
  customVariantDark: /@custom-variant\s+dark/.test(allText),
};
const reducedMotion = /prefers-reduced-motion/.test(allText);

// Closed Tailwind namespaces
const NAMESPACES = ['color', 'font', 'text', 'shadow', 'radius', 'font-weight', 'inset-shadow', 'drop-shadow', 'text-shadow', 'ease', 'animate', 'breakpoint'];
const resets = NAMESPACES.filter((n) => inv.customProperties.some((c) => c.prop === `--${n}-*` && /initial/.test(c.value)));
// postcss reads "--color-*: initial" as a declaration whose prop is "--color-*"

// ---------------------------------------------------------------------------
// 5. Classes in components (read only: impact of closing the namespaces)
// ---------------------------------------------------------------------------
const impact = new Map();
if (scanClasses && !explicitFiles.length) {
  const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
  const patterns = [
    ['default palette', new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|outline|fill|stroke|divide|from|via|to|decoration|accent|caret|placeholder|shadow)-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?:\\/\\d+)?(?![\\w-])`, 'g')],
    ['default text sizes', /(?<![\w-])(?:[\w-]+:)*text-(?:xs|sm|base|lg|[2-9]?xl)(?![\w-])/g],
    ['removed radii', /(?<![\w-])(?:[\w-]+:)*rounded(?:-[trblse]{1,2})?-(?:xs|2xl|3xl|4xl)(?![\w-])/g],
    ['radii that change value', /(?<![\w-])(?:[\w-]+:)*rounded(?:-[trblse]{1,2})?(?:-(?:sm|md|lg|xl))?(?![\w-])/g],
    ['removed shadows', /(?<![\w-])(?:[\w-]+:)*(?:shadow-(?:2xs|xs|xl|2xl|inner)|inset-shadow-[\w-]+|drop-shadow(?:-[\w-]+)?|text-shadow-[\w-]+)(?![\w-])/g],
    ['default families', /(?<![\w-])(?:[\w-]+:)*font-(?:sans|serif|mono)(?![\w-])/g],
    ['removed weights', /(?<![\w-])(?:[\w-]+:)*font-(?:thin|extralight|light|medium|extrabold|black)(?![\w-])/g],
    ['default easings and animations', /(?<![\w-])(?:[\w-]+:)*(?:ease-(?:in|out|in-out)|animate-(?:ping|pulse|bounce))(?![\w-])/g],
    ['arbitrary values', /(?<![\w-])(?:[\w-]+:)*(?:text|bg|border|fill|stroke|ring|shadow|rounded|leading|tracking|font)-\[[^\]\s]+\](?![\w-])/g],
    ['dark: variant', /(?<![\w-])dark:[\w\-\[\]#/.]+/g],
  ];
  for (const f of walk(srcDir, ['.vue', '.ts', '.tsx', '.js', '.jsx', '.html', '.md'])) {
    if (f.includes(`${join(srcDir, 'assets')}`)) continue;
    const txt = readFileSync(f, 'utf8');
    for (const [cat, re] of patterns) {
      for (const m of txt.matchAll(re)) {
        const cls = m[0];
        const k = `${cat}|${cls}`;
        const e = impact.get(k) ?? { category: cat, class: cls, count: 0, files: new Set() };
        e.count++;
        e.files.add(rel(f));
        impact.set(k, e);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Output
// ---------------------------------------------------------------------------
const out = {
  project,
  sources: [...sources.entries()].map(([k, s]) => ({ file: s.vue ? `${rel(s.vue)} <style>` : rel(k), type: s.type, linked: s.linked, via: s.via ?? null })),
  ignoredScopedStyles: vueScoped,
  darkTheme,
  reducedMotion,
  resets,
  scale: { source: scaleSource, steps: SCALE.map(([px, role]) => ({ px, role })), clusters },
  sizes,
  distinctColors: Object.fromEntries([...distinct.entries()].sort((a, b) => b[1] - a[1])),
  scatteredColors,
  widths: [...widths.values()].sort((a, b) => a.px - b.px),
  impact: [...impact.values()].map((e) => ({ ...e, files: [...e.files] })).sort((a, b) => b.count - a.count),
  ...inv,
};
if (outFile) writeFileSync(outFile, JSON.stringify(out, null, 2));

const L = [];
const p = (s = '') => L.push(s);
const yn = (b) => (b ? 'yes' : 'no');
p('# Global style inventory\n');
if (project.dependencies) {
  p('## Project\n');
  for (const [k, v] of Object.entries(project.dependencies)) p(`- ${k}: ${v ?? '—'}`);
  p(`- srcDir: ${project.srcDir}`);
  p(`- css in nuxt.config: ${cssEntries.length ? cssEntries.join(', ') : '—'}`);
  if (project.colorMode) p(`- colorMode: ${project.colorMode.configured ? `dataValue=${project.colorMode.dataValue ?? '—'}, classSuffix=${project.colorMode.classSuffix ?? '—'}` : 'not configured'}`);
  if (project.fonts) p(`- fonts: ${project.fonts.configured ? project.fonts.families.join(', ') || 'configured without explicit families' : 'not configured'}`);
  p();
}
if (project.warnings.length) {
  p('## Warnings\n');
  for (const a of project.warnings) p(`- ${a}`);
  p();
}
p('## Sources\n');
for (const s of out.sources) p(`- ${s.file} (${s.type}${s.linked ? '' : ', NOT linked from nuxt.config'}${s.via && s.via !== 'nuxt.config' ? `, imported by ${s.via}` : ''})`);
if (vueScoped) p(`- ${vueScoped} <style scoped|module> blocks ignored (out of scope: not global)`);
for (const e of inv.parseErrors) p(`- ERROR ${e.file}: ${e.reason}`);
p();

p('## Theme\n');
p(`- data-theme="dark": ${yn(darkTheme.dataTheme)} · .dark: ${yn(darkTheme.darkClass)} · prefers-color-scheme: ${yn(darkTheme.prefersColorScheme)} · color-scheme: ${yn(darkTheme.colorScheme)} · @custom-variant dark: ${yn(darkTheme.customVariantDark)}`);
p(`- prefers-reduced-motion: ${yn(reducedMotion)}`);
p(`- Tailwind namespaces already closed: ${resets.length ? resets.join(', ') : 'none'}`);
p();

p('## Text sizes\n');
p(`Scale source: **${scaleSource}**${SCALE.length ? ` — steps: ${SCALE.map(([px, role]) => `${px}px (${role})`).join(', ')}` : ''}`);
if (clusters.length) {
  p('\nProposed clusters (values within 1px, or 2px above 24px; the most frequent value is the proposal):\n');
  p('| Cluster | Values (count) | Proposed |');
  p('| --- | --- | --- |');
  clusters.forEach((c, i) => p(`| ${i + 1} | ${c.members.map((m) => `${m.px}px ×${m.n}`).join(', ')} | ${c.proposed}px |`));
}
p();
p('| Where | Selector / token | Size | px | Nearest step | Offset | Line height | Weight |');
p('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const m of sizes.sort((a, b) => (b.px ?? 999) - (a.px ?? 999))) {
  const resp = m.context?.find((c) => c.startsWith('@media') || c.startsWith('@variant'));
  const where = `${m.file}:${m.line}${resp ? ` (${resp})` : ''}`;
  if (m.kind === 'fixed' || m.kind === 'token')
    p(`| ${where} | \`${m.selector}\` | ${m.size} | ${m.px} | ${m.step} (${m.role}) | ${m.offset === 0 ? '0' : m.equidistant ? `**±${Math.abs(m.offset)}**` : `**${m.offset > 0 ? '+' : ''}${m.offset}**`} | ${m.lineHeightRatio ?? '—'} | ${m.weight ?? '—'} |`);
  else p(`| ${where} | \`${m.selector}\` | ${m.size} | — | ${m.kind} | — | — | ${m.weight ?? '—'} |`);
}
p();
const families = [...new Set([...rules.values()].map((r) => r.family).filter(Boolean))];
const weights = [...new Set([...rules.values()].map((r) => r.weight).filter(Boolean))];
p(`Families used: ${families.length ? families.map((f) => `\`${f}\``).join(', ') : '—'}`);
p(`Weights used: ${weights.length ? weights.join(', ') : '—'}`);
p(`@font-face: ${inv.fontFaces.length ? inv.fontFaces.map((f) => `${f.family} (${f.file}:${f.line})`).join(', ') : 'none'}`);
p();

p('## Colors\n');
p(`Distinct colors: ${distinct.size}`);
p(`Literal colors outside theme blocks: ${scatteredColors.length}`);
for (const c of scatteredColors.slice(0, 40)) p(`- ${c.file}:${c.line} \`${c.selector ?? c.prop}\` ${c.prop}: ${c.value}`);
if (scatteredColors.length > 40) p(`- … ${scatteredColors.length - 40} more (see JSON)`);
p();

p('## Radii, shadows, motion\n');
p(`Radii: ${[...new Set(inv.radii.map((r) => r.value))].join(' · ') || '—'}`);
p(`Shadows: ${inv.shadows.length} declarations, ${new Set(inv.shadows.map((o) => o.value)).size} distinct values`);
p(`Motion: ${[...new Set(inv.motion.map((m) => `${m.prop}: ${m.value}`))].slice(0, 15).join(' · ') || '—'}`);
p(`Keyframes: ${inv.keyframes.map((k) => k.name).join(', ') || '—'}`);
p();

p('## clamp()\n');
if (!inv.clamp.length) p('None.');
for (const c of inv.clamp) p(`- ${c.file}:${c.line} \`${c.selector ?? ''}\` ${c.prop}: ${c.value}`);
p();

p('## Breakpoints used\n');
if (!widths.size) p('No width media queries.');
for (const w of out.widths) p(`- ${w.px}px × ${w.count}${w.inMethod ? '' : ' — **not a method breakpoint** (640/768/1024/1280)'}${w.maxWidth ? ` — **${w.maxWidth} as max-width** (the method is mobile-first)` : ''} — ${w.where.join(', ')}`);
p();

if (!scanClasses && !explicitFiles.length) {
  p('## Component impact\n');
  p('Not analyzed (optional: rerun with --classes if the user asks for it).');
}
if (impact.size) {
  p('## Impact on component classes (read only)\n');
  const byCat = new Map();
  for (const e of out.impact) byCat.set(e.category, [...(byCat.get(e.category) ?? []), e]);
  for (const [cat, list] of byCat) {
    p(`**${cat}** — ${list.reduce((s, e) => s + e.count, 0)} occurrences`);
    for (const e of list.slice(0, 12)) p(`- \`${e.class}\` × ${e.count} (${e.files.slice(0, 3).join(', ')}${e.files.length > 3 ? ', …' : ''})`);
    if (list.length > 12) p(`- … ${list.length - 12} more`);
    p();
  }
}
console.log(L.join('\n'));
