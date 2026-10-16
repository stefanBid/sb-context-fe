# Contributing

`main` is protected: every change goes through a pull request, merged with **squash**. The PR title becomes the commit on `main`, and [release-please](https://github.com/googleapis/release-please) reads it to decide the next version, the tag and the changelog of **each plugin the commit touches**. A title outside the format means a missing or wrong release, so the `lint-pr-title` check blocks the merge.

## Layout

```
.claude-plugin/marketplace.json   the marketplace: one entry per plugin, renames from 0.x
core/                             shared code and references: the only place to edit them
plugins/<plugin>/                 one plugin each: .claude-plugin/plugin.json, skills/, scripts/, README.md
plugins/<plugin>/core/            generated copy of core/ (node scripts/sync-core.mjs), never edited by hand
plugins/sb-context-fe/            the bundle: only a manifest whose dependencies are the four plugins
scripts/sync-core.mjs             copies core/ into every plugin; --check fails on a stale copy
tests/                            unit, cli and contract tests for all the plugins
```

A plugin is installed alone into Claude Code's cache, so nothing in it may point outside its own folder: a skill reaches shared code through its plugin's copy (`${CLAUDE_SKILL_DIR}/../../core/…`), and a step that needs another plugin calls that plugin's **skill** by name (`/sb-design:check`), never its files. The contract tests enforce both.

## Commit / PR title format

```
<type>(<optional scope>): <short description in the imperative>
```

Lowercase type, no trailing period, description under about 70 characters.

| Type | Use it for | Version bump | In the changelog |
| --- | --- | --- | --- |
| `feat` | a new skill, or a new capability of an existing one | minor (`0.3.0` → `0.4.0`) | yes |
| `fix` | a bug in a skill, script or reference | patch (`0.3.0` → `0.3.1`) | yes |
| `perf` | a faster script, same behaviour | patch | yes |
| `revert` | reverting an earlier change | patch | yes |
| `docs` | README, CONTRIBUTING, skill descriptions only | none | no |
| `refactor` | restructuring without changing behaviour | none | no |
| `style` | formatting only | none | no |
| `test` | tests and evals | none | no |
| `build` | packaging, plugin manifests | none | no |
| `ci` | GitHub Actions and repo automation | none | no |
| `chore` | anything else that is not shipped | none | no |

A change that edits what a skill **does** (`plugins/**`, `core/**`) is a `feat` or a `fix`, even when only a `SKILL.md` changes: that file is the product.


### Breaking changes

Add `!` after the type, and explain in the PR body:

```
feat(sb-design)!: rename the token prefix question

BREAKING CHANGE: the prefix is now asked after the inventory, not before.
```

### Scopes

Use the plugin when the change touches one plugin: `sb-core`, `sb-github`, `sb-health`, `sb-design`, `sb-context-fe` (the bundle); `core` for the shared code in `core/`. Leave the scope out for changes that cut across the marketplace. The scope is for people: release-please decides which plugins to release from the paths the commit touches.

### Examples

```
feat(sb-github): add security audit recipe to admin
fix(sb-design): report the comment that justifies a drift in align
fix(core): find the project root from a nested folder
docs: list the new skills in the README
refactor(sb-design): split the mapping table of migrate
```

## Tests

A skill's outcome depends on the model that runs it; its scripts must not. The suite locks the deterministic part: every algorithm a skill relies on, and the plugin's own wiring. It runs on Node's built-in runner (`node:test`); `package.json` exists only for the test dependencies (postcss, tailwindcss, vue), the plugin itself has none.

```
npm ci
npm test               # everything
npm run test:unit      # pure functions (tests/unit)
npm run test:cli       # each script run on a throwaway Nuxt project (tests/cli)
npm run test:contract  # SKILL.md paths, cross-skill references, manifests, docs (tests/contract)
npm run test:coverage
npm run test:coverage:lcov  # same, and writes lcov.info (used for the README badges)
npm run validate            # claude plugin validate --strict on the marketplace and every plugin (needs Claude Code installed)
node scripts/sync-core.mjs  # after editing core/: refresh the copies in the plugins
```

| Layer | What it guarantees |
| --- | --- |
| `tests/unit` | the logic in the `lib/` modules: color math and WCAG contrast, CSS variable resolution, value normalizers and in-place rewrites, prefix rules, type scale and clusters, class anatomy, role maps, i18n heuristics, dependency notes, GitHub settings, setup recommendations |
| `tests/cli` | each script end to end on a real folder (`tests/helpers/fixture.mjs`): exit codes, JSON output, files written, idempotence of `--apply`, the `.sb-context/` folder and the 0.x migration |
| `tests/contract` | the files gh-admin and gh-checks apply to other projects (labels, ruleset, workflow template) are valid; every `${CLAUDE_SKILL_DIR}/…` path exists inside its own plugin, every `/<plugin>:<skill>` names a skill, every import stays inside its plugin, the copies of `core/` are up to date, the two `color.mjs` copies are identical, manifests, release config and CONTRIBUTING agree with the code |

How scripts are written so they can be tested: the logic lives in `lib/` modules next to the script (`core/lib/`, `plugins/<plugin>/scripts/lib/`, `plugins/<plugin>/skills/<skill>/scripts/lib/`) as pure exported functions; the script itself reads arguments and files, calls them, prints, and exits. A new algorithm goes in `lib/` with its unit tests; a new script gets a test in `tests/cli`.

Outputs that other skills or the model read as a format (`design-source.md`, the inventory, template, contrast and sync reports) are pinned as golden files in `tests/snapshots/`. A change to them must be a decision: run `UPDATE_SNAPSHOTS=1 npm test`, review the diff and commit it with the change.

Property tests (`tests/unit/fuzz.test.mjs`, `tests/cli/properties.test.mjs`) check rules on many random inputs instead of a few examples: the parsers never throw, `sync-values --apply` always ends aligned and idempotent, `tokens-to-source` always has full coverage and is deterministic, a prefix rename round trip is lossless. The inputs come from a fixed seed, so a failure is reproducible; `SEED=<n> npm test` explores other inputs.

What the plugin promises about the user's machine is tested too: no script imports a network or process module (`tests/contract/safety.test.mjs`), read-only commands change no file, and each writing command touches only the files it declares (`tests/cli/writes.test.mjs`). A new script or flag that writes must be added there.

A known gap is written as a test with `{ todo: '<what is wrong>' }`: it runs and is reported, but does not fail the suite until it is fixed (then the `todo` is removed).

The `Tests` workflow decides from the PR title whether the suite is required, with the same rule release-please uses to cut a release:

| PR | Suite | `tests-gate` (required check) |
| --- | --- | --- |
| `feat`, `fix`, `perf`, `revert`, or any type with `!` / a `BREAKING CHANGE:` footer | runs on Node 22 and 24, with `claude plugin validate --strict` | passes only if the suite and the validation pass: a red one blocks the merge |
| everything else (`docs`, `chore`, `ci`, `test`, `refactor`…, and the `chore(main): release` PRs) | skipped | passes |

The workflow also runs when the title is edited, so renaming a `chore` PR to `fix` runs the suite before the merge. Every push to `main` runs it anyway.

On every push to `main` the `coverage badge` job measures line and branch coverage and publishes them as shields.io endpoint files (`coverage.json`, `coverage-branches.json`) on the `badges` branch, which the README badges read. The branch holds nothing else; never merge it.

## Workflow

1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
2. Commit as you like on the branch; only the **PR title** has to follow the format, because the squash commit takes it.
3. Run `npm test`, open the PR into `main` and wait for `lint-pr-title` and `tests-gate`.
4. Squash and merge. The branch is deleted automatically.

## Releases

Never edit `version` by hand. release-please keeps one release PR (`chore(main): release …`) open and up to date for every plugin with releasable changes. Merging it bumps each plugin's `.claude-plugin/plugin.json`, writes its `plugins/<plugin>/CHANGELOG.md` and creates its tag and GitHub Release. Tags are `<plugin>--v<version>` (`sb-core--v1.0.0`), the convention Claude Code uses to resolve plugin dependencies. A change to `core/` touches every plugin's copy, so it releases all of them.

The changelog of the 0.x releases (the single `sb-context-nuxt` plugin) stays in the root `CHANGELOG.md`.

Other projects receive a release with:

```
/plugin marketplace update sb-context-fe
/reload-plugins
```

If the release PR shows `lint-pr-title` and `tests-gate` as pending forever, edit its title and put it back: pull requests opened by `GITHUB_TOKEN` do not trigger other workflows, and an edit from a user does. On a release PR `tests-gate` passes without running the suite.
