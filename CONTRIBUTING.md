# Contributing

`main` is protected: every change goes through a pull request, merged with **squash**. The PR title becomes the commit on `main`, and [release-please](https://github.com/googleapis/release-please) reads it to decide the next version, the tag and the changelog. A title outside the format means a missing or wrong release, so the `lint-pr-title` check blocks the merge.

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

A change that edits what a skill **does** (`skills/**`) is a `feat` or a `fix`, even when only a `SKILL.md` changes: that file is the product.

Until `1.0.0`, a breaking change bumps the **minor** version, not the major.

### Breaking changes

Add `!` after the type, and explain in the PR body:

```
feat(style-align)!: rename the token prefix question

BREAKING CHANGE: the prefix is now asked after the inventory, not before.
```

### Scopes

Use the skill name when the change touches one skill: `style-align`, `style-migrate`, `design-extract-style`, `design-extract-ui`, `gh-admin`, `gh-checks`, `onboard`, `lint-check`, `build-check`, `seo-check`, `dependency-check`, `docs-update`, `full-checkup`. Leave the scope out for changes that cut across the plugin.

### Examples

```
feat(gh-admin): add security audit recipe
fix(style-align): report the comment that justifies a drift
docs: list the new skills in the README
ci: add release-please
refactor(style-migrate): split the mapping table
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
npm run validate            # claude plugin validate --strict on the marketplace, the manifest and the skills (needs Claude Code installed)
```

| Layer | What it guarantees |
| --- | --- |
| `tests/unit` | the logic in the `lib/` modules: color math and WCAG contrast, CSS variable resolution, value normalizers and in-place rewrites, prefix rules, type scale and clusters, class anatomy, role maps, i18n heuristics, dependency notes |
| `tests/cli` | each script end to end on a real folder (`tests/helpers/fixture.mjs`): exit codes, JSON output, files written, idempotence of `--apply`, `.git/info/exclude` |
| `tests/contract` | the files gh-admin and gh-checks apply to other projects (labels, ruleset, workflow template) are valid; every `${CLAUDE_SKILL_DIR}/…` path exists, every `/sb-context-nuxt:<skill>` names a skill, the two `color.mjs` copies are identical, manifests and CONTRIBUTING agree with the code |

How scripts are written so they can be tested: the logic lives in `lib/` modules next to the script (`scripts/lib/`, `skills/<skill>/scripts/lib/`) as pure exported functions; the script itself reads arguments and files, calls them, prints, and exits. A new algorithm goes in `lib/` with its unit tests; a new script gets a test in `tests/cli`.

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

Never edit `version` by hand. release-please keeps a release PR (`chore(main): release X.Y.Z`) open and up to date. Merging it bumps `.claude-plugin/plugin.json`, writes `CHANGELOG.md` and creates the `vX.Y.Z` tag and the GitHub Release.

Other projects receive it with:

```
/plugin marketplace update sb-context-nuxt
/plugin update sb-context-nuxt@sb-context-nuxt
/reload-plugins
```

If the release PR shows `lint-pr-title` and `tests-gate` as pending forever, edit its title and put it back: pull requests opened by `GITHUB_TOKEN` do not trigger other workflows, and an edit from a user does. On a release PR `tests-gate` passes without running the suite.
