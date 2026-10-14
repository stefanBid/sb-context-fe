#!/usr/bin/env node
// Dependency notes: what the dependency-check skill left pending, so the next run remembers it.
// A major update that was postponed (a library lags behind, a breaking change needs work, a conflict
// that is not ours) is written here with what to verify next time. Stored in
// `.sb-context-nuxt/dependency-notes.json` (local, kept out of git, never committed).
//
// Usage (from anywhere inside a Nuxt project):
//   node dependency-notes.mjs list [--all]            open notes (deferred, watching); --all adds the resolved ones (JSON)
//   node dependency-notes.mjs add <package> --target <version> --summary "<why it waits>" --recheck "<what to verify next time>"
//        [--current <version>] [--blocked-by <package>@<range>:<upstream|project>]... [--link <url>]... [--status deferred|watching]
//        creates the note, or updates the one with the same id (<package>@<target>), keeping its first-seen date
//   node dependency-notes.mjs touch <id> [--note "<what was found>"]      checked again, still pending
//   node dependency-notes.mjs resolve <id> --resolution "<how it ended>"  done (updated) or no longer relevant
//
// Status: deferred = waits for something outside the project's control or for a later decision;
//         watching = could move soon, look again at the next run; resolved = closed, kept as history.
// Blocker owner: upstream = another library has to release a fix; project = the project's own code,
//         constraint, override or choice has to change.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, pluginDirOf, excludePluginDir } from './lib/project.mjs';

const root = projectRoot();
const file = join(pluginDirOf(root), 'dependency-notes.json');
const [cmd, ...rest] = process.argv.slice(2);

const STATUSES = ['deferred', 'watching', 'resolved'];
const OWNERS = ['upstream', 'project'];
const today = () => new Date().toISOString().slice(0, 10);
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};

// first value of a flag, or every value when it can repeat
const flag = (n) => {
  const i = rest.indexOf(n);
  return i === -1 ? null : rest[i + 1];
};
const flagAll = (n) => rest.flatMap((a, i) => (a === n && rest[i + 1] !== undefined ? [rest[i + 1]] : []));

const load = () => {
  if (!existsSync(file)) return { version: 1, notes: [] };
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(data.notes)) fail(`${file} has no "notes" list: fix or remove it.`);
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

// "i18n@^9:upstream" → { package, range, owner }; the last ":" splits the owner, the last "@" (not at 0) the range
function parseBlocker(raw) {
  const cut = raw.lastIndexOf(':');
  const owner = cut === -1 ? '' : raw.slice(cut + 1);
  if (!OWNERS.includes(owner)) fail(`--blocked-by "${raw}": end it with :upstream or :project (who has to change something).`);
  const spec = raw.slice(0, cut);
  const at = spec.lastIndexOf('@');
  return at > 0 ? { package: spec.slice(0, at), range: spec.slice(at + 1), owner } : { package: spec, range: null, owner };
}

const days = (from) => Math.max(0, Math.floor((Date.now() - Date.parse(from)) / 86400000));
const view = (n) => ({ ...n, openDays: n.status === 'resolved' ? null : days(n.firstSeen), sinceLastCheckDays: days(n.lastChecked) });

// ---------------------------------------------------------------------------
if (cmd === 'list') {
  const all = rest.includes('--all');
  const notes = load().notes.filter((n) => all || n.status !== 'resolved');
  console.log(JSON.stringify({ file, count: notes.length, notes: notes.map(view) }, null, 2));
  process.exit(0);
}

if (cmd === 'add') {
  const pkg = rest[0];
  const target = flag('--target');
  const summary = flag('--summary');
  const recheck = flag('--recheck');
  if (!pkg || pkg.startsWith('--') || !target || !summary || !recheck) {
    fail('Usage: dependency-notes.mjs add <package> --target <version> --summary "<why>" --recheck "<what to verify next time>" [--current <v>] [--blocked-by <pkg>@<range>:<upstream|project>]... [--link <url>]... [--status deferred|watching]');
  }
  const status = flag('--status') || 'deferred';
  if (!STATUSES.includes(status) || status === 'resolved') fail(`--status must be deferred or watching (use "resolve" to close a note).`);
  const id = `${pkg}@${target}`;
  const data = load();
  const prev = data.notes.find((n) => n.id === id);
  const note = {
    id,
    package: pkg,
    current: flag('--current') ?? prev?.current ?? null,
    target,
    status,
    summary,
    blockedBy: flagAll('--blocked-by').map(parseBlocker),
    recheck,
    links: flagAll('--link'),
    firstSeen: prev?.firstSeen ?? today(),
    lastChecked: today(),
    history: prev?.history ?? [],
  };
  data.notes = prev ? data.notes.map((n) => (n.id === id ? note : n)) : [...data.notes, note];
  save(data);
  console.log(JSON.stringify(view(note), null, 2));
  process.exit(0);
}

if (cmd === 'touch' || cmd === 'resolve') {
  const id = rest[0];
  if (!id || id.startsWith('--')) fail(`Usage: dependency-notes.mjs ${cmd} <id> ${cmd === 'touch' ? '[--note "<found>"]' : '--resolution "<how it ended>"'}`);
  const data = load();
  const note = data.notes.find((n) => n.id === id);
  if (!note) fail(`No note "${id}". Open ones: ${data.notes.filter((n) => n.status !== 'resolved').map((n) => n.id).join(', ') || 'none'}.`);
  const text = cmd === 'touch' ? flag('--note') : flag('--resolution');
  if (cmd === 'resolve' && !text) fail('resolve needs --resolution "<how it ended>".');
  note.lastChecked = today();
  if (text) note.history = [...(note.history ?? []), { date: today(), text }];
  if (cmd === 'resolve') {
    note.status = 'resolved';
    note.resolvedAt = today();
    note.resolution = text;
  }
  save(data);
  console.log(JSON.stringify(view(note), null, 2));
  process.exit(0);
}

fail('Usage: dependency-notes.mjs list [--all] | add <package> --target <v> --summary "…" --recheck "…" | touch <id> [--note "…"] | resolve <id> --resolution "…"');
