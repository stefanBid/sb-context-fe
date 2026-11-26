// Files the skills apply to OTHER projects as they are: gh-admin's labels and ruleset, gh-checks'
// workflows. A mistake here does not fail in this repo, it fails in the user's repo.
// The workflows themselves are linted with actionlint in CI (Tests workflow, plugin validate job).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from '../helpers/fixture.mjs';

// LF even where git checks files out with CRLF (Windows)
const read = (p) => readFileSync(join(REPO, p), 'utf8').replaceAll('\r\n', '\n');
const WF = (f) => read(`plugins/sb-github/skills/checks/workflows/${f}`);
const LINT = WF('commitlint.yml');
const LINT_TYPES = LINT.match(/pattern='\^\(([a-z|]+)\)/)[1].split('|');
const SKILL = read('plugins/sb-github/skills/checks/SKILL.md');
// the draft/bot condition of the standard (S3), on one job per workflow
const SKIP_IF = /if: >-\n\s+github\.event\.pull_request\.draft != true &&\n\s+github\.actor != 'github-actions\[bot\]' &&\n\s+github\.actor != 'dependabot\[bot\]'\n/;
const jobsOf = (text) => [...text.slice(text.indexOf('\njobs:\n')).matchAll(/^ {2}([a-z][a-z0-9-]*):\n/gm)].map((m) => m[1]);

describe('gh-admin labels', () => {
  const labels = JSON.parse(read('plugins/sb-github/skills/admin/labels/labels.json'));

  test('every label is what GitHub accepts', () => {
    assert.ok(Array.isArray(labels) && labels.length);
    for (const l of labels) {
      assert.deepEqual(Object.keys(l).sort(), ['color', 'description', 'name'], JSON.stringify(l));
      assert.ok(l.name.trim() && l.name.length <= 50, `name "${l.name}"`);
      assert.match(l.color, /^[0-9a-f]{6}$/, `${l.name}: color is 6 lowercase hex digits, no #`);
      assert.ok(l.description.length <= 100, `${l.name}: description over GitHub's 100 characters`);
    }
    const names = labels.map((l) => l.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, 'names are compared case-insensitively by the sync');
  });

  test('release-please and breaking labels exist', () => {
    for (const n of ['autorelease: pending', 'autorelease: tagged', 'breaking']) assert.ok(labels.some((l) => l.name === n), n);
  });

  test('every type the title lint accepts has its label', () => {
    const names = new Set(labels.map((l) => l.name));
    assert.deepEqual(LINT_TYPES.filter((t) => !names.has(t)), []);
  });
});

describe('gh-admin ruleset template', () => {
  const r = JSON.parse(read('plugins/sb-github/skills/admin/rulesets/main.json'));
  // keys of the GitHub REST rulesets API that this template may use, per rule type
  const PARAMS = {
    deletion: [],
    non_fast_forward: [],
    required_linear_history: [],
    required_signatures: [],
    pull_request: ['allowed_merge_methods', 'automatic_copilot_code_review_enabled', 'dismiss_stale_reviews_on_push', 'require_code_owner_review', 'require_last_push_approval', 'required_approving_review_count', 'required_review_thread_resolution', 'required_reviewers'],
    required_status_checks: ['do_not_enforce_on_create', 'required_status_checks', 'strict_required_status_checks_policy'],
  };

  test('top level', () => {
    assert.equal(r.name, 'main-protected');
    assert.equal(r.target, 'branch');
    assert.ok(['active', 'evaluate', 'disabled'].includes(r.enforcement));
    assert.deepEqual(r.conditions.ref_name, { include: ['refs/heads/main'], exclude: [] });
    assert.deepEqual(r.bypass_actors, []);
  });

  test('every rule and parameter is one the API knows', () => {
    for (const rule of r.rules) {
      assert.ok(rule.type in PARAMS, `unknown rule ${rule.type}`);
      for (const k of Object.keys(rule.parameters ?? {})) assert.ok(PARAMS[rule.type].includes(k), `${rule.type}.${k}`);
    }
  });

  test('it enforces what gh-admin promises: PR only, squash only, no force push, no deletion', () => {
    const by = Object.fromEntries(r.rules.map((x) => [x.type, x.parameters ?? {}]));
    assert.ok('deletion' in by && 'non_fast_forward' in by);
    assert.deepEqual(by.pull_request.allowed_merge_methods, ['squash']);
    assert.equal(by.pull_request.required_approving_review_count, 0);
    const contexts = by.required_status_checks.required_status_checks.map((c) => c.context);
    assert.ok(contexts.every((c) => typeof c === 'string' && c.trim()));
    // SKILL.md tells the model to adapt `build` to the real CI job before applying: it must be what the template has
    assert.match(read('plugins/sb-github/skills/admin/SKILL.md'), new RegExp(`required status check \`${contexts[0]}\``));
  });
});

describe('gh-checks standard workflows', () => {
  test('exactly the three workflows of the standard, with the job names the ruleset requires', () => {
    assert.deepEqual(readdirSync(join(REPO, 'plugins/sb-github/skills/checks/workflows')).sort(), ['build-check.yml', 'commitlint.yml', 'release-please.yml']);
    assert.deepEqual(jobsOf(WF('build-check.yml')), ['changes', 'build']);
    assert.deepEqual(jobsOf(LINT), ['commitlint']);
    assert.deepEqual(jobsOf(WF('release-please.yml')), ['release-please']);
    for (const j of ['build-check.yml', 'commitlint.yml', 'release-please.yml', '`changes`', '`build`', '`commitlint`', '`docker-image`']) assert.ok(SKILL.includes(j), j);
  });

  test('build-check: always triggered on main only, filters paths in a job, skips drafts and bots once', () => {
    const b = WF('build-check.yml');
    const on = b.slice(b.indexOf('\non:\n'), b.indexOf('\npermissions:'));
    assert.doesNotMatch(on, /paths(-ignore)?:/, 'paths filters in on: leave required checks waiting forever');
    assert.equal([...on.matchAll(/branches: \[ "main" \]/g)].length, 2, 'pull_request and push on main, nothing else');
    assert.match(on, /types: \[ opened, synchronize, reopened, ready_for_review \]/);
    assert.match(b, /^permissions:\n {2}contents: read\n {2}pull-requests: read\n/m);
    assert.match(b, /group: build-check-\$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}\n\s+cancel-in-progress: true/);
    assert.equal(b.split(SKIP_IF).length, 2, 'one draft/bot condition, on the changes job');
    assert.match(b, /uses: dorny\/paths-filter@v\d+\n\s+with:\n\s+predicate-quantifier: 'every'/);
    assert.match(b, /^ {2}build:\n {4}needs: changes\n {4}if: needs\.changes\.outputs\.code == 'true'\n/m);
    assert.doesNotMatch(b, /--if-present|npm install\b|node -v/);
  });

  test('commitlint: bash regex on the title read from env, no token, no third-party action', () => {
    assert.match(LINT, /types: \[ opened, synchronize, reopened, ready_for_review, edited \]/);
    assert.match(LINT, /^permissions: \{\}$/m);
    assert.match(LINT, SKIP_IF);
    assert.doesNotMatch(LINT, /uses:/);
    assert.match(LINT, /env:\n\s+PR_TITLE: \$\{\{ github\.event\.pull_request\.title \}\}/);
    const run = LINT.slice(LINT.indexOf('run: |'));
    assert.doesNotMatch(run, /\$\{\{/, 'an expression inside run: is a script injection');
  });

  test('the title regex accepts conventional titles and refuses the rest', () => {
    const re = new RegExp(LINT.match(/pattern='([^']+)'/)[1]);
    for (const t of ['feat: add x', 'fix(sb-github): y', 'feat!: drop z', 'chore(main): release main', 'ci(build.check): a_b']) assert.match(t, re, t);
    for (const t of ['update stuff', 'Feat: x', 'feat(Auth): x', 'feat:x', 'feat: ', 'wip: x', `feat: ${'a'.repeat(101)}`]) assert.doesNotMatch(t, re, t);
  });

  test('it accepts exactly the types release-please understands', () => {
    assert.deepEqual([...LINT_TYPES].sort(), ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test']);
    assert.ok(LINT.includes(`type: ${LINT_TYPES.join('|')}`), 'the error message lists the same types');
  });

  test('release-please: write permissions, manifest mode, not skipped for bots', () => {
    const r = WF('release-please.yml');
    assert.match(r, /^permissions:\n {2}contents: write\n {2}pull-requests: write\n/m);
    assert.match(r, /uses: googleapis\/release-please-action@v\d+\n\s+with:\n\s+config-file: release-please-config\.json\n\s+manifest-file: \.release-please-manifest\.json/);
    assert.doesNotMatch(r, /\n {4}if:/);
  });

  test('the ruleset recipe requires the standard checks on GitHub Actions, strict off', () => {
    const rs = read('plugins/sb-github/skills/checks/references/ruleset.md');
    for (const c of ['build', 'docker-image', 'commitlint']) assert.match(rs, new RegExp(`\\{"context": "${c}",\\s+"integration_id": 15368\\}`), c);
    assert.match(rs, /"strict_required_status_checks_policy": false/);
  });
});
