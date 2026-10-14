import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, run, SCRIPTS, EXAMPLE_CSS } from '../helpers/fixture.mjs';
import { extract } from '../helpers/design.mjs';

// A skill reads a script's output through a pipe. On Node 20 a pipe is written asynchronously, and a
// script that calls process.exit() right after a large console.log loses everything past 8 KB.
const node20 = Number(process.versions.node.split('.')[0]) < 22;
const todo = node20 && 'process.exit() right after a large write truncates piped stdout at 8 KB on Node 20';

test('large JSON outputs reach a pipe whole', { todo }, () => {
  const contrast = run(SCRIPTS.contrast, [`${EXAMPLE_CSS}/theme.css`, '--prefix', 'sb', '--json']);
  assert.ok(contrast.stdout.length > 8192, 'the case must be larger than one pipe chunk');
  assert.doesNotThrow(() => contrast.json(), 'contrast --json');

  const p = withExampleStyle(makeProject());
  try {
    extract(p);
    for (let i = 0; i < 60; i++) p.run(SCRIPTS.dependencyNotes, ['add', `pkg-${i}`, '--target', '2.0.0', '--summary', 'x'.repeat(80), '--recheck', 'y'.repeat(80)]);
    const notes = p.run(SCRIPTS.dependencyNotes, ['list']);
    assert.ok(notes.stdout.length > 8192);
    assert.doesNotThrow(() => notes.json(), 'dependency-notes list');
  } finally {
    p.cleanup();
  }
});
