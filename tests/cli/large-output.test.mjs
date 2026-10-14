import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, withExampleStyle, run, SCRIPTS, EXAMPLE_CSS } from '../helpers/fixture.mjs';
import { extract } from '../helpers/design.mjs';

// A skill reads a script's output through a pipe. On macOS and Windows with Node 20 a pipe is written
// asynchronously, and a script that calls process.exit() right after a large console.log used to lose
// everything past 8 KB (scripts/lib/cli.mjs makes the writes blocking).
test('large JSON outputs reach a pipe whole', () => {
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
