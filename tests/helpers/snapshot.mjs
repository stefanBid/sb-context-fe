// Golden files for outputs other skills or the model read as a format (design-source.md, reports).
// A change to them must be a decision, visible in review: regenerate with UPDATE_SNAPSHOTS=1 npm test
// and commit the diff. Portable on purpose (node:test's own snapshots need Node 22.3+).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { REPO } from './fixture.mjs';

const DIR = join(REPO, 'tests/snapshots');
const today = new Date().toISOString().slice(0, 10);

/** Removes what changes between runs and machines: today's date, temp roots, Windows separators and CRLF. */
export function normalize(text, { roots = [] } = {}) {
  let t = text.replaceAll('\r\n', '\n').replaceAll(today, '<today>');
  for (const r of roots) t = t.replaceAll(r, '<root>').replaceAll(r.replaceAll('\\', '\\\\'), '<root>');
  if (process.platform === 'win32') t = t.replaceAll('\\\\', '/').replaceAll('\\', '/');
  return t;
}

export function matchSnapshot(name, text, opts) {
  const file = join(DIR, name);
  const actual = normalize(text, opts);
  if (process.env.UPDATE_SNAPSHOTS || !existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  assert.equal(actual, readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), `${name} changed: if it is intended, run UPDATE_SNAPSHOTS=1 npm test and commit the snapshot`);
}
