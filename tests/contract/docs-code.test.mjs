// What the docs tell the model must be what the code does. A SKILL.md that names a flag the script
// does not read, an exit code it never returns or a role the fixed set does not have makes the
// skill wrong without any error: these tests turn that into a failure.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO } from '../helpers/fixture.mjs';
import { ROLES, ROLE_TYPES } from '../../plugins/sb-design/skills/extract-style/scripts/lib/tokens.mjs';
import { STANDARD_PAIRS } from '../../plugins/sb-design/skills/align/scripts/lib/theme-vars.mjs';
import { PREF } from '../../plugins/sb-design/skills/migrate/scripts/lib/classes.mjs';

// LF even where git checks files out with CRLF (Windows)
const read = (p) => readFileSync(join(REPO, p), 'utf8').replaceAll('\r\n', '\n');
const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean);
// the scripts a doc can name: core/scripts, each plugin's scripts and each skill's scripts (not the copies of core/)
const SCRIPTS = tracked.filter((f) => /^(scripts|core\/scripts|plugins\/[^/]+\/scripts|plugins\/[^/]+\/skills\/[^/]+\/scripts)\/[^/]+\.mjs$/.test(f));
const DOCS = tracked.filter((f) => f.endsWith('.md') && f !== 'CHANGELOG.md' && !f.startsWith('tests/'));
const byName = Object.fromEntries(SCRIPTS.map((f) => [basename(f), f]));

/** The header comment of a script (the leading // lines) and the rest of the code. */
function split(file) {
  const lines = read(file).split('\n');
  let i = lines[0].startsWith('#!') ? 1 : 0;
  const header = [];
  for (; i < lines.length && lines[i].startsWith('//'); i++) header.push(lines[i]);
  return { header: header.join('\n'), code: lines.slice(i).join('\n') };
}

/** Flags the code reads: every quoted '--name' literal (a few CSS names slip in, which only widens the set). */
const flagsOf = (code) => new Set([...code.matchAll(/['"](--[a-z][a-z0-9-]*)['"]/g)].map((m) => m[1]));
const FLAGS = Object.fromEntries(SCRIPTS.map((f) => [basename(f), flagsOf(split(f).code)]));

/** Exit codes the code can return: integer literals inside process.exit(…). */
const exitsOf = (code) => new Set([...code.matchAll(/process\.exit\(([^)]*)\)/g)].flatMap((m) => (m[1].match(/\b\d+\b/g) ?? []).map(Number)));

const flagTokens = (line) => [...line.matchAll(/(?<![\w-])(--[a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?![\w-])/g)].map((m) => m[1]);

describe('flags', () => {
  test('every flag a doc line gives a script exists in that script', () => {
    const problems = [];
    for (const doc of DOCS) {
      read(doc).split('\n').forEach((line, i) => {
        const scripts = [...line.matchAll(/([a-z][a-z0-9-]*\.mjs)\b/g)].map((m) => m[1]).filter((s) => FLAGS[s]);
        if (!scripts.length) return;
        for (const flag of flagTokens(line)) {
          if (/^--(?:[a-z]{2,4}-|text-|color-|font-|radius-|shadow-)/.test(flag) && !scripts.some((s) => FLAGS[s].has(flag))) continue; // a CSS variable, not a flag
          if (!scripts.some((s) => FLAGS[s].has(flag))) problems.push(`${doc}:${i + 1}: ${flag} is not read by ${scripts.join(' / ')}`);
        }
      });
    }
    assert.deepEqual(problems, []);
  });

  test('every flag in a script header exists in its code', () => {
    const problems = [];
    for (const f of SCRIPTS) {
      const { header, code } = split(f);
      const flags = flagsOf(code);
      for (const flag of new Set(flagTokens(header.split('\n').filter((l) => !/--[a-z]{2,4}-[a-z]|var\(--/.test(l)).join('\n'))))
        if (!flags.has(flag)) problems.push(`${f}: header documents ${flag}, the code never reads it`);
    }
    assert.deepEqual(problems, []);
  });
});

describe('exit codes', () => {
  // 2 is the plugin-wide "bad usage / cannot run" code: not repeated in every doc
  const documented = (text) => new Set((text.match(/\b(0|1|3|4|10)\b/g) ?? []).map(Number));

  const cases = {
    'sync-values.mjs': (h) => h.split('\n').find((l) => /Exit codes:/.test(l)),
    'check-i18n.mjs': (h) => h.split('\n').find((l) => /^\/\/ Exit /.test(l)),
    'contrast.mjs': (h) => h.split('\n').find((l) => /Exits with code/.test(l)),
    'lib-check.mjs': (h) => h.split('\n').find((l) => /Exit codes:/.test(l)),
  };
  for (const [script, pick] of Object.entries(cases)) {
    test(`${script}: the header lists exactly the codes the code returns`, () => {
      const { header, code } = split(byName[script]);
      const line = pick(header);
      assert.ok(line, 'no exit code line in the header');
      const doc = documented(line);
      const real = new Set([...exitsOf(code)].filter((c) => c !== 2));
      if (script === 'contrast.mjs') doc.add(0);
      assert.deepEqual([...real].sort(), [...doc].sort(), line);
    });
  }

  test('tokens-to-source.mjs: exit 4 (coverage mismatch) is documented', () => {
    assert.ok(exitsOf(split(byName['tokens-to-source.mjs']).code).has(4));
    assert.match(read('plugins/sb-design/skills/extract-style/references/design-source.md'), /exits with code 4/);
  });

  test('the README table of sync-values codes matches the script', () => {
    const section = read('README.md').split('### Exit codes of sync-values')[1].split('\n---')[0];
    const table = new Set([...section.matchAll(/^\| `(\d+)` \|/gm)].map((m) => Number(m[1])));
    const real = new Set([...exitsOf(split(byName['sync-values.mjs']).code)].filter((c) => c !== 2));
    assert.deepEqual([...table].sort(), [...real].sort());
  });
});

describe('roles', () => {
  const method = read('plugins/sb-design/standard/roles.md');
  const table = method.split('| Group | Roles | What they are for |')[1].split('\n\n')[0];
  const METHOD_COLORS = new Set(
    table.split('\n').flatMap((row) => {
      const cell = row.split('|')[2] ?? '';
      const names = [...cell.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]).filter((n) => n !== '-soft');
      return /their `-soft`/.test(cell) ? names.flatMap((n) => [n, `${n}-soft`]) : names;
    }),
  );

  test('the method lists the color roles of the design extraction, and nothing else', () => {
    assert.deepEqual([...METHOD_COLORS].sort(), [...ROLES].sort());
  });

  test('contrast pairs and template preferences use only fixed roles', () => {
    const used = new Set([...STANDARD_PAIRS.flatMap(([fg, bg]) => [fg, bg]), ...Object.values(PREF).flat()]);
    assert.deepEqual([...used].filter((r) => !METHOD_COLORS.has(r)), []);
  });

  test('the typography reference lists the type roles of the design extraction', () => {
    const typo = read('plugins/sb-design/standard/typography.md').split('| Role | Family | Purpose |')[1].split('\n\n')[0];
    const roles = [...typo.matchAll(/^\| `([a-z0-9-]+)`/gm)].map((m) => m[1]).filter((r) => r !== 'hero');
    assert.deepEqual(roles, ROLE_TYPES);
  });

  test('the example style uses only fixed color roles', () => {
    const theme = read('plugins/sb-design/engines/tailwind4/example/theme.css');
    const roles = new Set([...theme.matchAll(/--sb-([a-z0-9-]+)\s*:/g)].map((m) => m[1]).filter((r) => !r.startsWith('shadow-')));
    assert.deepEqual([...roles].filter((r) => !METHOD_COLORS.has(r)), []);
  });

  test('the example typography defines every type role', () => {
    const typo = read('plugins/sb-design/engines/tailwind4/example/typography.css');
    const roles = new Set([...typo.matchAll(/--text-([a-z0-9-]+?)\s*:/g)].map((m) => m[1]));
    assert.deepEqual(ROLE_TYPES.filter((r) => !roles.has(r)), []);
  });
});

describe('README anchors', () => {
  // GitHub's heading slugs: lowercase, punctuation dropped (hyphens kept), spaces become hyphens
  const slug = (h) => h.trim().toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
  const anchorsOf = (md) => {
    const seen = {};
    return new Set(
      [...md.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6} (.+)$/gm)].map((m) => {
        const s = slug(m[1]);
        seen[s] = (seen[s] ?? -1) + 1;
        return seen[s] ? `${s}-${seen[s]}` : s;
      }),
    );
  };

  for (const doc of ['README.md', 'CONTRIBUTING.md']) {
    test(`${doc}: every #anchor link points to a heading`, () => {
      const md = read(doc);
      const own = anchorsOf(md);
      const problems = [];
      for (const [, file, anchor] of md.matchAll(/\]\(([^)#\s]*)#([^)\s]+)\)/g)) {
        if (/^https?:/.test(file)) continue;
        const target = file ? anchorsOf(read(file)) : own;
        if (!target.has(anchor)) problems.push(`${file || doc}#${anchor}`);
      }
      assert.deepEqual(problems, []);
    });
  }
});
