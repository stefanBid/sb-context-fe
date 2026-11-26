# Template repo: the "CI and repository rules" section

A project created from a GitHub template gets the files (the workflows) but **not** the repository configuration: rulesets, security features and merge settings stay behind. The README of a template says what comes with it, what has to be set up again, and how to change each piece.

## How to fill it

- Read the state from the remote, never from memory: ruleset (`gh api repos/{owner}/{repo}/rulesets/<id>`), merge settings (`gh api repos/{owner}/{repo} --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge,squash_merge_commit_title,squash_merge_commit_message}'`), security (`references/security.md` of `/sb-github:admin`).
- Every rule of the GitHub ruleset UI is listed, **on or off**: a rule left out reads as "forgotten", not as "off on purpose".
- Write it in the README's language. Replace the whole section at every run (between the two markers), so it always matches the remote.
- Commands use `{owner}/{repo}`, so they work on the new repo as written once filled in. The ruleset JSON is the template's own, exported with the `id`, `source`, `_links`, timestamps and `node_id` removed, and kept at `.github/rulesets/main-protected.json` so the new project can apply it in one command.

## Skeleton

````markdown
<!-- ci-and-rules:start -->
## CI and repository rules

### Workflows (copied with the template)

| File | Runs on | What it does | Required check |
|---|---|---|---|
| `build-check.yml` | PR into `main`, push to `main` | lint, type check, test, build; skips drafts, bot PRs and docs-only changes | `build` |
| `commitlint.yml` | PR into `main` (also when the title is edited) | the PR title follows Conventional Commits (it becomes the squash commit read by release-please) | `commitlint` |
| `release-please.yml` | push to `main` | version, changelog, tag, GitHub Release | — |

Change the commands in `build-check.yml` (the `Lint`, `Type check`, `Test`, `Build` steps). The job names are the required checks: renaming one means updating the ruleset too.

### Ruleset `main-protected` (NOT copied: apply it on the new repo)

| Rule | State | Notes |
|---|---|---|
| Restrict deletions | on | `main` cannot be deleted |
| Block force pushes | on | |
| Require a pull request before merging | on | 0 approvals (solo maintainer), squash only |
| Require status checks to pass | on | `build`, `commitlint`; "up to date with main" off (release-please moves `main` at every merge) |
| Restrict creations / updates | off | |
| Require linear history | off | squash already keeps it linear |
| Require signed commits | off | |
| Require deployments to succeed | off | |
| Require code scanning results | off | |
| Bypass list | empty | nobody, admins included |

Apply it (after the first CI run on `main`, otherwise the required checks never report):

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/main-protected.json
```

Customize: GitHub → Settings → Rules → Rulesets → `main-protected`, or edit the JSON and `PUT repos/{owner}/{repo}/rulesets/<id>`. On a private repo rulesets need a paid plan.

### Merge settings (NOT copied)

| Setting | State |
|---|---|
| Squash merge | on, title = PR title, message = PR body |
| Merge commit / rebase merge | off |
| Delete branch on merge | on |

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

### Security (NOT copied)

| Feature | State | Why |
|---|---|---|
| Dependabot alerts | on | notifies vulnerable dependencies |
| Dependabot security updates | off | no automatic PRs: updates are done by hand |
| Dependabot version updates (`dependabot.yml`) | absent | it would only open PRs |
| Secret scanning + push protection | on | public repos; private ones need GitHub Advanced Security |

```bash
gh api -X PUT repos/{owner}/{repo}/vulnerability-alerts
gh api -X DELETE repos/{owner}/{repo}/automated-security-fixes
```

How often you are emailed about alerts is a personal setting: GitHub → Settings → Notifications → Dependabot alerts.
<!-- ci-and-rules:end -->
````

The tables above are an example of the target state: write the values actually read. A rule that differs from the standard of `/sb-github:admin` is written as it is and flagged in the report, not "fixed" in the README.
