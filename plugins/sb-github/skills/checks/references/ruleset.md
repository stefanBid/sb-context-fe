# Required checks and releases

## Required checks on the ruleset of `main`

Only after the alignment PR ran every check at least once and they are green (a `pull_request` workflow runs from the PR head, so the checks report on that same PR):

```bash
gh api repos/{owner}/{repo}/rulesets/<id> > "$TMP/ruleset.json"     # $TMP = the session scratchpad, never the repo
jq '{name, target, enforcement, conditions, bypass_actors,
     rules: ([.rules[] | select(.type != "required_status_checks")] + [{
       "type": "required_status_checks",
       "parameters": {
         "strict_required_status_checks_policy": false,
         "do_not_enforce_on_create": false,
         "required_status_checks": [
           {"context": "build",        "integration_id": 15368},
           {"context": "docker-image", "integration_id": 15368},
           {"context": "commitlint",   "integration_id": 15368}
         ]}}])}' "$TMP/ruleset.json" > "$TMP/ruleset-new.json"
diff <(jq -S . "$TMP/ruleset.json") <(jq -S . "$TMP/ruleset-new.json")   # show it, ask
gh api -X PUT repos/{owner}/{repo}/rulesets/<id> --input "$TMP/ruleset-new.json"
```

- Remove `docker-image` from the list when the job does not exist. The other rules stay as they are (the `jq` replaces only the checks).
- Old contexts that no job reports any more (`lint-pr-title`, `ci`) go away with this PUT: say so in the diff. A context of another workflow that stays (a deploy check the user wants required) → **ask** whether to keep it, and add it to the list.
- `integration_id: 15368` is GitHub Actions: the check is accepted only when Actions reports it.
- `strict_required_status_checks_policy: false`: release-please updates `main` at every merge, and a strict policy would force every PR to be brought up to date.
- No ruleset but the legacy branch protection (`gh api repos/{owner}/{repo}/branches/main/protection`) → **ask** whether to create the `main-protected` ruleset (`/sb-github:admin`) or update the protection.
- 403/404 → the account is not admin, or the repo is private on a free plan: stop and tell the user.
- Verify: `gh pr view <n> --json mergeStateStatus,mergeable` → `CLEAN` / `MERGEABLE`.

## Making a major on purpose

`bump-minor-pre-major: true` (S8) keeps a `0.x` project in `0.x` on a `feat!:`. The `1.0.0` of the go-live (or a `2.0.0`) is made on purpose, in one of two ways:

- **`Release-As: 1.0.0` footer** in the commit that lands on `main`. With squash merge the commit body depends on the repo settings (`gh api repos/{owner}/{repo} --jq .squash_merge_commit_message`): with `COMMIT_MESSAGES` put it in the message of a commit of the PR, with `PR_BODY` in the PR body; either way check it in the merge dialog before confirming. release-please opens the `1.0.0` release PR.
- **`"release-as": "1.0.0"`** on the package in `release-please-config.json`, through a PR; remove it **right after** the release, or every following release stays `1.0.0`.
