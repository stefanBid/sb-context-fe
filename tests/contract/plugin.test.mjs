// The marketplace as a package: what a skill points to must exist inside its own plugin, files that
// must agree do agree. A broken path in a SKILL.md fails silently at run time (the model just cannot
// find the script), and a path that leaves the plugin works here but not once the plugin is installed
// alone in Claude Code's cache: here both fail the build.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, lf } from '../helpers/fixture.mjs';

const read = (p) => lf(readFileSync(join(REPO, p), 'utf8'));
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: REPO, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && existsSync(join(REPO, f)));
const dirs = (p) => (existsSync(join(REPO, p)) ? readdirSync(join(REPO, p)).filter((d) => statSync(join(REPO, p, d)).isDirectory()).sort() : []);

/** Every plugin of the marketplace, and the skills of each. */
const PLUGINS = dirs('plugins');
const SKILLS = PLUGINS.flatMap((plugin) => dirs(`plugins/${plugin}/skills`).map((skill) => ({ plugin, skill, id: `${plugin}:${skill}` })));
const IDS = new Set(SKILLS.map((s) => s.id));
/** The plugins that run scripts and carry a copy of core/. The bundle has neither. */
const WITH_CORE = ['sb-core', 'sb-github', 'sb-health', 'sb-design'];
const BUNDLE = 'sb-context-fe';

const skillFiles = ({ plugin, skill }) => tracked.filter((f) => f.startsWith(`plugins/${plugin}/skills/${skill}/`) && f.endsWith('.md'));
/** Scripts of the repo, without the generated copies of core/ (checked once, against core/). */
const SCRIPTS = tracked.filter((f) => /^(scripts|core|plugins)\/.*\.mjs$/.test(f) && !/^plugins\/[^/]+\/core\//.test(f));

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split('\n').filter((l) => /^[\w-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
}

describe('skills', () => {
  test('every plugin with scripts has at least one skill', () => {
    for (const p of WITH_CORE) assert.ok(SKILLS.some((s) => s.plugin === p), p);
  });

  for (const s of SKILLS) {
    describe(s.id, () => {
      const md = read(`plugins/${s.plugin}/skills/${s.skill}/SKILL.md`);
      const pluginDir = join(REPO, 'plugins', s.plugin);

      test('SKILL.md has a frontmatter with the folder name and a description', () => {
        const fm = frontmatter(md);
        assert.ok(fm, 'no frontmatter');
        assert.equal(fm.name, s.skill);
        assert.ok(fm.description && fm.description.length >= 40, 'description too short to trigger the skill');
        assert.ok(fm.description.length <= 1024, `description is ${fm.description.length} characters (max 1024)`);
      });

      test('every ${CLAUDE_SKILL_DIR} path exists inside its own plugin', () => {
        for (const file of skillFiles(s)) {
          const text = read(file);
          for (const [, p] of text.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([^\s`"')]+)/g)) {
            const target = resolve(REPO, 'plugins', s.plugin, 'skills', s.skill, p.replace(/[.,:;]+$/, ''));
            assert.ok(target.startsWith(pluginDir + sep), `${file}: ${p} points outside the plugin ${s.plugin}: once installed it would not be there`);
            assert.ok(existsSync(target), `${file}: ${p} → ${relative(REPO, target)} does not exist`);
          }
        }
      });

      test('relative markdown links resolve', () => {
        for (const file of skillFiles(s)) {
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

test('every /<plugin>:<skill> reference names an existing skill', () => {
  for (const file of tracked.filter((f) => f.endsWith('.md') && !f.endsWith('CHANGELOG.md'))) {
    for (const [, id] of read(file).matchAll(/\/(sb-[a-z]+:[a-z][a-z-]*[a-z])\b/g)) assert.ok(IDS.has(id), `${file}: unknown skill "/${id}"`);
  }
});

test('the 0.x names appear only where the migration documents them', () => {
  const allowed = new Set(['CHANGELOG.md', 'README.md', 'plugins/sb-core/skills/migration/SKILL.md', 'plugins/sb-core/skills/setup/SKILL.md', 'plugins/sb-core/README.md', 'plugins/sb-core/scripts/lib/migration.mjs', 'plugins/sb-core/scripts/migrate-v1.mjs', '.claude-plugin/marketplace.json']);
  const problems = [];
  for (const f of tracked.filter((x) => /\.(md|mjs|json)$/.test(x) && !x.startsWith('tests/') && !x.endsWith('CHANGELOG.md') && !x.includes('/core/') && !x.startsWith('core/') && !allowed.has(x) && !['package.json', 'package-lock.json'].includes(x)))
    for (const [m] of read(f).matchAll(/sb-context-nuxt:[a-z-]+|\.sb-context-nuxt\b|project-settings\.json|github_settings\.json/g)) problems.push(`${f}: ${m}`);
  assert.deepEqual(problems, []);
});

test('subcommands used in the skills exist in the scripts', () => {
  const commands = { 'dependency-notes.mjs': ['list', 'add', 'touch', 'resolve'], 'project-settings.mjs': ['detect', 'get', 'set'], 'github-settings.mjs': ['get', 'status', 'set', 'refresh'], 'profile.mjs': ['detect', 'get', 'set', 'write'], 'project-plugins.mjs': ['plan', 'disable', 'enable', 'reset'] };
  for (const file of tracked.filter((f) => f.endsWith('.md'))) {
    for (const [script, valid] of Object.entries(commands)) {
      const text = read(file);
      const re = new RegExp(`${script.replace('.', '\\.')}"?[ \\t]+([a-z]+)\\b`, 'g');
      for (const [, cmd] of text.matchAll(re)) assert.ok(valid.includes(cmd), `${file}: ${script} ${cmd} is not a command`);
      // a skill that names the script in a variable (GS="…/github-settings.mjs") calls it as node "$GS" <cmd>
      for (const [, v] of text.matchAll(new RegExp(`\\b([A-Z]+)="[^"]*/${script.replace('.', '\\.')}"`, 'g')))
        for (const [, cmd] of text.matchAll(new RegExp(`"\\$${v}"[ \\t]+([a-z]+)\\b`, 'g'))) assert.ok(valid.includes(cmd), `${file}: ${script} (as $${v}) ${cmd} is not a command`);
    }
  }
});

test('the shared color helpers are identical in every skill that ships one', () => {
  const copies = tracked.filter((f) => f.endsWith('/scripts/color.mjs'));
  assert.ok(copies.length >= 2);
  for (const c of copies.slice(1)) assert.equal(read(c), read(copies[0]), `${c} differs from ${copies[0]}`);
});

describe('core', () => {
  test('every plugin with scripts carries an up-to-date copy of core/', () => {
    execFileSync(process.execPath, [join(REPO, 'scripts/sync-core.mjs'), '--check'], { cwd: REPO, encoding: 'utf8' });
  });

  test('the bundle carries nothing but its manifest (and the changelog release-please writes)', () => {
    const files = tracked.filter((f) => f.startsWith(`plugins/${BUNDLE}/`) && f !== `plugins/${BUNDLE}/CHANGELOG.md`);
    assert.deepEqual(files, [`plugins/${BUNDLE}/.claude-plugin/plugin.json`]);
  });
});

test('every script parses and every relative import resolves inside its own plugin', () => {
  for (const f of SCRIPTS) {
    execFileSync(process.execPath, ['--check', join(REPO, f)]);
    const home = f.startsWith('plugins/') ? join(REPO, ...f.split('/').slice(0, 2)) : join(REPO, f.split('/')[0]);
    for (const [, spec] of read(f).matchAll(/^import\s[^'"]*['"](\.[^'"]+)['"]/gm)) {
      const target = resolve(REPO, f, '..', spec);
      assert.ok(existsSync(target), `${f}: import ${spec} not found`);
      assert.ok(target.startsWith(home + sep), `${f}: import ${spec} leaves ${relative(REPO, home)}`);
    }
  }
});

test('the plugins have no runtime dependencies outside node: and their own files', () => {
  for (const f of SCRIPTS) {
    for (const [, spec] of read(f).matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) assert.ok(spec.startsWith('node:') || spec.startsWith('.'), `${f}: imports "${spec}" (resolve project packages with createRequire instead)`);
  }
});

describe('manifests', () => {
  const market = JSON.parse(read('.claude-plugin/marketplace.json'));
  const released = JSON.parse(read('.release-please-manifest.json'));
  const manifest = (p) => JSON.parse(read(`plugins/${p}/.claude-plugin/plugin.json`));

  test('the marketplace lists every plugin folder, and only those', () => {
    assert.equal(market.name, 'sb-context-fe');
    assert.deepEqual(market.plugins.map((p) => p.name).sort(), [...PLUGINS].sort());
    for (const p of market.plugins) assert.equal(p.source, `./plugins/${p.name}`, p.name);
  });

  test('release-please releases every plugin with tags it can parse back', () => {
    const cfg = JSON.parse(read('release-please-config.json'));
    assert.deepEqual(Object.keys(cfg.packages).sort(), PLUGINS.map((p) => `plugins/${p}`).sort());
    for (const [path, pkg] of Object.entries(cfg.packages)) assert.equal(pkg.component, path.split('/')[1], path);
    // release-please splits a tag on a one-character separator: with "--" it reads the component as "sb-core-" and loses every release
    assert.ok(!cfg['tag-separator'] || cfg['tag-separator'].length === 1, `tag-separator "${cfg['tag-separator']}" cannot be parsed back`);
  });

  test('users of sb-context-nuxt are moved to the bundle', () => {
    assert.equal(market.renames?.['sb-context-nuxt'], BUNDLE);
  });

  for (const p of PLUGINS) {
    test(`${p}: name, released version and dependencies`, () => {
      const m = manifest(p);
      assert.equal(m.name, p);
      assert.match(m.version, /^\d+\.\d+\.\d+$/);
      assert.equal(m.version, released[`plugins/${p}`], 'version differs from .release-please-manifest.json');
      const deps = (m.dependencies ?? []).map((d) => (typeof d === 'string' ? d : d.name)).sort();
      if (p === BUNDLE) assert.deepEqual(deps, [...WITH_CORE].sort());
      else if (p === 'sb-core') assert.deepEqual(deps, []);
      else assert.deepEqual(deps, ['sb-core']);
    });
  }

  test('the JSON assets the skills apply are valid', () => {
    for (const f of tracked.filter((x) => x.startsWith('plugins/') && x.endsWith('.json'))) assert.doesNotThrow(() => JSON.parse(read(f)), f);
    const labels = JSON.parse(read('plugins/sb-github/skills/admin/labels/labels.json'));
    const names = (Array.isArray(labels) ? labels : labels.labels).map((l) => l.name);
    assert.equal(new Set(names).size, names.length, 'duplicate label');
  });
});

describe('docs agree with the code', () => {
  test('the PR title types of CONTRIBUTING are the ones the lint accepts', () => {
    const table = [...read('CONTRIBUTING.md').matchAll(/^\| `([a-z]+)` \|/gm)].map((m) => m[1]).sort();
    for (const wf of ['.github/workflows/pr-title-lint.yml', 'plugins/sb-github/skills/checks/workflows/pr-title-lint.yml']) {
      const types = read(wf).match(/types: \|\n((?:\s+[a-z]+\n)+)/)[1].trim().split(/\s+/).sort();
      assert.deepEqual(types, table, wf);
    }
  });

  test('CONTRIBUTING lists every plugin and core as a scope', () => {
    const scopes = read('CONTRIBUTING.md').match(/### Scopes[\s\S]*?\n\n([\s\S]*?)\n\n/)[1];
    for (const s of ['core', ...PLUGINS]) assert.match(scopes, new RegExp(`\`${s}\``), s);
  });

  test('the README mentions every skill as /<plugin>:<skill>', () => {
    const readme = read('README.md');
    for (const s of SKILLS) assert.ok(readme.includes(`/${s.id}`), s.id);
  });

  test('every plugin has a README that names each of its skills', () => {
    for (const p of WITH_CORE) {
      const readme = read(`plugins/${p}/README.md`);
      for (const s of SKILLS.filter((x) => x.plugin === p)) assert.ok(readme.includes(`/${s.id}`), `plugins/${p}/README.md: ${s.id}`);
    }
  });
});
