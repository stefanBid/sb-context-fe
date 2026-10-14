#!/usr/bin/env node
// Turns an lcov report into shields.io endpoint files (https://shields.io/badges/endpoint-badge).
// Used by the Tests workflow on every push to main; the files are published on the `badges` branch.
//
// Usage: node .github/scripts/coverage-badge.mjs <lcov.info> <out dir>
// Writes <out dir>/coverage.json (lines) and <out dir>/coverage-branches.json, and prints both percentages.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [lcovPath, outDir] = process.argv.slice(2);
if (!lcovPath || !outDir) {
  console.error('Usage: coverage-badge.mjs <lcov.info> <out dir>');
  process.exit(2);
}

const totals = { LH: 0, LF: 0, BRH: 0, BRF: 0 };
for (const line of readFileSync(lcovPath, 'utf8').split('\n')) {
  const m = /^(LH|LF|BRH|BRF):(\d+)$/.exec(line.trim());
  if (m) totals[m[1]] += Number(m[2]);
}
if (!totals.LF) {
  console.error(`${lcovPath} has no line data.`);
  process.exit(1);
}

const pct = (hit, found) => (found ? (hit * 100) / found : 100);
const color = (p) => (p >= 90 ? 'brightgreen' : p >= 80 ? 'green' : p >= 70 ? 'yellowgreen' : p >= 60 ? 'yellow' : p >= 50 ? 'orange' : 'red');
const badge = (label, p) => ({ schemaVersion: 1, label, message: `${p.toFixed(1)}%`, color: color(p) });

const lines = pct(totals.LH, totals.LF);
const branches = pct(totals.BRH, totals.BRF);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'coverage.json'), `${JSON.stringify(badge('coverage', lines))}\n`);
writeFileSync(join(outDir, 'coverage-branches.json'), `${JSON.stringify(badge('branches', branches))}\n`);
console.log(`lines ${lines.toFixed(2)}% · branches ${branches.toFixed(2)}%`);
