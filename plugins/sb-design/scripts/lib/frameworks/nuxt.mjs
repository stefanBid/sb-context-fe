// sb-design's Nuxt adapter: where a Nuxt 4 app registers its global style, how its aliases resolve,
// how color mode and fonts are set up. The rules are in frameworks/nuxt.md; this is what the scripts read.

import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { srcDirOf, cssDirOf } from '../../../core/lib/project.mjs';

export const name = 'nuxt';
/** Build and generated folders the scripts never walk. */
export const IGNORE = new Set(['node_modules', '.nuxt', '.output', '.git', 'dist', '.data', 'coverage']);
/** Packages postcss and Tailwind are resolved from when the root does not hoist them (pnpm). */
export const MODULE_BASES = ['@tailwindcss/vite', 'nuxt'];

const CONFIGS = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];
const configOf = (root) => CONFIGS.map((f) => join(root, f)).find(existsSync) ?? null;

/** `~/` and `@/` point to srcDir, `~~/` and `@@/` to the root; anything else is relative to the root. */
export function resolveAlias(root, spec) {
  if (/^~~\/|^@@\//.test(spec)) return join(root, spec.slice(3));
  if (/^~\/|^@\//.test(spec)) return join(srcDirOf(root), spec.slice(2));
  if (isAbsolute(spec)) return spec;
  return join(root, spec);
}

/** Where the global style is registered: the `css` array of nuxt.config. { registry, entries: [{ spec, path }], packages: [] } */
export function cssEntries(root, profile) {
  const cfg = configOf(root);
  const text = cfg ? readFileSync(cfg, 'utf8') : '';
  const arr = text.match(/\bcss\s*:\s*\[([\s\S]*?)\]/);
  const specs = arr ? [...arr[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((m) => m[1]) : [];
  return { registry: 'nuxt.config', entries: specs.map((spec) => ({ spec, path: resolveAlias(root, spec) })), packages: [] };
}

/** P9: only main.css is registered. */
export const p9 = (root, { entries }) => ({ ok: entries.length === 1 && /assets\/css\/main\.css$/.test(entries[0]?.spec ?? ''), what: 'nuxt.config css lists only ~/assets/css/main.css' });

/** The default global style entry when nothing is registered. */
export const defaultCss = (root) => join(cssDirOf(root), 'main.css');

/** Framework files outside srcDir that may name the style's utilities (the prefix rename reads them). */
export const configTargets = (root) => [...CONFIGS, 'app.config.ts'].map((f) => join(root, f)).filter(existsSync);

/** What to change, besides typography.css, when a font family changes. */
export const fontNote = (profile) => '`fonts.families` (weights) in nuxt.config.ts';

/**
 * Versions, modules, color mode and fonts, with the warnings of what is missing (P1, P2, P3, P4).
 * profile: the project profile; pkg: package.json; rel: a path as the report shows it.
 */
export function styleSetup(root, profile, { pkg, rel }) {
  const project = { warnings: [] };
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
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

  const configPath = configOf(root);
  if (configPath) {
    const cfg = readFileSync(configPath, 'utf8');
    project.config = rel(configPath);
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
      if (project.dependencies[m] && !project.modules.includes(m)) project.warnings.push(`${m} is installed but not listed in modules.`);
    if (project.colorMode.configured && project.colorMode.dataValue !== 'theme')
      project.warnings.push('colorMode.dataValue is not "theme": the method uses data-theme on <html>.');
  }
  return project;
}

/** The lines of the inventory's Project section after the dependencies. */
export function projectLines(project, css) {
  const L = [`- css in nuxt.config: ${css.entries.length ? css.entries.map((e) => e.spec).join(', ') : '—'}`];
  if (project.colorMode) L.push(`- colorMode: ${project.colorMode.configured ? `dataValue=${project.colorMode.dataValue ?? '—'}, classSuffix=${project.colorMode.classSuffix ?? '—'}` : 'not configured'}`);
  if (project.fonts) L.push(`- fonts: ${project.fonts.configured ? project.fonts.families.join(', ') || 'configured without explicit families' : 'not configured'}`);
  return L;
}
