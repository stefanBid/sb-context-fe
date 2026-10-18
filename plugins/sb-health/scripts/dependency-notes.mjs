#!/usr/bin/env node
// Dependency notes: what the /sb-health:deps skill left pending, so the next run remembers it.
// A major update that was postponed (a library lags behind, a breaking change needs work, a conflict
// that is not ours) is written here with what to verify next time. Stored in
// `.sb-context/dependency-notes.json`, in the project (the folder can be committed).
//
// Usage (from anywhere inside a Nuxt or Vue project):
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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot, contextDirOf, ensureContextDir } from '../core/lib/project.mjs';
import { upsertNote, recordCheck, view } from './lib/dependency-notes.mjs';

const root = projectRoot();
const file = join(contextDirOf(root), 'dependency-notes.json');
const [cmd, ...rest] = process.argv.slice(2);

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
  ensureContextDir(root);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

// the logic lives in lib/dependency-notes.mjs and throws on bad input: report it as a usage error
const attempt = (fn) => {
  try {
    return fn();
  } catch (e) {
    return fail(e.message);
  }
};

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
  const data = load();
  const input = { pkg, target, status: flag('--status') || 'deferred', summary, recheck, current: flag('--current'), blockedBy: flagAll('--blocked-by'), links: flagAll('--link') };
  const { notes, note } = attempt(() => upsertNote(data.notes, input, today()));
  data.notes = notes;
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
  attempt(() => recordCheck(note, { text, resolve: cmd === 'resolve' }, today()));
  save(data);
  console.log(JSON.stringify(view(note), null, 2));
  process.exit(0);
}

fail('Usage: dependency-notes.mjs list [--all] | add <package> --target <v> --summary "…" --recheck "…" | touch <id> [--note "…"] | resolve <id> --resolution "…"');
