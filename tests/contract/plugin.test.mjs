// The plugin as a package: what a skill points to must exist, files that must agree do agree.
// A broken path in a SKILL.md fails silently at run time (the model just cannot find the script):
// here it fails the build.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, lf } from '../helpers/fixture.mjs';

const read = (p) => lf(readFileSync(join(REPO, p), 'utf8'));
const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean);
const SKILLS = readdirSync(join(REPO, 'skills')).filter((d) => statSync(join(REPO, 'skills', d)).isDirectory()).sort();
const skillFiles = (skill) => tracked.filter((f) => f.startsWith(`skills/${skill}/`) && f.endsWith('.md'));

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split('\n').filter((l) => /^[\w-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
}

describe('skills', () => {
  test('there is at least one skill', () => assert.ok(SKILLS.length > 0));

  for (const skill of SKILLS) {
    describe(skill, () => {
      const md = read(`skills/${skill}/SKILL.md`);

      test('SKILL.md has a frontmatter with the folder name and a description', () => {
        const fm = frontmatter(md);
        assert.ok(fm, 'no frontmatter');
        assert.equal(fm.name, skill);
        assert.ok(fm.description && fm.description.length >= 40, 'description too short to trigger the skill');
        assert.ok(fm.description.length <= 1024, `description is ${fm.description.length} characters (max 1024)`);
      });

      test('every ${CLAUDE_SKILL_DIR} path exists', () => {
        for (const file of skillFiles(skill)) {
          const text = read(file);
          for (const [, p] of text.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([^\s`"')]+)/g)) {
            const target = resolve(REPO, 'skills', skill, p.replace(/[.,:;]+$/, ''));
            assert.ok(existsSync(target), `${file}: ${p} → ${relative(REPO, target)} does not exist`);
            assert.ok(target.startsWith(REPO + sep), `${file}: ${p} points outside the plugin`);
          }
        }
      });

      test('relative markdown links resolve', () => {
        for (const file of skillFiles(skill)) {
          for (const [, href] of read(file).matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
            if (/^[a-z]+:/i.test(href)) continue;
            const target = resolve(REPO, file, '..', href);
            assert.ok(existsSync(target), `${file}: link ${href} is broken`);
          }
        }
      });
    });
  }
});

test('every /sb-context-nuxt:<skill> reference names an existing skill', () => {
  for (const file of tracked.filter((f) => f.endsWith('.md') && f !== 'CHANGELOG.md')) {
    for (const [, name] of read(file).matchAll(/sb-context-nuxt:([a-z][a-z-]*[a-z])/g)) assert.ok(SKILLS.includes(name), `${file}: unknown skill "${name}"`);
  }
});

test('subcommands used in the skills exist in the scripts', () => {
  const commands = { 'dependency-notes.mjs': ['list', 'add', 'touch', 'resolve'], 'project-settings.mjs': ['detect', 'get', 'set'] };
  for (const file of tracked.filter((f) => f.endsWith('.md'))) {
    for (const [script, valid] of Object.entries(commands)) {
      const re = new RegExp(`${script.replace('.', '\\.')}"?\\s+([a-z]+)\\b`, 'g');
      for (const [, cmd] of read(file).matchAll(re)) assert.ok(valid.includes(cmd), `${file}: ${script} ${cmd} is not a command`);
    }
  }
});

test('the shared color helpers are identical in every skill that ships one', () => {
  const copies = tracked.filter((f) => f.endsWith('/scripts/color.mjs'));
  assert.ok(copies.length >= 2);
  for (const c of copies.slice(1)) assert.equal(read(c), read(copies[0]), `${c} differs from ${copies[0]}`);
});

test('every script parses and every relative import resolves', () => {
  const scripts = tracked.filter((f) => /^(scripts|skills)\/.*\.mjs$/.test(f));
  for (const f of scripts) {
    execFileSync(process.execPath, ['--check', join(REPO, f)]);
    for (const [, spec] of read(f).matchAll(/^import\s[^'"]*['"](\.[^'"]+)['"]/gm)) assert.ok(existsSync(resolve(REPO, f, '..', spec)), `${f}: import ${spec} not found`);
  }
});

test('the plugin has no runtime dependencies outside node: and its own files', () => {
  for (const f of tracked.filter((x) => /^(scripts|skills)\/.*\.mjs$/.test(x))) {
    for (const [, spec] of read(f).matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) assert.ok(spec.startsWith('node:') || spec.startsWith('.'), `${f}: imports "${spec}" (resolve project packages with createRequire instead)`);
  }
});

describe('manifests', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  const market = JSON.parse(read('.claude-plugin/marketplace.json'));

  test('plugin and marketplace agree, and the version is the released one', () => {
    assert.equal(plugin.name, 'sb-context-nuxt');
    assert.ok(market.plugins.some((p) => p.name === plugin.name && p.source === './'));
    assert.equal(plugin.version, JSON.parse(read('.release-please-manifest.json'))['.']);
    assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  });

  test('the JSON assets the skills apply are valid', () => {
    for (const f of tracked.filter((x) => x.startsWith('skills/') && x.endsWith('.json'))) assert.doesNotThrow(() => JSON.parse(read(f)), f);
    const labels = JSON.parse(read('skills/gh-admin/labels/labels.json'));
    const names = (Array.isArray(labels) ? labels : labels.labels).map((l) => l.name);
    assert.equal(new Set(names).size, names.length, 'duplicate label');
  });
});

describe('docs agree with the code', () => {
  test('the PR title types of CONTRIBUTING are the ones the lint accepts', () => {
    const table = [...read('CONTRIBUTING.md').matchAll(/^\| `([a-z]+)` \|/gm)].map((m) => m[1]).sort();
    for (const wf of ['.github/workflows/pr-title-lint.yml', 'skills/gh-checks/workflows/pr-title-lint.yml']) {
      const types = read(wf).match(/types: \|\n((?:\s+[a-z]+\n)+)/)[1].trim().split(/\s+/).sort();
      assert.deepEqual(types, table, wf);
    }
  });

  test('CONTRIBUTING lists every skill as a scope', () => {
    const scopes = read('CONTRIBUTING.md').match(/## Scopes[\s\S]*?\n\n([\s\S]*?)\n\n/)[1];
    for (const s of SKILLS) assert.match(scopes, new RegExp(`\`${s}\``), s);
  });

  test('the README mentions every skill', () => {
    const readme = read('README.md');
    for (const s of SKILLS) assert.match(readme, new RegExp(`\\b${s}\\b`), s);
  });
});
