import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from '../helpers/fixture.mjs';

const HOOK = join(REPO, 'plugins/sb-core/hooks/lockfile-guard.mjs');
const run = (input) => spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8' });

describe('lockfile-guard hook', () => {
  test('a hand edit of the lockfile exits 2 with the reason on stderr', () => {
    const r = run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: '/p/package-lock.json' } }));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Blocked by sb-core: Edit on package-lock\.json/);
    assert.equal(r.stdout, '');
  });

  test('the install passes with exit 0 and no output', () => {
    const r = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm install' } }));
    assert.equal(r.status, 0);
    assert.equal(r.stderr + r.stdout, '');
  });

  test('an input it cannot read lets the call through', () => {
    assert.equal(run('not json').status, 0);
    assert.equal(run('').status, 0);
  });

  test('hooks.json wires the hook on the file tools and Bash, from the plugin root', () => {
    const cfg = JSON.parse(readFileSync(join(REPO, 'plugins/sb-core/hooks/hooks.json'), 'utf8'));
    const [entry] = cfg.hooks.PreToolUse;
    assert.deepEqual(entry.matcher.split('|').sort(), ['Bash', 'Edit', 'MultiEdit', 'NotebookEdit', 'Write']);
    assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/hooks/lockfile-guard.mjs"');
  });
});
