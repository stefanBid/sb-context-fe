#!/usr/bin/env node
// GitHub settings: the signature choice and what is already known about the repo, so gh-admin and
// gh-checks do not ask twice or query `gh` again for facts they already read. Stored in
// `.sb-context-nuxt/github_settings.json` (local, kept out of git, never committed).
//
// Two parts:
//   preferences (user-owned): signature, defaults. Changed only when the user asks; a refresh never touches them.
//   cache (agent-owned): repo, labels, rulesets, ci, release, security. A snapshot of the remote.
//
// Usage (from anywhere inside a Nuxt project):
//   node github-settings.mjs get [dotted.path]              the file, or one value (null when unknown)
//   node github-settings.mjs status                         signature asked or not, age of each cache key, what is missing or stale (JSON)
//   node github-settings.mjs set <dotted.path> '<json>'     a preference (signature, defaults)
//   node github-settings.mjs refresh <dotted.path> '<json>' what was just read from the remote; stamps that key and
//                                                           prints the diff against the old value (report what was not expected)
//
// The writing commands create the folder and add it to .git/info/exclude. Values that look like a
// GitHub token are refused: the file holds names and flags only.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, pluginDirOf, excludePluginDir, relPath } from './lib/project.mjs';
import { dig, parseValue } from './lib/settings.mjs';
import { setPreference, refreshCache, status } from './lib/github-settings.mjs';

const root = projectRoot();
const file = join(pluginDirOf(root), 'github_settings.json');
const [cmd, ...rest] = process.argv.slice(2);

const today = () => new Date().toISOString().slice(0, 10);
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};

const load = () => {
  if (!existsSync(file)) return {};
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(`${file} is not a JSON object: fix or remove it.`);
    return data;
  } catch {
    return fail(`${file} is not valid JSON: fix or remove it.`);
  }
};
const save = (data) => {
  mkdirSync(pluginDirOf(root), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  excludePluginDir(root);
};

// ---------------------------------------------------------------------------
if (cmd === 'get') {
  const data = load();
  console.log(JSON.stringify(rest[0] ? (dig(data, rest[0]) ?? null) : data, null, 2));
  process.exit(0);
}

if (cmd === 'status') {
  console.log(JSON.stringify({ file: relPath(root, file), exists: existsSync(file), ...status(load()) }, null, 2));
  process.exit(0);
}

if (cmd === 'set' || cmd === 'refresh') {
  const [path, raw] = rest;
  if (!path || raw === undefined) fail(`Usage: github-settings.mjs ${cmd} <dotted.path> '<json value>'`);
  const data = load();
  let diff;
  try {
    if (cmd === 'set') setPreference(data, path, parseValue(raw));
    else diff = refreshCache(data, path, parseValue(raw), today());
  } catch (e) {
    fail(e.message);
  }
  save(data);
  console.log(JSON.stringify(cmd === 'set' ? { saved: path, file: relPath(root, file) } : { refreshed: path, file: relPath(root, file), ...diff }, null, 2));
  process.exit(0);
}

fail("Usage: github-settings.mjs get [path] | status | set <path> '<json>' | refresh <path> '<json>'");
