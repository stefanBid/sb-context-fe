---
name: deps
description: Check for outdated/vulnerable npm dependencies, update minor/patch bumps, and handle major versions as a migration manager — reads the changelog, finds what the project uses, proposes and applies the changes after approval, evaluates conflicts with libraries left behind, and notes what has to wait. Never downgrades. Trigger phrases (English or Italian) — "check dependencies", "update dependencies", "migrate to the new major", "verifichiamo le dipendenze".
---

# Dependency check & update

Delicate process. The project only moves **forward**: a package is never downgraded, a constraint is never lowered, and nothing is forced to make an update fit. If something does not fit **yet**, it waits, and the reason is written in the project's dependency notes so the next run picks it up.

Follow the install policy in the project's `CLAUDE.md` (e.g. `npm ci` only on `main`); if none, work on a dedicated branch (`chore/deps-<date>`) and never on `main`. Use the project's package manager (from the lockfile); `npm` below stands for it.

**Language**: this file is in English; talk to the user in their language.

## Rules

- **Forward only.** Never downgrade a package or lower a version constraint, for any reason: not to install, not to remove a peer warning, not to make a build pass. If an update does not fit, postpone it and note it (step 7).
- **No forcing.** Never `--force`, `--legacy-peer-deps`, `npm audit fix --force`, and never an `overrides`/`resolutions` entry that pins an old version of a package to make a new one fit. A conflict is reported, not hidden.
- **Majors are migrations, not bumps.** Never update across a major without reading what changed (step 5), checking what the project uses and getting the user's approval of the plan.
- **One major at a time**, core first (`nuxt`, `vue`, `vite`, `tailwindcss`, then the rest), verified before the next one, so a failure has one cause.
- **Notes are the memory.** Anything postponed, blocked or half-decided goes into the dependency notes. Nothing is left only in the chat.
- **Say what was not verified**: a changelog that could not be found, a repo that could not be read, an issue not checked. Do not guess.

## Dependency notes

Pending items live in `.sb-context/dependency-notes.json`, managed with `${CLAUDE_SKILL_DIR}/../../scripts/dependency-notes.mjs`:

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/dependency-notes.mjs" list                  # open notes (JSON)
node "${CLAUDE_SKILL_DIR}/../../scripts/dependency-notes.mjs" add <package> --target <version> --current <version> \
  --summary "<why it waits>" --recheck "<what to verify next time>" \
  --blocked-by <package>@<range>:<upstream|project> --link <url> [--status deferred|watching]
node "${CLAUDE_SKILL_DIR}/../../scripts/dependency-notes.mjs" touch <id> --note "<what was found>"
node "${CLAUDE_SKILL_DIR}/../../scripts/dependency-notes.mjs" resolve <id> --resolution "<how it ended>"
```

A note has: `id` (`<package>@<target>`), versions, `status` (`deferred` waits for something outside the project or a later decision; `watching` could move soon; `resolved` is history), `summary`, `blockedBy` (package, range, and who has to change: `upstream` = another library must release a fix, `project` = the project's own code, constraint or choice), `recheck` (the concrete thing to verify next time), links, first seen, last checked.

A good `recheck` is checkable in one command: "does `@nuxtjs/i18n@latest` list `vue-router@^5` in its peers?", "is issue #123 of `lib-x` closed?", "has `lib-x` released a version after 2.4.1?". Not "look again later".

## Flow

### 0. Open notes first

Run `dependency-notes.mjs list`. If there are open notes, show them (package, target, what blocks it, who owns the blocker, since when) and **re-verify each one before the new scan**, following its `recheck`:

| Finding | Action |
| --- | --- |
| The blocker is gone (the library released a compatible version, the issue is fixed, the project-side choice was made) | tell the user, offer to do the migration now (step 5), `resolve` the note when it is done |
| Still blocked | `touch <id> --note "<what was checked and found>"`; keep it in the final report |
| The situation changed (new blocker, new version of the target) | update the note with `add` (same package and target keeps the first-seen date; a new target is a new note, resolve the old one as superseded) |
| `project`-owned blocker | remind the user what is theirs to decide or change |

### 1. Read the project

`package.json`: `dependencies`, `devDependencies`, `overrides`/`resolutions`, `engines.node`, scripts; the lockfile; `nuxt.config.*`.

### 2. List what is available, then ask only if there is a choice

The user does not know in advance what is outdated, so **scan first, ask after**. Run `npm outdated` (Current / Wanted / Latest) and classify every package by kind of bump. `0.y.z` → `0.(y+1).z` counts as **major**: below `1.0.0` a minor bump may break.

Show **all** of them, **grouped**, before any question. One table per group, in this order (a group with no packages is not shown), each row with the declared constraint, the **current** installed version and the **new** one, and the kind of dependency:

```
Major (2)
| Package | Current | New | Type |
| --- | --- | --- | --- |
| @nuxtjs/i18n | 9.5.0 | 10.0.0 | dependencies |

Minor (5)
| Package | Current | New | Type |
| ...

Patch (8)
| Package | Current | New | Type |
| ...
```

Current is what is **installed** (lockfile), not the range in `package.json`. If a package has a newer major **and** a newer version in its own major, list the major only (that is the target) and say the in-range update is included.

Then ask the scope, **only if the choice exists**:

| What the scan found | What happens |
| --- | --- |
| Nothing outdated | say so; skip to vulnerabilities (step 6) |
| Only minor and/or patch | **do not ask**: step 4 right away |
| Majors **and** minor/patch | ask: **everything**, **only minor and patch** (default), or **pick the majors** (then ask which; default for the rest: minor/patch) |
| Only majors | ask: **update all the majors**, **pick which**, or **leave them** (nothing is changed; write nothing) |

If the user already said in the request what they want ("migrate nuxt to the new major", "only minor"), do not ask; still show the list.

Majors the user leaves out are not noted as blocked: they were not blocked, just not chosen. They stay in the list of the report. Only a major that was attempted, or that was found blocked or postponed, becomes a note (step 7).

### 3. Classify

- **Safe to auto-update**: same major as the declared constraint (and, below `1.0.0`, same minor). Check the changelog/release notes first for new required config, renamed/removed APIs used here, or peer-dependency changes (especially `nuxt`, `vue`, `vite`, `tailwindcss`); if a concern surfaces, treat it as a major.
- **Major**: different major, or a concern found in the changelog of a minor.

### 4. Minor and patch

Edit `package.json` constraints directly (`npm update` alone does not touch them), then install via the project's install script (e.g. `npm run si`) or `npm install`. Run `/sb-health:build` and `/sb-health:lint` after.

### 5. Major: act as the migration manager

Per package, in order. Do not start the next before the previous is verified.

#### 5a. Read what changed

Find the release information for **every major between the current version and the target** (1.2.0 → 3.0.0 means the 2.0.0 and the 3.0.0 notes), not only the last one. Sources, in this order, stopping when it is complete:

1. GitHub releases: `npm view <pkg> repository.url`, then `gh release view v<version> --repo <owner>/<repo>` or `gh api repos/<owner>/<repo>/releases`;
2. `CHANGELOG.md` / `HISTORY.md` in the repo (`gh api repos/<owner>/<repo>/contents/CHANGELOG.md`) or in the package;
3. the library's migration or upgrade guide in its docs (for the stack's own libraries, `${CLAUDE_SKILL_DIR}/../../core/references/stack-docs.md`), and the `BREAKING CHANGE` commits as a last resort.

Extract, for each: **breaking changes** (removed or renamed APIs, options and exports, changed defaults and behavior), **new requirements** (minimum Node, peer dependencies, required config or module changes), **deprecations that become removals**, and **new features worth knowing** (one line each, not the point of the task). If no release information can be found, say so and treat the update as unverified: propose, do not apply.

#### 5b. Find what the project uses

For every breaking change and requirement, search the project (imports and `require`s, config keys in `nuxt.config.*`, the options passed to the module, template usage, composables, `package.json` scripts, CI files). Do not read only the headline: open the files that matter. Build a table:

| Change in the release | Used here? | Where | What has to change |
| --- | --- | --- | --- |
| `useFoo()` renamed `useBar()` | yes | `app/pages/index.vue:12`, 3 more | rename, same arguments |
| option `legacy` removed | no | | nothing |
| Node ≥ 22 | | `engines.node` is 20 | raise `engines` and the CI Node version (needs the user's decision) |

"Not used" has to be a finding (searched, nothing found), not an assumption.

#### 5c. Check compatibility with the rest of the project

| Check | How |
| --- | --- |
| **Peers of the target** | `npm view <pkg>@<target> peerDependencies engines`: is every peer satisfied by what is installed, or by a newer version that is **also** an update available? |
| **Dependents** | `npm ls <pkg>` / `npm explain <pkg>`: which installed packages depend on `<pkg>` or list it as a peer, and does their range accept the target? |
| **Install dry run** | `npm install <pkg>@<target> --dry-run` (no `--force`, no `--legacy-peer-deps`): does the resolver accept it? |
| **Node** | `engines` of the target vs the project's and the CI's Node |

For every conflict found, answer four questions and write them down:

1. **Who owns it?** `project`: our own constraint, an `overrides` entry, our code, an update we have not done yet that would resolve it. `upstream`: another library's peer range or code lags behind and only they can fix it.
2. **How much does it matter?** *Blocks the install* (the resolver refuses), *breaks at runtime or build* (it installs but a feature fails), *warning only* (a peer range that is stricter than the code needs).
3. **Is it already fixed?** Look at the latest version of the lagging library (`npm view <other> version peerDependencies`), its releases and its open/closed issues (`gh issue list --repo <owner>/<repo> --search "<pkg> <target>"`). A fix may exist in a version the project can update to.
4. **What is the way forward?** One of: update the other library too (as part of the same plan), change our own code or constraint, **wait** (note it), or ask the user.

Conflicts that are a **warning only** and `upstream`-owned may be accepted if the user agrees and the build and checks pass, but are still written in a note (`--status watching`) so they are revisited. Never "fix" a conflict by moving any package backwards.

#### 5d. Propose the migration plan

Show, in the user's language, **before touching anything**:

- the release notes in short (what is new, what breaks) and the links;
- the table of 5b and the exact edits (files, lines, before → after);
- the conflicts of 5c with owner, impact, and the way forward;
- the order: which packages, which edits, which verification;
- what is **not** being done and why (becomes a note).

Then **stop and wait** for the user's approval. They may approve all, part of it, or ask to postpone. Postponed parts go into a note (step 7).

#### 5e. Apply and verify

After approval: edit `package.json` and the project files of the plan, install, then run `/sb-health:build` and `/sb-health:lint` (and the tests, if the project has a script for them). Compare with the baseline taken before: only **new** failures count.

- Fixable inside the approved plan → fix and verify again.
- Not fixable inside the plan, or the cause is unclear → **stop**, report the exact error and the files changed. Do not downgrade. Ask the user before discarding the attempt's changes with git (the package then stays at its current version, as before the attempt), and write a note with what was learned.

### 6. Vulnerabilities

`npm audit` (classify severity/package/via/fix availability), `npm audit fix` for what is in the semver range. **Never `npm audit fix --force`.** If a fix needs a major or a force, treat it like a major (step 5) and, when it cannot be done now, note it with the advisory, the severity and who owns the fix. Re-run `npm audit` to confirm.

### 7. Write the notes

Before the report, make sure everything left pending is in the notes: each postponed or blocked major, each accepted conflict, each part of a plan the user postponed, each vulnerability that waits. For each, `add` with a `summary` that a stranger would understand, the `blockedBy` entries with owner, the links to the issue or release, and a `recheck` that can be verified in one command.

Example:

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/dependency-notes.mjs" add @nuxtjs/i18n --target 10.0.0 --current 9.5.0 \
  --summary "i18n 10 needs vue-router@^5; @nuxtjs/sitemap@7.0.0 still has peer vue-router@^4 and breaks the sitemap build" \
  --recheck "has @nuxtjs/sitemap released a version whose peerDependencies accept vue-router@^5? (npm view @nuxtjs/sitemap version peerDependencies)" \
  --blocked-by @nuxtjs/sitemap@7.0.0:upstream --link https://github.com/nuxt-modules/sitemap/issues/NNN
```

### 8. Report

| Section | Content |
| --- | --- |
| Updated | grouped Major / Minor / Patch, each package as old → new (for majors, with the migration changes applied) |
| Available, not chosen | packages the user left out of the scope, grouped, old → new |
| Waiting | each open note: package, target, what blocks it, owner (`upstream` / `project`), what will be checked next time |
| Needs your decision | `project`-owned items and plans the user has not decided |
| Vulnerabilities | resolved vs remaining, and whether the fix depends on this project or upstream |
| Not verified | changelogs or issues that could not be read |
