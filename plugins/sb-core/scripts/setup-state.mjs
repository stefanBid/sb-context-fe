#!/usr/bin/env node
// What the plugin already knows about this project, and what to run next. Used by the setup skill
// on a project that is already in progress (or already aligned), where onboard would do too much.
//
// Usage (from anywhere inside a Nuxt project):
//   node setup-state.mjs           the state as JSON: the project profile (saved or not, confirmed values that drifted),
//                                  the .sb-context folder and its files, the four
//                                  global style files, the design snapshot, the GitHub side, project docs,
//                                  and the recommended next skills. Writes nothing.
//   node setup-state.mjs --init    also creates .sb-context/ and its .gitignore (personal and throwaway files)
//                                  (the only write; no other project file is touched)
//
// The project settings are not judged here: `project-settings.mjs detect` lists what is missing.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, cssDirOf, contextDirOf, ensureContextDir, relPath, CONTEXT_DIR } from '../core/lib/project.mjs';
import { themePrefixOf } from '../core/lib/settings.mjs';
import { loadProfile } from '../core/lib/profile.mjs';
import { LOCAL_FILES, STYLE_FILES, githubRemoteOf, recommend } from './lib/setup.mjs';

const root = projectRoot();
const dir = contextDirOf(root);
const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== '--init');
if (unknown.length) {
  console.error(`Unknown argument ${unknown[0]}. Usage: setup-state.mjs [--init]`);
  process.exit(2);
}

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

let initialized = null;
if (args.includes('--init')) {
  initialized = ensureContextDir(root);
}

const git = existsSync(join(root, '.git'));
// whether the project keeps the whole folder out of git: the user's choice, in the project's own .gitignore
const ignoredByProject = new RegExp(`^/?${CONTEXT_DIR.replace('.', '\\.')}/?$`, 'm').test(read(join(root, '.gitignore')));
const files = Object.fromEntries(Object.keys(LOCAL_FILES).map((f) => [f, existsSync(join(dir, f))]));

const cssDir = cssDirOf(root);
const styleFiles = Object.fromEntries(STYLE_FILES.map((f) => [f, existsSync(join(cssDir, f))]));

const workflowsDir = join(root, '.github', 'workflows');
const workflows = existsSync(workflowsDir) ? readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f)) : [];
const github = readJson(join(dir, 'github.json'));
const notes = readJson(join(dir, 'dependency-notes.json'));

const prof = loadProfile(root);
const state = {
  root,
  git,
  profile: {
    saved: Boolean(prof.saved),
    framework: prof.profile?.framework ?? null,
    adapter: prof.profile?.adapter ?? null,
    kind: prof.profile?.kind ?? null,
    confirmed: prof.profile?.confirmed ?? [],
    drift: prof.drift.filter((d) => d.confirmed).map((d) => d.key),
  },
  folder: { path: relPath(root, dir), exists: existsSync(dir), gitignore: existsSync(join(dir, '.gitignore')), ignoredByProject, initialized },
  files,
  style: { cssDir: relPath(root, cssDir), files: styleFiles, prefix: themePrefixOf(read(join(cssDir, 'theme.css'))) },
  design: { source: files['design-source.md'], applied: files['design-applied.json'] },
  github: {
    remote: git ? githubRemoteOf(read(join(root, '.git', 'config'))) : null,
    cache: files['github.json'],
    signatureAsked: Boolean(github?.signature),
    prTitleLint: workflows.some((f) => read(join(workflowsDir, f)).includes('lint-pr-title')),
    releasePlease: existsSync(join(root, 'release-please-config.json')),
  },
  dependencyNotes: { open: Array.isArray(notes?.notes) ? notes.notes.filter((n) => n.status !== 'resolved').length : 0 },
  docs: Object.fromEntries(['DESIGN.md', 'PRODUCT.md', 'CLAUDE.md'].map((f) => [f, existsSync(join(root, f))])),
};
state.next = recommend(state);

console.log(JSON.stringify(state, null, 2));
process.exit(0);
