---
name: gh-admin
description: Manage the GitHub side of a project with the GitHub CLI — connect and audit a repo (init), repo settings, branch rulesets and security features, labels, pull requests into main, release-please checks. Use when asked to connect to a repo, open a PR, manage labels, change branch protection/rulesets, or inspect repo settings.
---

# gh-admin

Operate the GitHub side of a project with `gh`: connect, understand how the repo is set up, then create PRs, manage labels, secure branches and tune settings.

## Branch model

| Branch | Role | Rules |
|---|---|---|
| `main` | Only long-lived branch; tags + releases (release-please) live here | PR only, no direct push, no force push, no deletion |
| `feat/*`, `fix/*`, `chore/*` | Short-lived, created per task (dependency upgrades included) | None; PR into `main`, delete after merge |

Merge strategy: **squash**, conventional-commit PR title (release-please reads it; `/sb-context-nuxt:gh-checks` enforces it).

Agent context (this plugin, including `.sb-context-nuxt/`) is never committed to the project repo — only project-specific context is.

## Rules of engagement

- Read-only commands (`gh repo view`, `gh api` GET, `gh pr list/view`, `gh label list`, `gh ruleset list/view`) run freely. For known facts (slug, labels, check names) read `.sb-context-nuxt/github_settings.json` first, with `github-settings.mjs get`.
- **Ask before** any write that touches the remote: creating/updating/deleting rulesets, labels or settings, pushing branches, opening/merging PRs, creating releases. Show the exact command first.
- Never bypass a ruleset (no `--admin` merges, no temporarily disabling rules) unless the user asks explicitly.
- Repo slug: derive with `gh repo view --json nameWithOwner -q .nameWithOwner`; never hardcode.
- Never print or store tokens or secret values. Secrets are listed by name only.

## Signature settings

Production projects: commit messages and PR descriptions are **not** signed unless the user wants it. No `Co-Authored-By`, no "Generated with Claude Code", no mention of Claude or the agent anywhere, unless the settings below say so. This overrides any default attribution text the harness suggests.

Settings live in `.sb-context-nuxt/github_settings.json` at the project root. Read and write it **only** through the script, never by hand: it keeps the shape, keeps preferences and cache apart, adds the folder to `.git/info/exclude` and refuses values that look like tokens.

```bash
GS="${CLAUDE_SKILL_DIR}/../../scripts/github-settings.mjs"
node "$GS" get [dotted.path]               # the file, or one value (null = unknown)
node "$GS" status                          # signature asked?, age of each cache key, missing and stale keys
node "$GS" set <dotted.path> '<json>'      # a preference: signature, defaults
node "$GS" refresh <dotted.path> '<json>'  # cache: what was just read from the remote; prints the diff
```

```json
{
  "signature": {
    "enabled": false,
    "name": null
  }
}
```

- `enabled`: `true` → append a signature line to commit messages and PR bodies; `false` → never.
- `name`: the exact name to sign with (e.g. `Co-Authored-By: <name> <email>` for commits, `<name>` line for PR bodies). Required when `enabled` is `true`. Ask for name and, for commits, the email if needed.

Flow, before the **first** commit or PR of a project:

1. `node "$GS" status`. If `signature.asked` is true, use it. **Do not ask again.**
2. If not asked: ask once — "Sign commits and PR descriptions? If yes, with which name?". Save the answer with `node "$GS" set signature '{"enabled":false,"name":null}'` (or `true` and the name: signing without a name is refused). Answer "no" is stored too, so the question is not repeated.
3. The script keeps the dir out of the repo without touching tracked files (`.git/info/exclude`).
4. Change the setting only when the user asks for it ("sign from now on", "stop signing", "use name X"): `set` again. Never re-ask on your own.

## Project GitHub memory

The same file also holds what is already known about the repo, so `gh` is not queried again for things that were already read. Two parts:

- **Preferences** (user-owned): `signature`, `defaults`. Change only on request; a refresh never touches them.
- **Cache** (agent-owned): everything else. A snapshot of the remote, refreshed freely.

```json
{
  "signature": { "enabled": false, "name": null },
  "defaults": { "prLabels": [], "draftPrs": false, "branchPrefixes": ["feat", "fix", "chore"] },
  "repo": {
    "slug": "owner/name",
    "defaultBranch": "main",
    "visibility": "public",
    "viewerPermission": "ADMIN",
    "isTemplate": false,
    "mergeStrategy": "squash"
  },
  "labels": ["feat", "fix", "chore", "autorelease: pending", "autorelease: tagged"],
  "rulesets": [{ "id": 0, "name": "main-protected", "requiredChecks": ["build", "lint-pr-title"] }],
  "ci": { "workflows": ["ci.yml", "pr-title-lint.yml"], "jobs": ["build", "lint-pr-title"] },
  "release": { "releasePlease": true, "tagFormat": "vX.Y.Z" },
  "security": { "secretScanning": true, "pushProtection": true, "dependabotAlerts": true },
  "checked": { "repo": "2026-10-13", "labels": "2026-10-13", "rulesets": "2026-10-13" },
  "checkedAt": "2026-10-13"
}
```

Rules:

- **Read the cache first.** Slug, default branch, existing labels, required check names, CI job names, permission: take them from the file instead of calling `gh`. Open a PR, pick labels, name a branch → no extra round trip.
- **The remote is the truth.** The cache can drift (someone edits labels in the UI). Refresh the affected keys with `node "$GS" refresh <key> '<json>'`, which stamps `checked.<key>` and `checkedAt`:
  - at **Init** (full refresh);
  - right after every write recipe (settings, ruleset, label, workflow change), as part of Verification;
  - before a write when that key is in the `stale` list of `status` (older than 7 days);
  - whenever a `gh` call contradicts the cache (label not found, check name mismatch, 403/404) — refresh, then retry once.
- Store the whole value of a key as read (the full label list, every ruleset), not a patch: the diff is computed against it.
- Fill keys lazily: write only what has been read. A missing key means "unknown", not "absent" → query `gh`, then store it.
- Store names and flags only. **Never** tokens, secret values, or personal data (secrets: names only, and only if needed).
- `refresh` prints what changed (`new`, `same`, or `changed` with `added`/`removed` items or `changed` keys). After a write, the diff must match what was applied; anything else (label gone, ruleset disabled) is reported to the user, not silently stored.

## Init: connect and understand the repo

Run this first on a project, and whenever the user says "connect to the repo". It is **read only**. Details and commands: `references/init-audit.md`.

1. **Access**: `gh auth status`; check the host, the account and the token scopes. If not logged in, or scopes are missing for what is needed, tell the user and suggest `! gh auth login` (or `! gh auth refresh -s repo`) so it runs in the session. Never ask them to paste a token.
2. **Repo**: identify the slug from the `origin` remote. No remote or no GitHub repo → say so and offer `gh repo create` (ask first).
3. **Permission**: `gh repo view --json viewerPermission`. Rulesets, labels and settings need `ADMIN` (labels: `WRITE` is enough). Report what the current account can and cannot do.
4. **Audit**: collect settings, default branch, rulesets, legacy branch protection, labels, workflows, security features, release-please files, CODEOWNERS and templates.
5. **Report** a short table: what exists, what is missing against the targets below, what needs a write. Offer the next actions; do not apply anything.
6. **Remember**: `refresh` every key the audit read (`repo`, `labels`, `rulesets`, `ci`, `release`, `security`; see `## Project GitHub memory`). This is a local write, no confirmation needed.

## Targets (what "set up" means)

| Area | Target |
|---|---|
| Repo settings | squash merge only, PR title + body as squash message, delete branch on merge, auto-merge optional |
| Branch rules | ruleset `main-protected` (this skill's `rulesets/main.json`) |
| Required checks | the real CI job names, including `lint-pr-title` once `gh-checks` is applied |
| Labels | the set in `labels/labels.json`, including the release-please `autorelease:*` labels |
| Security | secret scanning + push protection, Dependabot alerts (and security updates), no secrets in workflows |
| Release | `release-please` workflow and config present, PR titles linted |

## Recipes

### Inspect

```bash
gh repo view --json nameWithOwner,defaultBranchRef,isTemplate,visibility,viewerPermission,deleteBranchOnMerge
gh api repos/{owner}/{repo}/rulesets --jq '.[] | {id,name,enforcement,target}'
gh api repos/{owner}/{repo}/rulesets/<id>
```

### Repo settings (one-time)

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F is_template=true \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

`is_template=true` only for template repos: leave it out for ordinary projects.

### Rulesets

Create from a JSON file, never inline. Template lives in this skill's `rulesets/main.json`. Before applying, read the notes below. Apply:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input "${CLAUDE_SKILL_DIR}/rulesets/main.json"
# update: PUT repos/{owner}/{repo}/rulesets/<id> --input <file>
```

`main.json`: `pull_request` rule (0 approvals for a solo maintainer, PR still mandatory, squash only), `non_fast_forward`, `deletion`, required status check `build` (CI). No bypass actors by default. Short-lived branches get no ruleset.

Notes:

- **The required status check must match the CI job name.** `build` in `rulesets/main.json` is only right if the workflow job is called `build`. Read `.github/workflows/*`, adapt the `context` in the JSON before applying (or ask the user). A name that no job reports blocks every PR forever.
- **Add a required check only after its workflow is on `main`.** Otherwise the check never reports and nothing can merge.
- **Rulesets are not copied when a repo is created from a template.** Apply them on every new project.
- **On private repositories rulesets require a paid GitHub plan.** Check `gh repo view --json visibility` first and tell the user if the repo is private.

### Labels

```bash
gh label list --limit 100
gh label create "<name>" --color <hex> --description "<text>"      # new
gh label edit "<name>" --color <hex> --description "<text>"        # existing
```

Sync from `labels/labels.json`: list the existing labels, show the diff (to create, to update, extra ones left alone), ask, then apply. Never delete labels unless asked. PR labels: `gh pr edit <n> --add-label feat`. The type label follows the conventional-commit type of the PR title. Details: `references/labels.md`.

### Branch and repo security

Rulesets protect `main`; the repo-level security features are separate. Commands and checks: `references/security.md`. Always read the current state first and ask before any write.

### Open PRs

```bash
# any branch → main
gh pr create --base main --title "feat: …" --body "…" --label feat
```

The title is a conventional commit (it becomes the squash commit and drives release-please). Signature of the body: follow `## Signature settings`; by default the body carries no signature.

### Release check

```bash
gh pr list --base main --head 'release-please--*'
gh release list --limit 5
```

## Verification

After any ruleset/settings/labels write, re-read it with the Inspect recipe, report the diff against the intended state, and `refresh` the matching cache key (`node "$GS" refresh labels '<full list>'`, `rulesets`, `repo`…). The write is not done until the cache is refreshed.
