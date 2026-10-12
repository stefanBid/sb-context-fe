---
name: gh-repo-admin
description: Manage a GitHub repo with the GitHub CLI — branch rulesets (main protected, versionamento free), repo settings, opening PRs into main, release-please checks. Use when asked to open a PR, change branch protection/rulesets, or inspect repo settings.
---

# gh-repo-admin

Operate the GitHub side of the 2-branch model with `gh`.

## Branch model

| Branch | Role | Rules |
|---|---|---|
| `main` | The template users start from; tags + releases (release-please) live here | PR only, no direct push, no force push, no deletion |
| `versionamento` | Free branch for dependency/version upgrades and migrations | No rules |

Feature/fix branches also reach `main` through a PR. Merge strategy: **squash**, conventional-commit PR title (release-please reads it).

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

Create from a JSON file, never inline. Template lives in this skill's `rulesets/main.json`. Apply:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input <plugin-path>/skills/gh-repo-admin/rulesets/main.json
# update: PUT repos/{owner}/{repo}/rulesets/<id> --input <file>
```

`main.json`: `pull_request` rule (0 approvals for a solo maintainer, PR still mandatory, squash only), `non_fast_forward`, `deletion`, required status check `build` (CI). No bypass actors by default. `versionamento` gets no ruleset.

### Open PRs

```bash
# any branch (incl. versionamento) → main
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
