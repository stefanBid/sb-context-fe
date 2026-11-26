---
name: checks
description: Align a project's GitHub Actions to the standard CI structure — three workflows (build-check.yml, commitlint.yml, release-please.yml) that run only when needed, never twice, never block docs-only PRs, and become required checks (build, commitlint) on the main ruleset. Keeps the project's own lint, test and build commands; any stack (Node, Maven, Gradle). Use when asked to add or fix the CI, the PR title lint or the required status checks, or to align CI checks with release-please.
---

# GitHub checks

Brings the project's CI to a fixed structure, the same in every repo: **three workflows**, each with one job, that run only when needed, never twice for one event, never block a docs-only PR, and become **required checks** on the ruleset of `main`. It does not change *what* the project checks (its lint, test and build commands stay its own): it changes *how* the CI is organized. Works with `/sb-github:admin` (rulesets, repo settings).

Why the title lint matters: with squash merge the PR title becomes the commit on `main`, and release-please reads it to decide the version bump and the tag.

## Rules of engagement

- Run the steps in order. The standard below is **decided**: apply it, do not re-discuss it. Ask the user only where a step says **ask**.
- The project's `CLAUDE.md` or git-flow rules (branch names, PR titles and bodies) win over this skill for branch and PR.
- **No check is lost.** Every command the CI runs today (lint, type check, test, build, analysis) is still there after, unless the user says to drop it. A command clearly broken or duplicated is reported, not removed.
- **Not touched**: deploys, package publishing, secrets, and workflows that are not CI/lint/release (a Netlify deploy, a cron script). List them in the report and leave them as they are.
- **Stop and ask** when:
  1. the project versions with something other than release-please (semantic-release, changesets, manual tags): do not replace it;
  2. the CI does things the standard does not cover (version matrices, preview deploys, DB services, long e2e tests): ask which job they go in, never delete them;
  3. the main branch is not `main`, or other branches are protected (`develop`, `release/**`);
  4. the account is not admin on the repo (the ruleset step fails with 403/404).
- Reading is free; **ask before** creating the branch, opening the PR and changing the ruleset, showing the exact file or command first. The workflows go in through a branch and a PR into `main`, never a direct push. **The merge is the user's.**
- Memory, shared with `/sb-github:admin`: `.sb-context/github.json`, only through the script (`GS="${CLAUDE_SKILL_DIR}/../../scripts/github-settings.mjs"`). Read the known facts first (`node "$GS" get rulesets`, `get ci`) and `refresh` every key a step changes on the remote. Signature of commits and PRs: as in `/sb-github:admin` (`node "$GS" status`); it overrides any default attribution text.

## The standard

**S1 — Three workflows, one task each.** File and job names are identical in every repo: the jobs are the names of the required checks, renaming one breaks the ruleset.

| File (template) | Trigger | Task | Jobs (= check names) |
|---|---|---|---|
| `build-check.yml` | PR into `main`, push to `main` | lint, type check, test, build (and the Docker image when a production `Dockerfile` exists) | `changes`, `build`, (`docker-image`) |
| `commitlint.yml` | PR into `main` (also `edited`) | the PR title follows Conventional Commits | `commitlint` |
| `release-please.yml` | push to `main` | version, changelog, tag, GitHub Release | `release-please` |

Templates in `${CLAUDE_SKILL_DIR}/workflows/`. Replace only what the project needs; keep the comments.

**S2 — One run per event.** `build-check.yml`: `pull_request` on `main` with `types: [ opened, synchronize, reopened, ready_for_review ]` + `push` on `main`, no push on any other branch (a PR is already covered by `pull_request`). `ready_for_review` always. `concurrency` per workflow and PR, `cancel-in-progress: true`.

**S3 — Drafts and bots skipped once, at job level.** One `if` on the first job (`changes`; the others inherit it through `needs`), never an `if` per step or an `echo` step that "skips". release-please PRs (`github-actions[bot]`) do not run the CI. A skipped job counts as passed for required checks.

**S4 — Path filter inside a job, never `paths-ignore` on the workflow.** A required check must always report: with `paths-ignore` in `on:` a docs-only PR waits forever on "Expected". The `changes` job (`dorny/paths-filter`, `predicate-quantifier: 'every'`) decides. Extra exclusions: `references/stacks.md` § Paths filter.

**S5 — Parallel jobs.** `build` and `docker-image` depend only on `changes`, not on each other.

**S6 — Minimal permissions**, declared at workflow level: `build-check.yml` `contents: read` + `pull-requests: read` (paths-filter on PRs); `commitlint.yml` `permissions: {}`; `release-please.yml` `contents: write` + `pull-requests: write`.

**S7 — Toolchain cache, no useless step.** Cache from the toolchain setup (`setup-node` `cache:`, `setup-java` `cache:`), Docker layers with `type=gha`. Version from a project file (`.nvmrc`, `package.json`; Java from the build file, written in the comment). No steps that only print versions, no artifact uploads nobody downloads (**ask** if one exists). One command per step, named after what it checks (`Lint`, `Type check`, `Test`, `Build`). Stack blocks: `references/stacks.md`.

**S7b — Every action at its latest major.** The templates' versions are a floor, not the target. Before writing, read each action's latest release (`gh api repos/<owner>/<action>/releases/latest --jq .tag_name`) and use its major (`@v7`), after reading the release notes of every major in between for breaking changes that touch the workflow. The one reason to stay on an older major: the new one does not run on the project's Node (the action's `runs.using`, e.g. `node24`, must be supported by the runners in use) or, for `setup-node`, no longer installs a Node version the project tests on. Then keep the newest major that does, and say why in the report and in a comment above the step. Same for tools pinned in a workflow (`actionlint`, a CLI version): the latest release. A workflow with write permissions does not cache dependencies (`package-manager-cache: false` on `setup-node`), against cache poisoning.

**S8 — Title lint in bash, no external action.** A regex, the title passed through `env` (never `${{ … }}` inside `run:`: script injection). Replaces `amannn/action-semantic-pull-request` and similar. Optional lowercase scope, `!` allowed. The types are release-please's (`feat fix docs style refactor perf test build ci chore revert`); if `release-please-config.json` has `changelog-sections` with other types, add them to the regex and to the error message. **A `0.x` project with `1.0.0` reserved for the go-live**: the protection is in the release-please config, not in the lint. Check the package has `"bump-minor-pre-major": true` (a `feat!:` in `0.x` then bumps the minor, not to `1.0.0`); if missing, **ask** whether to add it. A major on purpose: `references/ruleset.md` § Making a major on purpose.

**S9 — Required checks on the ruleset of `main`**: `build`, `docker-image` (if any) and `commitlint`, bound to GitHub Actions (`integration_id: 15368`), `strict_required_status_checks_policy: false` (release-please moves `main` at every merge). Added **after** the checks ran green once on the alignment PR.

**S10 — Comments say why.** Each workflow has, at the top or above each job, a short comment on why it is built that way (no `paths-ignore`, bots skipped, `docker-image` not waiting for `build`). The templates have them.

## Steps

### 1. Analysis and report (before touching any file)

1. Read **every** file in `.github/workflows/`, `release-please-config.json`, `.release-please-manifest.json`, and the build files (`package.json` + lockfile, `.nvmrc` / `.node-version` / `.tool-versions`, `pom.xml`, `build.gradle*`, `Dockerfile`). On a Nuxt or Vue project `node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" detect` gives framework, kind and type-check tool.
2. Find the stack and the real commands: the `package.json` scripts (`lint`, `typecheck`/`type-check`, `test`, `build`…), the package manager from the lockfile; for Java the version and whether integration tests use Docker (Testcontainers).
3. Read the ruleset of `main` (`gh api repos/{owner}/{repo}/rulesets --jq '.[] | {id,name,target,enforcement}'`, then `rulesets/<id>`; no ruleset → `branches/main/protection`) and the merge settings (`gh api repos/{owner}/{repo} --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,squash_merge_commit_title}'`). Squash not the only method, or the squash title not `PR_TITLE` → the title lint does not protect the release: say so and point to `/sb-github:admin` (repo settings).
4. Compare with `references/defects.md` and report: stack and commands found, defects present, files that change / are renamed / stay, workflows not touched, the **ask** questions. **Wait for the confirmation.**

### 2. Branch

From the updated `main`, with the project's naming (default `chore/ci-alignment`), without tracking `origin/main`: `git fetch origin && git checkout -b chore/ci-alignment origin/main --no-track`.

### 3. Workflows

- Write the three files from the templates, with the latest major of every action (S7b) and the project's commands (stack block: `references/stacks.md`; `docker-image` job only with a production `Dockerfile`).
- Rename existing files with `git mv` (`ci.yml` → `build-check.yml`, `pr-title-lint.yml` → `commitlint.yml`, `release.yml` → `release-please.yml`), so the history stays readable.
- Check the YAML of each file (`ruby -ryaml -e 'YAML.load_file(ARGV[0])' <file>`, or `actionlint` when installed).
- Test the title regex locally on valid and invalid titles, including real titles from `git log origin/main --format=%s`.
- release-please config and manifest are **not touched** (release type, package name, version are the project's). Only exception, with the user's yes: `bump-minor-pre-major` (S8). Config missing while the project uses release-please in simple mode → **ask** before moving to the manifest.

### 4. Documentation

README (or another doc) describing the CI → update the workflow table: file, trigger, task, which are required checks, what the `changes` job skips. `CLAUDE.md` naming the checks (e.g. "enforced by the `lint-pr-title` check") → align it with the new names.

**Template repo** (`gh repo view --json isTemplate`, or `repo.isTemplate` in the cache) → the README **always** gets the section "CI and repository rules", even if it did not describe the CI before: whoever creates a project from the template must know which workflows come with it, which rules GitHub does **not** copy (rulesets, security features, merge settings) and how to turn each one on, off or change it. Structure and content: `references/template-docs.md`. Values read from the remote (ruleset, settings, security), never assumed; the section is rewritten in full at every run, so it never drifts. The ruleset is also exported to `.github/rulesets/main-protected.json`, so a new project applies it in one command. The required checks change at step 7: write (or rewrite) the section and the JSON **after** step 7, as the last commit of the same PR.

### 5. Commit, push, PR

Commit, `git push -u origin <branch>`, PR titled `ci: align the GitHub Actions workflows with the standard structure`, body `## Summary` (what changes per workflow, what stays) + `## Test plan`. Signature per `/sb-github:admin`.

### 6. Verify on the PR

`gh pr checks <n> --watch --interval 20`, then `gh pr checks <n> --json name,state,startedAt,completedAt`. `changes`, `build`, (`docker-image`), `commitlint` must run and pass; report their durations. A check failing for a project reason (tests already red on `main`) → stop and say so: it is not a problem of the structure.

### 7. Ruleset

Only with green checks: `references/ruleset.md`. Show the diff, ask, apply, re-read; `node "$GS" refresh rulesets '<every ruleset, in the cache shape of /sb-github:admin: id, name, requiredChecks>'` (the diff must show only the checks changed), and verify the PR is `MERGEABLE`.

### 8. Hand-off

Report: PR, checks and durations, ruleset updated, what was not touched (deploys, other workflows), out-of-scope suggestions (e.g. on Render/Netlify, auto-deploy "after CI checks pass"). **The user merges.** After the merge: `node "$GS" refresh ci '{"workflows":[…],"jobs":[…]}'` with the full lists read from `main`.

## Closing checklist

- [ ] Only three CI/release workflows, with the standard names; other workflows (deploy, cron) intact and listed in the report
- [ ] `build-check.yml`: no `paths-ignore` in `on:`, `changes` job with the only draft/bot `if`, `build` (and `docker-image`) with `needs: changes`
- [ ] No `push` trigger outside `main`; `ready_for_review` in `types`; `concurrency` per PR
- [ ] `permissions` declared in every workflow
- [ ] Every action at its latest major (or the newest one the project's Node supports, with the reason in a comment)
- [ ] Every check command of before still there (or dropped by the user)
- [ ] `commitlint.yml` in bash, title through `env`
- [ ] `0.x` project: `bump-minor-pre-major` in `release-please-config.json` (or the user chose not to)
- [ ] release-please config and manifest untouched (except an approved `bump-minor-pre-major`)
- [ ] Valid YAML, green checks on the PR
- [ ] Ruleset: `build`, (`docker-image`), `commitlint` required, strict off, PR `MERGEABLE`
- [ ] README / CLAUDE.md aligned with the new names
- [ ] Template repo: README section "CI and repository rules" written from the remote state (`references/template-docs.md`)
- [ ] Merge left to the user
