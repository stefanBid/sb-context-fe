---
name: migration
description: Moves a project set up with sb-context-nuxt 0.x to the sb-context-fe 1.0 plugins — the .sb-context-nuxt folder becomes .sb-context (settings and GitHub files renamed, the folder made committable), and the old skill commands and plugin id in the project's docs and Claude settings are rewritten. Plan first, then applies only what the user approves. Trigger phrases (English or Italian) — "migrate to v1", "the project uses sb-context-nuxt", "migra il progetto alla v1", "aggiorna da sb-context-nuxt".
---

# Migrate a project from sb-context-nuxt 0.x to sb-context-fe 1.0

The 1.0 splits the old plugin into `sb-core`, `sb-github`, `sb-health` and `sb-design`, renames the project folder and shortens the skill names. A project set up with 0.x keeps its state in `.sb-context-nuxt/`: until it is migrated, every script of the 1.0 plugins refuses to run there, so no state is split between two folders.

Nothing about the style, the templates, the code or the remote changes: only the plugins' own files and the references to them.

**Language**: this file is in English; talk to the user in their language.

## What changes

| 0.x | 1.0 |
| --- | --- |
| `.sb-context-nuxt/` (kept out of git through `.git/info/exclude`) | `.sb-context/`, which can be committed: its own `.gitignore` keeps `github.json` and `*.prev.md` out |
| `project-settings.json` | `settings.json` |
| `github_settings.json` | `github.json` |
| `design-source.md`, `design-applied.json`, `design-map.json`, `dependency-notes.json` | same names, same content |
| `/sb-context-nuxt:<skill>` | `/sb-core:setup`, `/sb-core:onboard`, `/sb-github:admin`, `/sb-github:checks`, `/sb-health:build`, `/sb-health:lint`, `/sb-health:deps`, `/sb-health:docs`, `/sb-health:seo`, `/sb-health:checkup`, `/sb-design:align`, `/sb-design:migrate`, `/sb-design:extract-style`, `/sb-design:extract-ui` |
| plugin `sb-context-nuxt@sb-context-nuxt` | bundle `sb-context-fe@sb-context-fe` (installs the four plugins) |

## 1. Plan (read-only)

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/migrate-v1.mjs"
```

It prints the plan as JSON (`status`, `moves`, `conflicts`, `gitExclude`, `refs`):

- `status: nothing-to-migrate` → say the project is already on 1.0 (or was never set up) and stop.
- `status: conflict` (exit 3) → `.sb-context/` already has files the move would overwrite (`conflicts`). Show both versions of each file and ask which to keep; never merge or overwrite on your own. Once the user has moved or removed what they chose to drop, run the plan again.
- `status: plan` → show it as a short table, in the user's language: each file moved (and renamed), the line removed from `.git/info/exclude`, and each project file with references to rewrite (`refs`: file, change, times).

Say plainly what removing the exclude line means: **git will see `.sb-context/`** from now on. To keep it local, as in 0.x, the user adds `.sb-context/` to the project's `.gitignore`; ask whether they want that, and add it only on a yes (it is a tracked file: show the line first).

Ask two things, together: **apply the folder migration?** and **rewrite the references** listed in `refs`? (they are in the project's own docs and settings, e.g. `CLAUDE.md` or `.claude/settings.json`, so they are the user's files).

## 2. Apply (after the go-ahead)

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/migrate-v1.mjs" --apply          # folder only
node "${CLAUDE_SKILL_DIR}/../../scripts/migrate-v1.mjs" --apply --refs   # folder and references
```

Report the `done` list. If references were left (`refsLeft`), list them: the user can rewrite them later by running this skill again.

## 3. The plugins themselves

The script does not touch Claude Code's own configuration. Tell the user, as commands to run themselves:

- if `sb-context-nuxt` is still installed and was not moved to the bundle automatically: `/plugin install sb-context-fe@sb-context-fe`, then `/plugin uninstall sb-context-nuxt@sb-context-nuxt`;
- if the marketplace is still registered under its old name: `/plugin marketplace add stefanBid/sb-context-fe`;
- then `/reload-plugins`.

## 4. Check

Run `/sb-core:setup`: it now finds `.sb-context/`, asks only what is still missing, and reports the next steps with the new skill names.

## Rules

- **Plan before writes**, and the two writes (folder, references) are approved separately.
- Files are **moved, never deleted**; the old folder is removed only when empty.
- Never resolve a conflict by choosing a file on the user's behalf.
- References are rewritten only in the project's docs and Claude settings, never in source code.
