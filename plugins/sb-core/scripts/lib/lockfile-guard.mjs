// The lockfile is written by the package manager's install, and by nothing else: never by hand, never by a
// script, never deleted to be regenerated. The PreToolUse hook of sb-core (hooks/lockfile-guard.mjs) asks
// `lockfileWrite` about every file tool call and every shell command, and blocks the ones that would write one.

/** The lockfiles of the JavaScript package managers. */
export const LOCKFILES = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'deno.lock'];

const NAME = LOCKFILES.map((f) => f.replaceAll('.', '\\.')).join('|');
// a lockfile name as a whole word of a path: `package-lock.json`, `./app/yarn.lock`, `"pnpm-lock.yaml"`
const MENTION = new RegExp(`(?:^|[\\s'"=/:(])(?:${NAME})(?=$|[\\s'";|&)<>])`);
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
// commands that only read what they are given
const READERS = new Set(['cat', 'head', 'tail', 'less', 'more', 'grep', 'egrep', 'fgrep', 'rg', 'wc', 'ls', 'stat', 'file', 'diff', 'cmp', 'jq', 'shasum', 'sha256sum', 'md5', 'md5sum', 'echo', 'test', '[']);
// git subcommands that do not write a file of the working tree by hand (restore/checkout put back a version an install wrote)
const GIT_OK = new Set(['add', 'diff', 'log', 'show', 'status', 'blame', 'restore', 'checkout', 'stash', 'ls-files', 'commit', 'grep', 'check-ignore']);

const baseName = (p) => String(p ?? '').split(/[\\/]/).pop();

/** The segments of a shell command, split on ; && || | and newlines (quotes are not parsed: stricter, not looser). */
const segments = (cmd) => cmd.split(/\|\||&&|[;|\n]/).map((s) => s.trim()).filter(Boolean);

/**
 * Whether a tool call would write a lockfile by hand. `{ tool, input }` as Claude Code passes them to a hook.
 * Returns null when the call is allowed, or the reason it is refused.
 */
export function lockfileWrite({ tool, input = {} }) {
  if (FILE_TOOLS.has(tool)) {
    const f = baseName(input.file_path ?? input.notebook_path);
    return LOCKFILES.includes(f) ? `${tool} on ${f}` : null;
  }
  if (tool !== 'Bash' || typeof input.command !== 'string') return null;
  for (const seg of segments(input.command)) {
    if (!MENTION.test(seg)) continue;
    if (new RegExp(`>\\s*['"]?[^\\s'"]*(?:${NAME})`).test(seg)) return `a redirection into the lockfile: ${seg}`;
    const words = seg.replace(/^(?:\w+=\S*\s+)+/, '').split(/\s+/);
    const [cmd, sub] = [baseName(words[0]), words[1]];
    if (cmd === 'git' && GIT_OK.has(sub)) continue;
    if ((cmd === 'sed' || cmd === 'awk' || cmd === 'gawk') && !/\s-i|inplace/.test(seg)) continue;
    if (READERS.has(cmd)) continue;
    return `a command that touches the lockfile by hand: ${seg}`;
  }
  return null;
}

export const GUARD_MESSAGE = (why) =>
  `Blocked by sb-core: ${why}.\n` +
  'The lockfile is written only by the project\'s install (npm install / npm ci, pnpm install, yarn install, bun install), ' +
  'after a constraint changed in package.json. Never by hand, never by a script, never deleted to be regenerated: ' +
  'this rule has no exception, not even on request. Change package.json and run the install instead; ' +
  'for a merge conflict on the lockfile, take one side with git checkout --theirs/--ours and run the install.';
