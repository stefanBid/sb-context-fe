// Files the skills apply to OTHER projects as they are: gh-admin's labels and ruleset, gh-checks'
// workflow. A mistake here does not fail in this repo, it fails in the user's repo.
// The workflows themselves are linted with actionlint in CI (Tests workflow, plugin validate job).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from '../helpers/fixture.mjs';

// LF even where git checks files out with CRLF (Windows)
const read = (p) => readFileSync(join(REPO, p), 'utf8').replaceAll('\r\n', '\n');
const LINT = read('plugins/sb-github/skills/checks/workflows/pr-title-lint.yml');
const LINT_TYPES = LINT.match(/types: \|\n((?:\s+[a-z]+\n)+)/)[1].trim().split(/\s+/);

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

describe('gh-checks title lint template', () => {
  test('job name, triggers and permissions are the ones gh-checks relies on', () => {
    assert.match(LINT, /^jobs:\n {2}lint-pr-title:\n/m, 'the job name is the status check the ruleset requires');
    for (const t of ['opened', 'reopened', 'edited', 'synchronize']) assert.match(LINT, new RegExp(`^\\s+- ${t}$`, 'm'), `trigger ${t}`);
    assert.match(LINT, /^permissions:\n {2}pull-requests: read$/m);
    assert.match(LINT, /uses: amannn\/action-semantic-pull-request@v\d+/);
    assert.match(read('plugins/sb-github/skills/checks/SKILL.md'), /job name `lint-pr-title`/);
  });

  test('it accepts exactly the types release-please understands', () => {
    assert.deepEqual([...LINT_TYPES].sort(), ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test']);
  });
});
