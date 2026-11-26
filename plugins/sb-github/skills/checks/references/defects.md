# Typical defects → fix

Compare the project's workflows with this table during the analysis; every row found goes in the report.

| Found | Problem | Fix |
|---|---|---|
| `push` on `develop`, `release/**`, `release-please--branches--*` besides `pull_request` | The same PR runs the CI twice | Only `pull_request` on `main` + `push` on `main` (S2) |
| `if:` repeated on every step, a step that only `echo`s to "skip" | Noise, easy to forget one `if`, the job "passes" having done nothing | One `if` on the `changes` job (S3) |
| release-please PRs detected from the branch name | Fragile, duplicated in every workflow | `github.actor != 'github-actions[bot]'` (S3) |
| `paths-ignore` / `paths` in `on:` with required checks | Docs-only PRs blocked forever | `changes` job with `dorny/paths-filter` (S4) |
| No path filter | Full build for a README | `changes` job (S4) |
| `concurrency: group: ci-${{ github.ref }}` | Works, but the group does not tell workflows apart | Group with `github.workflow` and the PR number (S2) |
| No `ready_for_review` | A draft made ready is never checked | Add it to `types` (S2) |
| No `permissions` | Token with the repo's default permissions | Minimal permissions (S6) |
| `amannn/action-semantic-pull-request` or similar | Third-party code with the token, runs on bot PRs too | Bash regex (S8, `workflows/commitlint.yml`) |
| Title interpolated in `run:` | Script injection | Pass it through `env` |
| `node -v`, `java -version` as steps | Noise | Remove them (S7) |
| `npm install` / `--if-present` | Non-reproducible install / renamed scripts passing silently | `npm ci`, scripts by their exact name |
| `upload-artifact` of a build nobody downloads | Wasted minutes and storage | **Ask**, then remove it if unused |
| `docker build` never run in CI while the deploy uses the `Dockerfile` | Broken image found only at deploy | `docker-image` job (`stacks.md`) |
| `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` or similar | Temporary workaround for old actions | Keep it only if an action still needs it; otherwise remove it and say so |
| Ruleset without required status checks | Merge possible with a red CI | S9, `ruleset.md` |
| File/job names different from repo to repo (`ci.yml`, `pr-title-lint.yml`, `lint-pr-title`) | Different rulesets and habits per repo | Standard names (S1); renaming a job = updating the ruleset in the same work |
