import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { lockfileWrite, LOCKFILES, GUARD_MESSAGE } from '../../plugins/sb-core/scripts/lib/lockfile-guard.mjs';

const bash = (command) => lockfileWrite({ tool: 'Bash', input: { command } });

describe('lockfileWrite', () => {
  test('every file tool on every lockfile is refused, anywhere in the tree', () => {
    for (const tool of ['Write', 'Edit', 'MultiEdit']) {
      for (const f of LOCKFILES) {
        assert.ok(lockfileWrite({ tool, input: { file_path: `/p/app/${f}` } }), `${tool} ${f}`);
        assert.ok(lockfileWrite({ tool, input: { file_path: `C:\\p\\${f}` } }), `${tool} ${f} (Windows)`);
      }
    }
  });

  test('other files and other tools pass', () => {
    assert.equal(lockfileWrite({ tool: 'Edit', input: { file_path: '/p/package.json' } }), null);
    assert.equal(lockfileWrite({ tool: 'Write', input: { file_path: '/p/docs/package-lock.json.md' } }), null);
    assert.equal(lockfileWrite({ tool: 'Read', input: { file_path: '/p/package-lock.json' } }), null);
    assert.equal(lockfileWrite({ tool: 'Bash', input: {} }), null);
  });

  test('installs, reads and git versions written by an install pass', () => {
    for (const c of [
      'npm install', 'npm ci', 'pnpm install --frozen-lockfile', 'yarn install --immutable', 'bun install',
      'npm cache clean --force && npm install',
      'cat package-lock.json', 'grep -n lodash package-lock.json | head', 'jq .packages package-lock.json > /tmp/out.json',
      'git diff package-lock.json', 'git add package.json package-lock.json', 'git checkout --theirs package-lock.json && npm install',
      'git restore pnpm-lock.yaml', 'sed -n 1,20p yarn.lock', 'ls package-lock.json',
    ]) assert.equal(bash(c), null, c);
  });

  test('every way of writing the lockfile by hand is refused', () => {
    for (const c of [
      'echo {} > package-lock.json', 'cat a.json >> package-lock.json', 'jq . x.json > "package-lock.json"',
      'sed -i "s/1.0.0/1.0.1/" package-lock.json', "sed -i '' 's/a/b/' yarn.lock", 'perl -pi -e s/a/b/ pnpm-lock.yaml',
      'rm package-lock.json && npm install', 'rm -rf node_modules package-lock.json', 'cp /tmp/lock.json package-lock.json',
      'mv lock.bak ./app/package-lock.json', 'node -e "require(\'fs\').writeFileSync(\'package-lock.json\', \'{}\')"',
      'python3 fix.py yarn.lock', 'npm install; tee package-lock.json < x', 'git rm package-lock.json', 'truncate -s 0 bun.lockb',
      'FOO=1 node scripts/patch.mjs package-lock.json',
    ]) assert.ok(bash(c), c);
  });

  test('the message says the install is the only way and that there is no exception', () => {
    const m = GUARD_MESSAGE('Edit on package-lock.json');
    assert.match(m, /Edit on package-lock\.json/);
    assert.match(m, /only by the project's install/);
    assert.match(m, /no exception/);
  });
});
