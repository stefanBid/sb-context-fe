# Init audit: commands

All read only. Run in parallel where independent. `{owner}/{repo}` from `gh repo view --json nameWithOwner -q .nameWithOwner`.

## Access

```bash
gh auth status                                   # host, account, scopes
git remote -v                                    # origin: is it a GitHub repo?
gh repo view --json nameWithOwner,viewerPermission,visibility,isTemplate,isFork,defaultBranchRef
```

- `viewerPermission`: `ADMIN` can change settings, rulesets, security; `MAINTAIN`/`WRITE` can manage labels and PRs; `READ` is audit only.
- Fine-grained or classic tokens: rulesets and security settings need repo admin. If a call returns 403/404 on an existing repo, it is almost always permissions, not a missing resource: say so.
- Not logged in: suggest `! gh auth login`. Missing scope: `! gh auth refresh -s repo`. Never request a pasted token.

## Settings

```bash
gh api repos/{owner}/{repo} --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge,allow_auto_merge,squash_merge_commit_title,squash_merge_commit_message,has_issues,has_projects,has_wiki,security_and_analysis}'
```

## Branches and rules

```bash
gh api repos/{owner}/{repo}/rulesets --jq '.[] | {id,name,enforcement,target}'
gh api repos/{owner}/{repo}/rulesets/<id>
gh api repos/{owner}/{repo}/branches/<default>/protection      # legacy protection; 404 = none
gh api repos/{owner}/{repo}/branches --jq '.[].name'           # stale branches
```

## Labels, workflows, release

```bash
gh label list --limit 100
gh workflow list
ls .github/workflows .github 2>/dev/null                       # workflows, templates, CODEOWNERS, dependabot.yml
ls release-please-config.json .release-please-manifest.json 2>/dev/null
gh pr list --base main --head 'release-please--*'
gh release list --limit 5
```

Read each workflow's job names (they are the status-check contexts the ruleset can require).

## Security

```bash
gh api repos/{owner}/{repo}/vulnerability-alerts -i            # 204 = Dependabot alerts on, 404 = off
gh api repos/{owner}/{repo}/automated-security-fixes           # security updates
gh api repos/{owner}/{repo}/secret-scanning/alerts --jq 'length' 2>/dev/null
gh api repos/{owner}/{repo}/actions/permissions                # which actions are allowed
gh api repos/{owner}/{repo}/actions/secrets --jq '.secrets[].name'   # names only
```

## Report

```markdown
| Area | Now | Target | Action |
| Access | account, scopes, permission | admin | … |
| Settings | … | squash only, delete branch on merge | PATCH |
| Rulesets | … | main-protected | POST/PUT |
| Required checks | … | CI job names, lint-pr-title | adapt JSON |
| Labels | N present, M missing | labels.json | sync |
| Security | alerts/secret scanning/push protection | all on | PATCH |
| Release | release-please files, PR title lint | present | /sb-github:checks |
```

State clearly what the current account cannot read or change, and what needs the user (login, plan upgrade for private repos).
