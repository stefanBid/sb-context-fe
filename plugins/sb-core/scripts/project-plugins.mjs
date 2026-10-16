#!/usr/bin/env node
// Which sb-context-fe plugins this project needs, and turning the others off for this project only.
//
// Usage (from anywhere inside the project):
//   node project-plugins.mjs plan [--installed <id,id…>]   for each plugin: installed id, recommended or not and why,
//                                                         what the project settings say, and the skills worth listing (JSON).
//                                                         --installed: the plugin ids Claude Code lists (name@marketplace)
//   node project-plugins.mjs disable <id>…                 turns these plugins off in .claude/settings.local.json
//   node project-plugins.mjs enable <id>…                  turns them on there (overrides a user-level "off")
//   node project-plugins.mjs reset <id>…                   removes the entry: the user-level setting applies again
//
// .claude/settings.local.json is personal (Claude Code keeps it out of git) and wins over the user settings, so a
// plugin turned off here stays on in every other project. Only the four plugins of this marketplace are accepted,
// sb-core cannot be turned off (the others depend on it), and every other key of the file is kept as it is.
// The change applies after /reload-plugins.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, relPath } from '../core/lib/project.mjs';
import { loadProfile } from '../core/lib/profile.mjs';
import { pluginPlan, skillsFor, pluginIdError, withPlugin, githubRemoteOf } from './lib/setup.mjs';

const root = projectRoot();
const [cmd, ...rest] = process.argv.slice(2);
const local = join(root, '.claude', 'settings.local.json');
const shared = join(root, '.claude', 'settings.json');
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};
const readJson = (p) => {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fail(`${relPath(root, p)} is not valid JSON: fix it first (nothing was written).`);
  }
};

if (cmd === 'plan') {
  const i = rest.indexOf('--installed');
  const installed = i === -1 ? [] : (rest[i + 1] ?? '').split(',').filter(Boolean);
  const bad = installed.map(pluginIdError).find((e) => e && !/is not one of/.test(e));
  if (bad) fail(bad);
  const { profile } = loadProfile(root);
  let gitConfig = '';
  try {
    gitConfig = readFileSync(join(root, '.git', 'config'), 'utf8');
  } catch {}
  const plan = pluginPlan(profile, { github: Boolean(githubRemoteOf(gitConfig)) });
  const settings = { local: readJson(local)?.enabledPlugins ?? {}, shared: readJson(shared)?.enabledPlugins ?? {} };
  const rows = plan.map((p) => {
    const id = installed.find((x) => x.startsWith(`${p.plugin}@`)) ?? null;
    return { ...p, id, installed: Boolean(id), project: id ? (settings.local[id] ?? settings.shared[id] ?? null) : null };
  });
  console.log(JSON.stringify({ profile: profile && { framework: profile.framework.name, adapter: profile.adapter, kind: profile.kind, rendering: profile.rendering }, plugins: rows, skills: skillsFor(plan, profile), settingsFile: relPath(root, local) }, null, 2));
  process.exit(0);
}

const values = { disable: false, enable: true, reset: null };
if (!(cmd in values)) fail('Commands: plan | disable | enable | reset. See the header of this file.');
if (!rest.length) fail(`Usage: project-plugins.mjs ${cmd} <name@marketplace>…`);
for (const id of rest) {
  const err = pluginIdError(id);
  if (err) fail(err);
  if (cmd === 'disable' && id.startsWith('sb-core@')) fail('sb-core cannot be turned off: the other plugins depend on it.');
}
let settings = readJson(local) ?? {};
for (const id of rest) settings = withPlugin(settings, id, values[cmd]);
mkdirSync(join(root, '.claude'), { recursive: true });
writeFileSync(local, JSON.stringify(settings, null, 2) + '\n');
console.log(`${cmd === 'reset' ? 'Removed' : cmd === 'disable' ? 'Turned off' : 'Turned on'} for this project in ${relPath(root, local)}: ${rest.join(', ')}. Run /reload-plugins to apply.`);
process.exit(0);
