#!/usr/bin/env node
// PreToolUse hook: refuses any tool call that would write a lockfile by hand (rules in scripts/lib/lockfile-guard.mjs).
// Exit 2 blocks the call and hands the reason to Claude; exit 0 lets it through. An input it cannot read lets the call through.

import { lockfileWrite, GUARD_MESSAGE } from '../scripts/lib/lockfile-guard.mjs';

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let event;
  try { event = JSON.parse(raw); } catch { process.exit(0); }
  const why = lockfileWrite({ tool: event.tool_name, input: event.tool_input });
  if (!why) process.exit(0);
  process.stderr.write(GUARD_MESSAGE(why) + '\n');
  process.exit(2);
});
