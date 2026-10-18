#!/usr/bin/env node
// Project settings: how the user wants THIS project to be built (i18n, naming, icons, images…).
// Stored in `.sb-context/settings.json`, in the project (the folder can be committed).
// The skills detect what they can from the project, ask the user only for what is still unknown,
// and save the answer here so it is never asked twice.
//
// Usage (from the project root):
//   node project-settings.mjs detect [--need i18n,icons,images,naming,style,seo,stack]   facts found in the project + the settings file + what is still missing (JSON)
//   node project-settings.mjs get [dotted.path]                          the settings file, or one value
//   node project-settings.mjs set <dotted.path> '<json value>' [--source user|detected]
//
// Runs from anywhere inside a Nuxt or Vue project: it finds the project root and keeps
// everything in `<root>/.sb-context/`. `set` writes only that key, stamps it (source, updatedAt),
// creates the folder (with its .gitignore). It never edits other project files.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, srcDirOf, cssDirOf, contextDirOf, ensureContextDir, relPath } from '../lib/project.mjs';
import { loadProfile } from '../lib/profile.mjs';
import { dig, parseValue, setPath, parseI18nConfig, parseVueI18n, componentNaming, siteUrlOf, themePrefixOf } from '../lib/settings.mjs';

// always relative to the project root, wherever the script is started from
const root = projectRoot();
const file = join(contextDirOf(root), 'settings.json');
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => {
  const i = rest.indexOf(n);
  return i === -1 ? null : rest[i + 1];
};

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

/** The .ts/.js files of a folder (node_modules and build folders aside). */
function walkCode(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (['node_modules', 'dist', '.nuxt', '.output'].includes(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walkCode(p, out);
    else if (/\.(m?[tj]s)$/.test(e)) out.push(p);
  }
  return out;
}
const settings = () => {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1 };
  } catch {
    console.error(`${file} is not valid JSON: fix or remove it.`);
    process.exit(2);
  }
};

// ---------------------------------------------------------------------------
if (cmd === 'get') {
  const s = settings();
  const p = rest[0];
  console.log(JSON.stringify(p ? (dig(s, p) ?? null) : s, null, 2));
  process.exit(0);
}

if (cmd === 'set') {
  const [path, raw] = rest;
  if (!path || raw === undefined) {
    console.error("Usage: project-settings.mjs set <dotted.path> '<json value>' [--source user|detected]");
    process.exit(2);
  }
  const s = setPath(settings(), path, parseValue(raw), { source: flag('--source') ?? 'user', date: new Date().toISOString().slice(0, 10) });
  ensureContextDir(root);
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  console.log(`Saved ${path} in ${relPath(root, file)}`);
  process.exit(0);
}

if (cmd !== 'detect') {
  console.error('Commands: detect | get | set. See the header of this file.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// detect
// ---------------------------------------------------------------------------
const pkg = (() => {
  try {
    return JSON.parse(read(join(root, 'package.json')) || '{}');
  } catch {
    return {};
  }
})();
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const cfgName = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'].find((n) => existsSync(join(root, n)));
const cfg = cfgName ? read(join(root, cfgName)) : '';
const has = (name) => name in deps || cfg.includes(`'${name}'`) || cfg.includes(`"${name}"`);
const srcDir = srcDirOf(root).slice(root.length + 1) || '.';
const profile = loadProfile(root).profile;
const isNuxt = profile?.framework?.name !== 'vue';
const first = (...names) => names.find(has) ?? null;
const lockfiles = { 'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn', 'package-lock.json': 'npm', 'bun.lockb': 'bun', 'bun.lock': 'bun' };
const packageManager = Object.entries(lockfiles).find(([f]) => existsSync(join(root, f)))?.[1] ?? null;

// the package that does each job, by stack (Nuxt modules, or the Vue libraries sb-design's vue-vite adapter uses)
const packages = isNuxt
  ? { i18n: first('@nuxtjs/i18n'), icon: first('@nuxt/icon'), image: first('@nuxt/image'), fonts: first('@nuxt/fonts'), colorMode: first('@nuxtjs/color-mode'), eslint: first('@nuxt/eslint'), sitemap: first('@nuxtjs/sitemap'), vueuse: first('@vueuse/nuxt') }
  : { i18n: first('vue-i18n'), icon: first('unplugin-icons', '@iconify/vue'), image: null, fonts: Object.keys(deps).some((d) => /^@fontsource(-variable)?\//.test(d)) ? '@fontsource' : null, colorMode: first('@vueuse/core'), eslint: first('eslint'), sitemap: first('vite-plugin-sitemap', 'vite-ssg-sitemap'), vueuse: first('@vueuse/core') };
const modules = Object.fromEntries(Object.entries(packages).map(([k, v]) => [k, Boolean(v)]));
const I18N = isNuxt ? '@nuxtjs/i18n' : 'vue-i18n';

// i18n facts: the i18n block of nuxt.config, or the createI18n call of a Vue app
const createI18nFile = isNuxt ? null : walkCode(join(root, srcDir)).find((f) => /\bcreateI18n\s*\(/.test(read(f)));
const { defaultLocale, locales: plain, langDir: langDirCfg } = isNuxt ? parseI18nConfig(cfg) : parseVueI18n(createI18nFile ? read(createI18nFile) : '');
const localeDirs = ['i18n/locales', 'i18n/lang', 'locales', 'lang', `${srcDir}/locales`, `${srcDir}/i18n/locales`, `${srcDir}/i18n`].filter((d) => existsSync(join(root, d)) && statSync(join(root, d)).isDirectory());
const localeFiles = localeDirs.flatMap((d) => readdirSync(join(root, d)).filter((f) => /\.(json|ya?ml|ts|js)$/.test(f)).map((f) => `${d}/${f}`));

// components naming
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.vue')) out.push(p);
  }
  return out;
};
const compDir = join(root, srcDir, 'components');
const comps = walk(compDir).map((p) => p.slice(compDir.length + 1));
const { prefixes: prefixCount, subfolders } = componentNaming(comps);

const pagesDir = profile?.paths?.pages ?? `${srcDir}/pages`;
const facts = {
  packageManager,
  srcDir,
  nuxtConfig: cfgName ?? null,
  config: profile?.entries?.config ?? cfgName ?? null,
  modules,
  packages,
  i18n: { module: modules.i18n, package: packages.i18n, setup: createI18nFile ? relPath(root, createI18nFile) : null, defaultLocale, locales: plain, langDir: langDirCfg, localeDirs, localeFiles },
  components: { dir: `${srcDir}/components`, count: comps.length, prefixes: prefixCount, subfolders },
  pages: existsSync(join(root, pagesDir)),
  pagesDir,
  layouts: existsSync(join(root, srcDir, 'layouts')) ? readdirSync(join(root, srcDir, 'layouts')).filter((f) => f.endsWith('.vue')) : [],
};

// what is still unknown, by topic
const s = settings();
const need = (flag('--need') ?? 'i18n,icons,images,naming,style,seo,stack').split(',');
const missing = [];
const unset = (p) => dig(s, p) === undefined;
if (need.includes('i18n')) {
  if (unset('i18n.enabled')) missing.push({ key: 'i18n.enabled', why: modules.i18n ? `${I18N} is installed: confirm that all text goes through it` : `${I18N} is not installed: text must still not be inline`, detected: modules.i18n });
  if (unset('i18n.defaultLocale')) missing.push({ key: 'i18n.defaultLocale', why: 'language of the design\'s text and of the default locale', detected: defaultLocale });
  if (unset('i18n.locales')) missing.push({ key: 'i18n.locales', why: 'which languages the project supports', detected: plain.length ? plain : null });
  if (unset('i18n.otherLocales')) missing.push({ key: 'i18n.otherLocales', why: 'for locales other than the default: translate the design text (marked to review), or leave empty and fall back', detected: null });
  if (unset('i18n.messagesDir')) missing.push({ key: 'i18n.messagesDir', why: 'where the locale files live / will live', detected: localeDirs[0] ?? langDirCfg });
  if (unset('i18n.keyStyle')) missing.push({ key: 'i18n.keyStyle', why: 'how message keys are organized', detected: null });
}
if (need.includes('icons') && unset('icons.module')) missing.push({ key: 'icons.module', why: 'how icons are used', detected: packages.icon });
if (need.includes('images') && unset('images.module')) missing.push({ key: 'images.module', why: 'how images are rendered', detected: packages.image });
if (need.includes('naming') && unset('naming.componentPrefix')) missing.push({ key: 'naming.componentPrefix', why: 'prefix for base/shared components', detected: Object.entries(prefixCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null });

if (need.includes('style')) {
  const themeCss = [join(cssDirOf(root), 'theme.css')].find((p) => existsSync(p));
  const prefix = themeCss ? themePrefixOf(read(themeCss)) : null;
  facts.style = { aligned: Boolean(themeCss), prefix };
  if (unset('style.prefix')) missing.push({ key: 'style.prefix', why: 'prefix of the global style tokens and utilities (`--{p}-bg`, `{p}-h1`): 2-4 lowercase letters', detected: prefix });
}
if (need.includes('seo')) {
  const envs = ['.env.production', '.env'].map((f) => read(join(root, f))).join('\n');
  const siteUrl = siteUrlOf(cfg) ?? siteUrlOf(read(profile?.entries?.config ? join(root, profile.entries.config) : '')) ?? siteUrlOf(envs);
  facts.seo = { siteUrl, sitemapModule: modules.sitemap };
  if (unset('seo.siteUrl')) missing.push({ key: 'seo.siteUrl', why: 'production URL: robots, sitemap and canonical links must use it', detected: siteUrl });
}
if (need.includes('stack') && !packageManager && unset('stack.packageManager')) missing.push({ key: 'stack.packageManager', why: 'no lockfile found: which package manager installs and builds', detected: null });

console.log(JSON.stringify({ settingsFile: existsSync(file) ? relPath(root, file) : null, settings: s, facts, missing }, null, 2));
