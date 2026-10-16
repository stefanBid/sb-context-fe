// The project profile: the STRUCTURE of the project (framework, kind, paths, entries, styling, features),
// so the skills and scripts read where things are instead of assuming a Nuxt layout.
//
// Stored in .sb-context/profile.json. The profile is always re-detected from the files; the saved file
// adds only what the user confirmed or corrected (`confirmed`: dotted keys), which a new detection never
// overwrites. A confirmed value the project now contradicts is reported as drift, to be asked, not followed.
//
// Facts here, choices in settings.json: the profile says what the project IS, the settings what the user WANTS.
// Each framework has a detector in ./frameworks/: a new stack is a new detector (and its adapters in the
// plugins that need one), not a change here.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contextDirOf } from './folder.mjs';
import * as nuxt from './frameworks/nuxt.mjs';
import * as vue from './frameworks/vue.mjs';

export const SCHEMA = 1;
export const PROFILE_FILE = 'profile.json';
/** Detectors in order: the first that recognizes a folder wins (a Nuxt app also depends on vue). */
export const FRAMEWORKS = [nuxt, vue];
/** Keys that are bookkeeping, not facts: never compared, never confirmed. */
const META = new Set(['schema', 'detectedAt', 'confirmed']);
const LOCKFILES = { 'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn', 'package-lock.json': 'npm', 'bun.lockb': 'bun', 'bun.lock': 'bun' };

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};
export const readPackage = (dir) => readJson(join(dir, 'package.json'));

/** The framework module that recognizes this folder, or null. */
export const frameworkOf = (dir, pkg = readPackage(dir)) => FRAMEWORKS.find((f) => f.isRoot(dir, pkg)) ?? null;

/**
 * Major version of a package the project declares: the installed one when node_modules has it, else the first
 * number of the range. A package only installed as someone else's dependency is not the project's: null.
 */
export function majorOf(root, pkg, name) {
  const declared = { ...pkg?.peerDependencies, ...pkg?.dependencies, ...pkg?.devDependencies }[name];
  if (declared === undefined) return null;
  const range = readJson(join(root, 'node_modules', name, 'package.json'))?.version ?? declared;
  const m = typeof range === 'string' ? range.match(/(\d+)/) : null;
  return m ? Number(m[1]) : null;
}

/** Which adapter of a plugin applies: one per framework + bundler. null = no adapter (the plugin says it is not supported). */
export const adapterOf = (p) => (p.framework.name === 'nuxt' ? 'nuxt' : p.framework.name === 'vue' && p.bundler?.name === 'vite' ? 'vue-vite' : null);

/** The profile as the files show it now, or null outside a recognized project. */
export function detectProfile(root, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const pkg = readPackage(root) ?? {};
  const fw = frameworkOf(root, pkg);
  if (!fw) return null;
  const all = { ...pkg.peerDependencies, ...pkg.dependencies, ...pkg.devDependencies };
  const part = fw.detect({ root, pkg, has: (n) => n in all, major: (n) => majorOf(root, pkg, n), scripts: pkg.scripts ?? {} });
  const packageManager = Object.entries(LOCKFILES).find(([f]) => existsSync(join(root, f)))?.[1] ?? pkg.packageManager?.split('@')[0] ?? null;
  const { framework, bundler, kind, rendering, language, templates, ...rest } = part;
  const p = { schema: SCHEMA, detectedAt: today, confirmed: [], adapter: null, framework, bundler, kind, rendering, language, packageManager, templates, ...rest };
  p.adapter = adapterOf(p);
  return p;
}

// --- pure helpers ---------------------------------------------------------------------------------

export const dig = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

function put(o, path, value) {
  const keys = path.split('.');
  let cur = o;
  for (const k of keys.slice(0, -1)) cur = cur[k] = cur[k] && typeof cur[k] === 'object' && !Array.isArray(cur[k]) ? cur[k] : {};
  cur[keys.at(-1)] = value;
  return o;
}

/** Whether a key is covered by a confirmed key (confirming `styling.engine` covers `styling.engine.name`). */
export const isConfirmed = (profile, key) => (profile?.confirmed ?? []).some((c) => key === c || key.startsWith(`${c}.`));

/** Every leaf key of a profile, dotted (arrays are leaves). */
export function leaves(o, prefix = '') {
  return Object.entries(o ?? {}).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (!prefix && META.has(k)) return [];
    return v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, key) : [key];
  });
}

/** The profile to use: what the files show now, with the user's confirmed values on top. */
export function mergeProfile(saved, detected) {
  if (!detected) return saved ?? null;
  if (!saved) return detected;
  const out = structuredClone(detected);
  for (const key of saved.confirmed ?? []) put(out, key, structuredClone(dig(saved, key)));
  out.confirmed = [...(saved.confirmed ?? [])];
  out.adapter = adapterOf(out);
  return out;
}

/**
 * What changed since the profile was saved: [{ key, saved, detected, confirmed }].
 * A confirmed key that differs is a question for the user; an unconfirmed one is just stale and is refreshed.
 */
export function driftOf(saved, detected) {
  if (!saved || !detected) return [];
  const keys = [...new Set([...leaves(saved), ...leaves(detected)])].sort();
  return keys
    .filter((k) => k !== 'adapter' && JSON.stringify(dig(saved, k) ?? null) !== JSON.stringify(dig(detected, k) ?? null))
    .map((k) => ({ key: k, saved: dig(saved, k) ?? null, detected: dig(detected, k) ?? null, confirmed: isConfirmed(saved, k) }));
}

/** Sets a key as confirmed by the user (a value the detection must not overwrite). */
export function confirmKey(profile, key, value) {
  if (META.has(key.split('.')[0]) || key === 'adapter') throw new Error(`${key} is not a fact of the project: it cannot be set.`);
  const out = structuredClone(profile);
  put(out, key, value);
  out.confirmed = [...new Set([...(out.confirmed ?? []).filter((c) => !c.startsWith(`${key}.`)), key])].sort();
  out.adapter = adapterOf(out);
  return out;
}

// --- reading the project ---------------------------------------------------------------------------

export const profileFileOf = (root) => join(contextDirOf(root), PROFILE_FILE);

/** { saved, detected, profile, drift }: profile is the one every script uses. */
export function loadProfile(root) {
  const saved = readJson(profileFileOf(root));
  const detected = detectProfile(root);
  return { saved, detected, profile: mergeProfile(saved, detected), drift: driftOf(saved, detected) };
}

/** The source folder of the project (absolute): the profile's paths.src, else the framework's own rule. */
export function srcDirOf(root) {
  const p = loadProfile(root).profile;
  if (p?.paths?.src) return join(root, p.paths.src);
  return (frameworkOf(root) ?? nuxt).srcDirOf(root);
}

/** The folder of the global style (absolute): the profile's paths.styles, else <srcDir>/assets/css. */
export function cssDirOf(root) {
  const p = loadProfile(root).profile;
  return p?.paths?.styles ? join(root, p.paths.styles) : join(srcDirOf(root), 'assets', 'css');
}
