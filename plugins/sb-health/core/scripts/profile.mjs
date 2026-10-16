#!/usr/bin/env node
// The project profile: what the project IS (framework, kind, rendering, paths, entries, styling, features),
// detected from its files and confirmed by the user once. Stored in `.sb-context/profile.json`.
// Format and rules: references/profile.md.
//
// Usage (from anywhere inside a Nuxt or Vue project):
//   node profile.mjs detect                    the profile as the files show it now, the saved file, what drifted, and
//                                              the keys still unknown (JSON). Writes nothing
//   node profile.mjs get [dotted.key]          the profile in use (detected, with the confirmed values on top), or one value
//   node profile.mjs set <dotted.key> '<json>' a value the user confirmed or corrected: saved and never overwritten by a new
//                                              detection (e.g. set kind '"library"', set paths.styles '"src/styles"')
//   node profile.mjs write                     saves the profile in use (the confirmed values stay as they are)
//
// `set` and `write` create `.sb-context/` (with its .gitignore). Nothing else in the project is touched.

import { writeFileSync } from 'node:fs';
import { projectRoot, ensureContextDir, relPath } from '../lib/project.mjs';
import { loadProfile, confirmKey, dig, profileFileOf } from '../lib/profile.mjs';
import { parseValue } from '../lib/settings.mjs';

const root = projectRoot();
const [cmd, ...rest] = process.argv.slice(2);
const file = profileFileOf(root);
const { saved, detected, profile, drift } = loadProfile(root);

const save = (p) => {
  ensureContextDir(root);
  writeFileSync(file, JSON.stringify(p, null, 2) + '\n');
};

/** Keys that matter to the skills and that the files do not settle: to be asked. */
const UNKNOWN = ['kind', 'framework.major', 'packageManager'];

if (cmd === 'detect') {
  const unknown = UNKNOWN.filter((k) => dig(profile, k) == null);
  console.log(JSON.stringify({ file: saved ? relPath(root, file) : null, profile, saved, drift, unknown }, null, 2));
  process.exit(0);
}

if (cmd === 'get') {
  console.log(JSON.stringify(rest[0] ? (dig(profile, rest[0]) ?? null) : profile, null, 2));
  process.exit(0);
}

if (cmd === 'set') {
  const [key, raw] = rest;
  if (!key || raw === undefined) {
    console.error("Usage: profile.mjs set <dotted.key> '<json value>'");
    process.exit(2);
  }
  if (!(key.split('.')[0] in detected)) {
    console.error(`${key} is not a key of the profile. Keys: ${Object.keys(detected).filter((k) => !['schema', 'detectedAt', 'confirmed', 'adapter'].includes(k)).join(', ')} (dotted inside them).`);
    process.exit(2);
  }
  let next;
  try {
    next = confirmKey(profile, key, parseValue(raw));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  save(next);
  console.log(`Saved ${key} in ${relPath(root, file)} (confirmed: a new detection keeps it).`);
  process.exit(0);
}

if (cmd === 'write') {
  save(profile);
  console.log(`Saved the profile in ${relPath(root, file)}: ${profile.framework.name}${profile.bundler ? ` + ${profile.bundler.name}` : ''}, ${profile.kind ?? 'kind unknown'}, adapter ${profile.adapter ?? 'none'}.`);
  process.exit(0);
}

console.error('Commands: detect | get | set | write. See the header of this file.');
process.exit(2);
