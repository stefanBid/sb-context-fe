---
name: dependency-check
description: Check for outdated/vulnerable npm dependencies and safely auto-update minor/patch bumps. Trigger phrases (English or Italian) — "check dependencies", "update dependencies", "verifichiamo le dipendenze".
---

# Dependency check & update

Delicate process — never auto-update a package across a major version without verifying it won't break the project. Follow the install policy in the project's `CLAUDE.md` (e.g. `npm ci` only on `main`); if none, work on a dedicated branch (`chore/deps-<date>`) and never on `main`.

1. Read `package.json` for `dependencies`/`devDependencies`, `overrides`, and `engines.node`.
2. Run `npm outdated` (or the package manager's equivalent). Note Current / Wanted / Latest.
3. Classify:
   - **Safe to auto-update**: Latest has the same major as the declared constraint. Check the changelog/release notes first for new required config, renamed/removed APIs used here, or peer-dependency changes (especially `nuxt`, `vue`, `vite`, `tailwindcss`) — if a concern surfaces, move it to "needs attention".
   - **Needs attention**: different major, or the changelog check revealed a concern.
4. For safe updates edit `package.json` constraints directly (`npm update` alone doesn't touch them), then install via the project's install script (e.g. `npm run si`) or `npm install`.
5. Vulnerabilities: `npm audit` (classify severity/package/via/fix availability), `npm audit fix` for what's in semver range. **Never `npm audit fix --force`.** If a fix needs it, stop and report (package, advisory, severity). Re-run `npm audit` to confirm.
6. Report: auto-updated packages (old → new), packages needing attention (reason + changelog link), vulnerabilities resolved vs remaining (and whether the fix depends on this project or upstream).
