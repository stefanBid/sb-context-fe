// What the plugin promises users about their machine: the scripts never reach the network or start
// other programs. (What they write is checked by tests/cli/writes.test.mjs.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO } from '../helpers/fixture.mjs';

const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean);
const SCRIPTS = tracked.filter((f) => /^(scripts|skills)\/.*\.mjs$/.test(f));
const FORBIDDEN = ['node:http', 'node:https', 'node:http2', 'node:net', 'node:tls', 'node:dgram', 'node:dns', 'node:child_process', 'node:cluster', 'node:worker_threads', 'node:vm', 'node:inspector'];

test('no script reaches the network or starts another program', () => {
  const problems = [];
  for (const f of SCRIPTS) {
    const src = readFileSync(join(REPO, f), 'utf8');
    for (const [, spec] of src.matchAll(/(?:^import\s[^'"]*|\bimport\(\s*|\brequire\(\s*)['"]([^'"]+)['"]/gm)) {
      const name = spec.startsWith('node:') ? spec : `node:${spec}`;
      if (FORBIDDEN.includes(name)) problems.push(`${f}: imports ${spec}`);
    }
    for (const call of ['fetch(', 'XMLHttpRequest', 'WebSocket(', 'eval(', 'new Function(']) if (src.includes(call)) problems.push(`${f}: uses ${call}`);
  }
  assert.deepEqual(problems, []);
});
