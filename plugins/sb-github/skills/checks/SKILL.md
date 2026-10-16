---
name: checks
description: Create the base GitHub Actions checks of a project, starting with the PR title lint that blocks the merge when the title does not match the conventional-commit format used by release-please for versioning and tags. Use when asked to add or fix PR title checks, require a status check, or align CI checks with release-please.
---

# GitHub checks

Creates the project's base GitHub Actions checks and makes them **required** for merging into `main`. Today there is one: the PR title lint. It works together with `/sb-github:admin` (rulesets, repo settings).

Why it matters: with squash merge the PR title becomes the commit on `main`, and release-please reads that commit to decide the version bump and the tag. A title outside the format means a missing or wrong release.

## Rules of engagement

Same as `/sb-github:admin`: reading is free; **ask before** writing the workflow file into the project, opening the PR, and changing the ruleset. Show the exact file or command first. The workflow is project content: it goes in through a branch and a PR into `main`, never a direct push.

Same memory as `/sb-github:admin` too: `.sb-context/github.json`, read and written only through the script (`GS="${CLAUDE_SKILL_DIR}/../../scripts/github-settings.mjs"`). Read the known facts first (`node "$GS" get rulesets`, `get ci`), and `refresh` every key a step changes on the remote, so `/sb-github:admin` and the next run do not work on an old snapshot. Signature of commits and PRs: as in `/sb-github:admin` (`node "$GS" status`).

## PR title lint

Template: `${CLAUDE_SKILL_DIR}/workflows/pr-title-lint.yml` (runs `amannn/action-semantic-pull-request` on `opened`, `reopened`, `edited`, `synchronize` PRs into `main`; job name `lint-pr-title`).

### 1. Read the project

- `.github/workflows/*`: is there already a title lint, or another workflow with a job called `lint-pr-title`? Then update it instead of adding a second one.
- `release-please-config.json` (and `.release-please-manifest.json`): the allowed types must match what release-please understands. If the config has `changelog-sections`, use those `type` values; otherwise the template's list (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`) is the default. Note which types are hidden from the changelog: they are valid but do not trigger a release.
- `gh api repos/{owner}/{repo}/rulesets` and `gh api repos/{owner}/{repo} --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,squash_merge_commit_title}'`: is squash the only merge method, and is the squash commit title set to `PR_TITLE`? If not, the lint does not protect the release; tell the user and point to `/sb-github:admin` (repo settings).
- Scopes: `requireScope: false` by default. Ask only if the user wants scopes enforced (`scopes:` list) or a subject pattern.

### 2. Adapt and add

Copy the template to `.github/workflows/pr-title-lint.yml`, with the `types` list adapted to the project. Keep the job name `lint-pr-title`: it is the status check name the ruleset will require. On a branch `ci/pr-title-lint` (ask before creating it), commit as `ci: add PR title lint`, and open the PR with a conventional title (`ci: add PR title lint`).

Breaking changes: the action accepts `feat!:` / `fix!:` (the `!` marker), which release-please maps to a major bump. Mention it in the PR body.

Once the PR is merged, re-read the workflows on `main` and refresh the cache: `node "$GS" refresh ci '{"workflows":[…],"jobs":[…]}'` with the full lists (now including `pr-title-lint.yml` and `lint-pr-title`).

### 3. Make it required — after the workflow is on `main`

**Order matters.** A required check that no workflow reports blocks every PR forever. So:

1. merge the PR that adds the workflow (the check runs on that same PR, from its head, so you can see it pass);
2. check it has reported on `main` at least once: `gh run list --workflow "PR Title Lint" --limit 3`;
3. only then add `lint-pr-title` to the required status checks of the `main-protected` ruleset (`gh api repos/{owner}/{repo}/rulesets`, read it, add `{ "context": "lint-pr-title" }` to the `required_status_checks` rule, `PUT` it back). Show the diff, ask, apply, re-read. Keep the existing contexts (e.g. `build`). Then `node "$GS" refresh rulesets '<every ruleset, in the cache shape of /sb-github:admin: id, name, requiredChecks>'`: its diff must show `lint-pr-title` added to the required checks and nothing else.

Rulesets on private repos need a paid plan, and rulesets are not copied from template repos: see `/sb-github:admin`.

### 4. Verify

Open (or use) a test PR with a bad title (`update stuff`): the check must fail and the merge button must be blocked. Fix the title (`chore: update stuff`): the `edited` event re-runs the check and it must pass. Report both results; if the merge was not blocked, the ruleset is not enforcing the check (name mismatch, enforcement not `active`, or plan limit).

## Notes

- The workflow needs only `pull-requests: read`.
- `amannn/action-semantic-pull-request@v6` is a third-party action pinned to a major tag; pin to a commit SHA if the project's policy requires it (see `/sb-github:admin` security notes).
- Other checks (lint, build, type check) are separate workflows owned by the project; `/sb-github:admin` only needs their job names to require them.
