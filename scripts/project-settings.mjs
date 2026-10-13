#!/usr/bin/env node
// Project settings: how the user wants THIS project to be built (i18n, naming, icons, images…).
// Stored in `.sb-context-nuxt/project-settings.json` (local, kept out of git, never committed).
// The skills detect what they can from the project, ask the user only for what is still unknown,
// and save the answer here so it is never asked twice.
//
// Usage (from the project root):
//   node project-settings.mjs detect [--need i18n,icons,images,naming,style,seo,stack]   facts found in the project + the settings file + what is still missing (JSON)
//   node project-settings.mjs get [dotted.path]                          the settings file, or one value
//   node project-settings.mjs set <dotted.path> '<json value>' [--source user|detected]
//
// Runs from anywhere inside a Nuxt project: it finds the project root (nuxt.config.*) and keeps
// everything in `<root>/.sb-context-nuxt/`. `set` writes only that key, stamps it (source, updatedAt),
// creates the folder and adds it to .git/info/exclude. It never edits other project files.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { projectRoot, srcDirOf, cssDirOf, pluginDirOf, excludePluginDir } from './lib/project.mjs';

// always relative to the Nuxt project root, wherever the script is started from
const root = projectRoot();
const file = join(pluginDirOf(root), 'project-settings.json');
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => {
  const i = rest.indexOf(n);
  return i === -1 ? null : rest[i + 1];
};

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const settings = () => {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1 };
  } catch {
    console.error(`${file} is not valid JSON: fix or remove it.`);
    process.exit(2);
  }
};
const dig = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

const excludeFromGit = () => excludePluginDir(root);

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
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    value = raw; // a bare word is a string
  }
  const s = settings();
  const keys = path.split('.');
  let o = s;
  for (const k of keys.slice(0, -1)) o = o[k] = typeof o[k] === 'object' && o[k] !== null ? o[k] : {};
  o[keys.at(-1)] = value;
  const section = (s[keys[0]] = typeof s[keys[0]] === 'object' && s[keys[0]] !== null ? s[keys[0]] : {});
  if (keys.length > 1) {
    section.source = flag('--source') ?? 'user';
    section.updatedAt = new Date().toISOString().slice(0, 10);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  excludeFromGit();
  console.log(`Saved ${path} in ${file.replace(root + '/', '')}`);
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
const lockfiles = { 'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn', 'package-lock.json': 'npm', 'bun.lockb': 'bun', 'bun.lock': 'bun' };
const packageManager = Object.entries(lockfiles).find(([f]) => existsSync(join(root, f)))?.[1] ?? null;

const modules = {
  i18n: has('@nuxtjs/i18n'),
  icon: has('@nuxt/icon'),
  image: has('@nuxt/image'),
  fonts: has('@nuxt/fonts'),
  colorMode: has('@nuxtjs/color-mode'),
  eslint: has('@nuxt/eslint'),
  sitemap: has('@nuxtjs/sitemap'),
  vueuse: has('@vueuse/nuxt'),
};

// i18n facts
const i18nBlock = cfg.match(/i18n\s*:\s*\{([\s\S]*?)\n\s{0,2}\}/)?.[1] ?? '';
const localeBlock = i18nBlock.match(/locales\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
const codes = [...localeBlock.matchAll(/code\s*:\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
const plain = codes.length ? codes : [...localeBlock.matchAll(/['"]([a-z]{2}(?:-[A-Za-z]{2})?)['"]/g)].map((m) => m[1]);
const defaultLocale = i18nBlock.match(/defaultLocale\s*:\s*['"]([\w-]+)['"]/)?.[1] ?? null;
const langDirCfg = i18nBlock.match(/(?:langDir|restructureDir)\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
const localeDirs = ['i18n/locales', 'i18n/lang', 'locales', 'lang', `${srcDir}/locales`, `${srcDir}/i18n`].filter((d) => existsSync(join(root, d)) && statSync(join(root, d)).isDirectory());
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
const prefixCount = {};
for (const c of comps) {
  const base = c.split('/').pop().replace('.vue', '');
  const m = base.match(/^(Base|App|Ui|The|U|Custom|Shared)(?=[A-Z])/);
  prefixCount[m ? m[1] : 'none'] = (prefixCount[m ? m[1] : 'none'] ?? 0) + 1;
}
const subfolders = [...new Set(comps.filter((c) => c.includes('/')).map((c) => c.split('/')[0]))];

const facts = {
  packageManager,
  srcDir,
  nuxtConfig: cfgName ?? null,
  modules,
  i18n: { module: modules.i18n, defaultLocale, locales: plain, langDir: langDirCfg, localeDirs, localeFiles },
  components: { dir: `${srcDir}/components`, count: comps.length, prefixes: prefixCount, subfolders },
  pages: existsSync(join(root, srcDir, 'pages')),
  layouts: existsSync(join(root, srcDir, 'layouts')) ? readdirSync(join(root, srcDir, 'layouts')).filter((f) => f.endsWith('.vue')) : [],
};

// what is still unknown, by topic
const s = settings();
const need = (flag('--need') ?? 'i18n,icons,images,naming,style,seo,stack').split(',');
const missing = [];
const unset = (p) => dig(s, p) === undefined;
if (need.includes('i18n')) {
  if (unset('i18n.enabled')) missing.push({ key: 'i18n.enabled', why: modules.i18n ? 'the module is installed: confirm that all text goes through it' : '@nuxtjs/i18n is not installed: text must still not be inline', detected: modules.i18n });
  if (unset('i18n.defaultLocale')) missing.push({ key: 'i18n.defaultLocale', why: 'language of the design\'s text and of the default locale', detected: defaultLocale });
  if (unset('i18n.locales')) missing.push({ key: 'i18n.locales', why: 'which languages the project supports', detected: plain.length ? plain : null });
  if (unset('i18n.otherLocales')) missing.push({ key: 'i18n.otherLocales', why: 'for locales other than the default: translate the design text (marked to review), or leave empty and fall back', detected: null });
  if (unset('i18n.messagesDir')) missing.push({ key: 'i18n.messagesDir', why: 'where the locale files live / will live', detected: localeDirs[0] ?? langDirCfg });
  if (unset('i18n.keyStyle')) missing.push({ key: 'i18n.keyStyle', why: 'how message keys are organized', detected: null });
}
if (need.includes('icons') && unset('icons.module')) missing.push({ key: 'icons.module', why: 'how icons are used', detected: modules.icon ? '@nuxt/icon' : null });
if (need.includes('images') && unset('images.module')) missing.push({ key: 'images.module', why: 'how images are rendered', detected: modules.image ? '@nuxt/image' : null });
if (need.includes('naming') && unset('naming.componentPrefix')) missing.push({ key: 'naming.componentPrefix', why: 'prefix for base/shared components', detected: Object.entries(prefixCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null });

if (need.includes('style')) {
  const themeCss = [join(cssDirOf(root), 'theme.css')].find((p) => existsSync(p));
  const prefix = themeCss ? read(themeCss).match(/--([a-z]{2,4})-bg\s*:/)?.[1] ?? null : null;
  facts.style = { aligned: Boolean(themeCss), prefix };
  if (unset('style.prefix')) missing.push({ key: 'style.prefix', why: 'prefix of the global style tokens and utilities (`--{p}-bg`, `{p}-h1`): 2-4 lowercase letters', detected: prefix });
}
if (need.includes('seo')) {
  const siteUrl = cfg.match(/(?:siteUrl|baseUrl|site\.url|url)\s*:\s*['"](https?:\/\/[^'"]+)['"]/)?.[1] ?? null;
  facts.seo = { siteUrl, sitemapModule: modules.sitemap };
  if (unset('seo.siteUrl')) missing.push({ key: 'seo.siteUrl', why: 'production URL: robots, sitemap and canonical links must use it', detected: siteUrl });
}
if (need.includes('stack') && !packageManager && unset('stack.packageManager')) missing.push({ key: 'stack.packageManager', why: 'no lockfile found: which package manager installs and builds', detected: null });

console.log(JSON.stringify({ settingsFile: existsSync(file) ? file.replace(root + '/', '') : null, settings: s, facts, missing }, null, 2));
