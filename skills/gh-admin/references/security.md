# Branch and repo security

Always read the state first (`init-audit.md`), show the command, ask, apply, re-read.

## Branch protection

The `main-protected` ruleset (`rulesets/main.json`): PR required, squash only, no force push, no deletion, required status checks, no bypass actors. Notes on job names, ordering and plan limits are in `SKILL.md` (Rulesets).

Legacy branch protection (`branches/<b>/protection`) and rulesets can coexist and stack. If legacy protection exists, report it and ask which to keep; do not delete it silently.

## Repo security features

```bash
# Dependabot alerts and security updates
gh api -X PUT repos/{owner}/{repo}/vulnerability-alerts
gh api -X PUT repos/{owner}/{repo}/automated-security-fixes

# Secret scanning + push protection (public repos, or private with GitHub Advanced Security)
gh api -X PATCH repos/{owner}/{repo} --input - <<'JSON'
{ "security_and_analysis": {
  "secret_scanning": { "status": "enabled" },
  "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
```

On private repos the secret scanning part needs a paid plan: check `visibility` and report instead of failing.

## Actions hygiene

- Workflows declare least-privilege `permissions:` (the PR title lint uses `pull-requests: read`).
- Prefer `pull_request` over `pull_request_target`; the latter runs with write access on fork code.
- Third-party actions: pin to a major tag at least; pin to a commit SHA for anything sensitive. Report unpinned ones, do not rewrite them unasked.
- `gh api repos/{owner}/{repo}/actions/permissions/workflow` shows the default `GITHUB_TOKEN` permission; recommend `read`.
- Secrets: list names only, flag any that look unused or committed in `.env*` files.
