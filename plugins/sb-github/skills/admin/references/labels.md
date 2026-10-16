# Labels

`labels/labels.json` is the base set: one label per conventional-commit type the title lint accepts (`feat`, `fix`, `docs`, `refactor`, `perf`, `chore`, `style`, `test`, `build`, `ci`, `revert`), `breaking`, `dependencies`, and the two labels release-please uses.

## Sync procedure

1. `gh label list --limit 100 --json name,color,description`.
2. Compare with `labels/labels.json` by name (case-insensitive). Three groups: **to create**, **to update** (color or description differ), **extra** (in the repo only: keep, report).
3. Show the diff, ask, then apply with `gh label create` / `gh label edit`.
4. Re-read and report.

GitHub creates default labels (`bug`, `enhancement`, `documentation`…) in new repos. They are "extra": leave them unless the user asks to remove or rename them (`gh label delete`, `gh label edit --name`).

## Rules

- **release-please**: `autorelease: pending` and `autorelease: tagged` must exist, or release-please fails to label its PR. Do not rename them.
- The type label of a PR matches the type of its conventional-commit title (`feat:` → `feat`, `feat!:` → `feat` + `breaking`). Apply with `gh pr edit <n> --add-label …`.
- Labels are repo-level: on a template repo they are not copied to repos created from it (same as rulesets). Sync on every new project.
