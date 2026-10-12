---
name: gh-admin
description: Manage a GitHub repo with the GitHub CLI — branch rulesets (main protected), repo settings, opening PRs into main, release-please checks. Use when asked to open a PR, change branch protection/rulesets, or inspect repo settings.
---

# gh-admin

Operate the GitHub side of the 2-branch model with `gh`.

## Branch model

| Branch | Role | Rules |
|---|---|---|
| `main` | Only long-lived branch; tags + releases (release-please) live here | PR only, no direct push, no force push, no deletion |
| `feat/*`, `fix/*`, `chore/*` | Short-lived, created per task (dependency upgrades included) | None; PR into `main`, delete after merge |

Merge strategy: **squash**, conventional-commit PR title (release-please reads it).

Agent context (this plugin) is never committed to the project repo — only project-specific context is.

## Rules of engagement

- Read-only commands (`gh repo view`, `gh api` GET, `gh pr list/view`, `gh ruleset list/view`) run freely.
- **Ask before** any write that touches the remote: creating/updating/deleting rulesets, changing repo settings, pushing branches, opening/merging PRs, creating releases. Show the exact command first.
- Never bypass a ruleset (no `--admin` merges, no temporarily disabling rules) unless the user asks explicitly.
- Repo slug: derive with `gh repo view --json nameWithOwner -q .nameWithOwner`; never hardcode.

## Recipes

### Inspect

```bash
gh repo view --json nameWithOwner,defaultBranchRef,isTemplate,deleteBranchOnMerge
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

### Rulesets

Create from a JSON file, never inline. Template lives in this skill's `rulesets/main.json`. Before applying, read the notes below. Apply:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input "${CLAUDE_SKILL_DIR}/rulesets/main.json"
# update: PUT repos/{owner}/{repo}/rulesets/<id> --input <file>
```

`main.json`: `pull_request` rule (0 approvals for a solo maintainer, PR still mandatory, squash only), `non_fast_forward`, `deletion`, required status check `build` (CI). No bypass actors by default. Short-lived branches get no ruleset.

Notes:

- **The required status check must match the CI job name.** `build` in `rulesets/main.json` is only right if the workflow job is called `build`. Read `.github/workflows/*`, adapt the `context` in the JSON before applying (or ask the user). A name that no job reports blocks every PR forever.
- **Rulesets are not copied when a repo is created from a template.** Apply them on every new project.
- **On private repositories rulesets require a paid GitHub plan.** Check `gh repo view --json visibility` first and tell the user if the repo is private.

### Open PRs

```bash
# any branch → main
gh pr create --base main --title "feat: …" --body "…"
```

PR bodies end with: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

### Release check

```bash
gh pr list --base main --head 'release-please--*'
gh release list --limit 5
```

## Verification

After any ruleset/settings write, re-read it with the Inspect recipe and report the diff against the intended state.
