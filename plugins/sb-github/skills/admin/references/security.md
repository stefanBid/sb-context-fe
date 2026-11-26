# Branch and repo security

Always read the state first (`init-audit.md`), show the command, ask, apply, re-read.

## Branch protection

The `main-protected` ruleset (`rulesets/main.json`): PR required, squash only, no force push, no deletion, required status checks, no bypass actors. Notes on job names, ordering and plan limits are in `SKILL.md` (Rulesets).

Legacy branch protection (`branches/<b>/protection`) and rulesets can coexist and stack. If legacy protection exists, report it and ask which to keep; do not delete it silently.

## Repo security features

```bash
# Dependabot alerts on (notifications only)
gh api -X PUT repos/{owner}/{repo}/vulnerability-alerts
# Dependabot security updates off: no automatic PRs
gh api -X DELETE repos/{owner}/{repo}/automated-security-fixes

# Secret scanning + push protection (public repos, or private with GitHub Advanced Security)
gh api -X PATCH repos/{owner}/{repo} --input - <<'JSON'
{ "security_and_analysis": {
  "secret_scanning": { "status": "enabled" },
  "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
```

On private repos the secret scanning part needs a paid plan: check `visibility` and report instead of failing.

### Dependabot: notify, never open PRs

The policy is **alerts only**. GitHub notifies the maintainer of a vulnerable dependency; the update is done by hand (`/sb-health:deps`), never by a bot.

| Feature | Target | Why |
|---|---|---|
| Dependabot alerts (`vulnerability-alerts`) | on | the notification: a vulnerable dependency shows up in the Security tab and in the maintainer's notifications |
| Dependabot security updates (`automated-security-fixes`) | **off** | it opens PRs on its own |
| Dependabot version updates (`.github/dependabot.yml`) | **absent** | it can only open PRs; `open-pull-requests-limit: 0` turns it off entirely, it does not turn it into notifications |

- Alerts have no schedule: they arrive when GitHub finds the advisory. How often the maintainer is emailed is a personal setting (GitHub → Settings → Notifications → Dependabot alerts: email digest daily or weekly), not a repo one: say so in the report, do not try to set it.
- A `.github/dependabot.yml` with `updates:` already in the repo → report it and **ask** before removing it (in its own commit, `ci: stop Dependabot version update PRs`). Open Dependabot PRs are listed, never closed silently: ask.
- Repo cache: `security.dependabotAlerts` (alerts) and `security.dependabotSecurityUpdates` (security updates) through `refresh security`.

## Actions hygiene

- Workflows declare least-privilege `permissions:` (the PR title lint uses `pull-requests: read`).
- Prefer `pull_request` over `pull_request_target`; the latter runs with write access on fork code.
- Third-party actions: pin to a major tag at least; pin to a commit SHA for anything sensitive. Report unpinned ones, do not rewrite them unasked.
- `gh api repos/{owner}/{repo}/actions/permissions/workflow` shows the default `GITHUB_TOKEN` permission; recommend `read`.
- Secrets: list names only, flag any that look unused or committed in `.env*` files.
