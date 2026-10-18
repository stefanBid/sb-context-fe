// sb-design's Vue + Vite adapter: where a Vue 3 + Vite app registers its global style (a CSS import in the
// app entry, src/main.ts), how its aliases resolve, how color mode (VueUse useColorMode + an inline script in
// index.html) and fonts (Fontsource) are set up. The rules are in frameworks/vue-vite.md; this is what the scripts read.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname, isAbsolute } from 'node:path';
import { srcDirOf, cssDirOf, relPath } from '../../../core/lib/project.mjs';

export const name = 'vue-vite';
/** Build and generated folders the scripts never walk. */
export const IGNORE = new Set(['node_modules', '.git', 'dist', '.vite', 'coverage']);
/** Packages postcss and Tailwind are resolved from when the root does not hoist them (pnpm). */
export const MODULE_BASES = ['@tailwindcss/vite', 'vite'];

const CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts', 'vite.config.cjs'];
const configOf = (root) => CONFIGS.map((f) => join(root, f)).find(existsSync) ?? null;
const read = (p) => (p && existsSync(p) ? readFileSync(p, 'utf8') : '');
/** VueUse's own key when useColorMode gets none. */
export const DEFAULT_STORAGE_KEY = 'vueuse-color-scheme';
const FONT_PACKAGE = /^@fontsource(?:-variable)?\/[^/]+$/;

/** The app entry that imports the global style: entries.css of the profile, else src/main.ts / main.js. */
export function entryOf(root, profile) {
  const declared = profile?.entries?.css ?? profile?.entries?.app;
  if (declared) return join(root, declared);
  return ['src/main.ts', 'src/main.js'].map((f) => join(root, f)).find(existsSync) ?? join(root, 'src/main.ts');
}

/**
 * `@/` points to srcDir, `/…` to the root (Vite's own rule), `./` and `../` to the importing file's folder.
 * A package specifier (`@fontsource/inter/400.css`) is not a file of the project: null.
 */
export function resolveAlias(root, spec, fromDir = root) {
  if (spec.startsWith('@/')) return join(srcDirOf(root), spec.slice(2));
  if (spec.startsWith('./') || spec.startsWith('../')) return resolve(fromDir, spec);
  if (isAbsolute(spec)) return spec.startsWith(root) ? spec : join(root, spec);
  return null;
}

const STYLE = /\.(css|scss|sass|less|styl)$/;
/** The side-effect style imports of a module: `import './x.css'` (not `?inline` / `?url`, which are not global). */
export const styleImportsOf = (code) =>
  [...code.matchAll(/^\s*import\s+(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]).filter((s) => STYLE.test(s));

/** Where the global style is registered: the style imports of the app entry. { registry, entries: [{ spec, path }], packages: [spec] } */
export function cssEntries(root, profile) {
  const entry = entryOf(root, profile);
  const specs = styleImportsOf(read(entry));
  const entries = [];
  const packages = [];
  for (const spec of specs) {
    const path = resolveAlias(root, spec, dirname(entry));
    if (path) entries.push({ spec, path });
    else packages.push(spec);
  }
  return { registry: relPath(root, entry), entries, packages };
}

/** P9: the entry imports only the style's main.css (package CSS such as Fontsource is not the project's style). */
export function p9(root, css) {
  const main = join(cssDirOf(root), 'main.css');
  return { ok: css.entries.length === 1 && css.entries[0].path === main, what: `${css.registry} imports only ${relPath(root, main)}` };
}

/** The default global style entry when nothing is registered. */
export const defaultCss = (root) => join(cssDirOf(root), 'main.css');

/** Framework files outside srcDir that may name the style's utilities (the prefix rename reads them). */
export const configTargets = (root) => [...CONFIGS, 'index.html'].map((f) => join(root, f)).filter(existsSync);

/** What to change, besides typography.css, when a font family changes. */
export const fontNote = (profile) => `the \`@fontsource/*\` imports (weights) in ${profile?.entries?.css ?? 'src/main.ts'}`;

/** Every .ts/.js/.vue file under dir, build folders aside. */
function sources(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (IGNORE.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (['.ts', '.js', '.mts', '.mjs', '.vue', '.tsx', '.jsx'].includes(extname(n))) out.push(p);
  }
  return out;
}

/** The first useColorMode(…) call under srcDir: { file, attribute, storageKey, selector } or null. */
export function colorModeCall(root) {
  for (const f of sources(srcDirOf(root))) {
    const m = read(f).match(/\buseColorMode\s*\(\s*(\{[\s\S]*?\})?\s*\)/);
    if (!m) continue;
    const opt = (k) => m[1]?.match(new RegExp(`\\b${k}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`))?.[1] ?? null;
    return { file: f, attribute: opt('attribute') ?? 'class', storageKey: opt('storageKey') ?? DEFAULT_STORAGE_KEY, selector: opt('selector') ?? 'html' };
  }
  return null;
}

/** The inline script of index.html that sets data-theme before the app mounts: { storageKey } or null. */
export function antiFlashOf(html) {
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const js = m[1];
    if (!/data-theme|dataset\.theme/.test(js)) continue;
    return { storageKey: js.match(/localStorage\.getItem\(\s*['"`]([^'"`]+)['"`]/)?.[1] ?? null };
  }
  return null;
}

const major = (v) => {
  const m = String(v ?? '').match(/(\d+)(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? 0)] : null;
};

/**
 * Versions, color mode and fonts, with the warnings of what is missing (P1, P2, P3, P4, T7).
 * profile: the project profile; pkg: package.json; rel: a path as the report shows it.
 */
export function styleSetup(root, profile, { pkg, rel }) {
  const project = { warnings: [] };
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const ver = (n) => deps[n] ?? null;
  const fontPackages = Object.keys(deps).filter((d) => FONT_PACKAGE.test(d)).sort();
  project.dependencies = {
    vue: ver('vue') ?? pkg?.peerDependencies?.vue ?? null,
    vite: ver('vite'),
    tailwindcss: ver('tailwindcss'),
    '@tailwindcss/vite': ver('@tailwindcss/vite'),
    '@vueuse/core': ver('@vueuse/core'),
    ...Object.fromEntries(fontPackages.map((f) => [f, ver(f)])),
  };
  const vue = major(project.dependencies.vue);
  const vite = major(ver('vite'));
  const tw = major(ver('tailwindcss'));
  if (vue && vue[0] < 3) project.warnings.push(`Vue ${project.dependencies.vue}: the skill only works with Vue 3.`);
  if (vite && (vite[0] < 5 || (vite[0] === 5 && vite[1] < 2))) project.warnings.push(`Vite ${ver('vite')}: @tailwindcss/vite needs Vite 5.2 or later.`);
  if (!ver('tailwindcss')) project.warnings.push('tailwindcss is not among the dependencies.');
  else if (tw && tw[0] < 4) project.warnings.push(`Tailwind ${ver('tailwindcss')}: the skill only works with Tailwind 4.`);

  const configPath = configOf(root);
  const cfg = read(configPath);
  project.config = configPath ? rel(configPath) : null;
  project.tailwindVite = /@tailwindcss\/vite/.test(cfg);
  if (tw && tw[0] >= 4 && !project.tailwindVite) project.warnings.push(`Tailwind 4 is not plugged in through @tailwindcss/vite in ${project.config ?? 'vite.config.ts'}.`);

  // color mode: useColorMode writes data-theme, the inline script of index.html sets it before the first paint
  const call = colorModeCall(root);
  const html = read(join(root, 'index.html'));
  const flash = antiFlashOf(html);
  project.colorMode = { configured: Boolean(call), file: call ? rel(call.file) : null, attribute: call?.attribute ?? null, storageKey: call?.storageKey ?? null, antiFlash: Boolean(flash), antiFlashKey: flash?.storageKey ?? null };
  if (!ver('@vueuse/core')) project.warnings.push('@vueuse/core is not installed (required: useColorMode switches the theme).');
  if (!call) project.warnings.push('useColorMode is not called anywhere under the source folder: nothing writes data-theme on <html>.');
  else if (call.attribute !== 'data-theme') project.warnings.push(`useColorMode writes "${call.attribute}", not data-theme: the method uses data-theme on <html>.`);
  if (!flash) project.warnings.push('index.html has no inline script that sets data-theme before the app mounts: the page flashes the light theme on load.');
  else if (call && flash.storageKey && flash.storageKey !== call.storageKey)
    project.warnings.push(`The inline script of index.html reads "${flash.storageKey}", useColorMode stores "${call.storageKey}": they must use the same key.`);

  // fonts: Fontsource packages imported by the app entry, with the weights in use
  const css = cssEntries(root, profile);
  const imported = {};
  for (const spec of css.packages) {
    const m = spec.match(/^(@fontsource(?:-variable)?\/[^/]+)(?:\/(.+?))?\.css$|^(@fontsource(?:-variable)?\/[^/]+)$/);
    if (!m) continue;
    const pkgName = m[1] ?? m[3];
    (imported[pkgName] ??= []).push(m[2] ?? 'index');
  }
  project.fonts = { configured: Object.keys(imported).length > 0, packages: imported, google: /fonts\.googleapis\.com/.test(html) };
  for (const f of fontPackages) if (!imported[f]) project.warnings.push(`${f} is installed but not imported in ${css.registry}.`);
  for (const f of Object.keys(imported)) if (!deps[f]) project.warnings.push(`${css.registry} imports ${f}, which is not among the dependencies.`);
  if (project.fonts.google) project.warnings.push('index.html loads fonts from Google Fonts: the method loads them with Fontsource (T7).');
  return project;
}

/** The lines of the inventory's Project section after the dependencies. */
export function projectLines(project, css) {
  const cm = project.colorMode;
  const fonts = Object.entries(project.fonts.packages).map(([p, w]) => `${p} (${w.join(', ')})`);
  return [
    `- css imported by ${css.registry}: ${css.entries.length ? css.entries.map((e) => e.spec).join(', ') : '—'}`,
    ...(css.packages.length ? [`- package css imported by ${css.registry}: ${css.packages.join(', ')}`] : []),
    `- colorMode: ${cm.configured ? `useColorMode in ${cm.file}, attribute=${cm.attribute}, storageKey=${cm.storageKey}` : 'not configured'} · inline script in index.html: ${cm.antiFlash ? `yes${cm.antiFlashKey ? ` (key ${cm.antiFlashKey})` : ''}` : 'no'}`,
    `- fonts: ${fonts.length ? fonts.join(', ') : 'not loaded with Fontsource'}${project.fonts.google ? ' · Google Fonts link in index.html' : ''}`,
  ];
}
