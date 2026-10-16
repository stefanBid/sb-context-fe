---
name: setup
description: Light setup of the sb-context-fe plugins on a Nuxt project that is already in progress or already aligned — creates the project's .sb-context folder, asks the missing project settings in one go, and reports what the plugins know and which skill to run next. Never touches the style, the templates or the remote. Trigger phrases (English or Italian) — "set up the plugin on this project", "the project is already aligned", "configura il plugin su questo progetto", "inizializza sb-context".
---

# Set up the plugins on a project

For a project where `/sb-core:onboard` would do too much: the style is already aligned (by hand, or by an earlier run), or the user only wants the plugins to know the project. This skill **does no style, template, build or GitHub work**: it prepares the plugins' folder, settles the project settings and says what is missing. It can be run again at any time: it asks only what is still unknown.

The only writes are inside `<root>/.sb-context/`. Nothing is committed and no project file outside that folder is touched. Whether `.sb-context/` goes into git is the user's choice: the folder is made to be committed (its own `.gitignore` keeps `github.json` and `*.prev.md` out); to keep it all local, the user adds `.sb-context/` to the project's `.gitignore`.

If the project still has `.sb-context-nuxt/` (set up with sb-context-nuxt 0.x), the scripts refuse to run: run `/sb-core:migration` first.

**Language**: this file is in English, but talk to the user in their language.

## 1. Check the stack

Read `package.json`, the lockfile and `nuxt.config.*`. Report a short table: Nuxt (must be 4), Tailwind (4 with `@tailwindcss/vite`, or not), package manager, `@nuxtjs/color-mode`, `@nuxt/fonts`. **Stop** on Nuxt < 4, and say so. Tailwind, color-mode and fonts matter only to `/sb-design:*`: report them, do not stop on them (`/sb-design:align` stops on Tailwind < 4 and installs color-mode and fonts when it runs).

Read `CLAUDE.md` if present and follow its rules for the rest of the run.

## 2. Prepare the folder

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/setup-state.mjs" --init
```

Creates `.sb-context/` and its `.gitignore`. It prints the state of the project as JSON (`folder`, `files`, `style`, `design`, `github`, `dependencyNotes`, `docs`, `next`); keep it for step 5. `folder.ignoredByProject` says whether the project's `.gitignore` keeps the whole folder local; mention it once, without asking to change it.

## 3. Project settings

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" detect
```

Format and rules: `${CLAUDE_SKILL_DIR}/../../core/references/project-settings.md`. **Ask all the `missing` questions together** (question tool if available), each with the detected value as the recommended answer, and save each answer with `project-settings.mjs set <key> '<json>'`. Skip the questions that make no sense for this project (no images → no `@nuxt/image` question). Anything already saved is not asked; if the project contradicts a saved value (module removed, folder moved), say so and ask which is right.

On an aligned project the style prefix is already in `theme.css`: `detect` shows it (`facts.style.prefix`), offer it as the answer for `style.prefix`.

## 4. Is the style really aligned?

Only if the four style files exist (`style.files` all true) **and** `/sb-design:check` is among the available skills: run it. It is read-only and reports whether the style is aligned and in sync with the design snapshot. If the sb-design plugin is not installed, say this check was skipped and why; do not look for its scripts.

## 5. Report and next steps

One table, what the plugins know now:

| Area | Source |
| --- | --- |
| Folder | `folder` (created or already there; kept local by the project or committed) |
| Project settings | saved now / already saved / skipped |
| Global style | `style` + `/sb-design:check` of step 4 (prefix, aligned or not, in sync or not) |
| Design snapshot | `design.source`, `design.applied` |
| GitHub | `github` (remote, cache, signature asked, PR title lint, release-please) |
| Dependency notes | `dependencyNotes.open` |
| Project docs | `docs` |

Then the next steps, **recommendations only** (this skill never runs them): every item of `next`, with its reason (each `skill` is already written as `/<plugin>:<skill>`), plus:

- style not aligned in step 4 → `/sb-design:align`;
- templates still using raw Tailwind colors or sizes → `/sb-design:migrate` (mention it, do not scan for it);
- no `DESIGN.md` → Impeccable's `/impeccable document` (a separate plugin, optional);
- day-to-day checks → `/sb-health:checkup`.

A recommended skill whose plugin is not installed is still listed, with the plugin to install (`/plugin install <plugin>@sb-context-fe`).

If `next` is empty and the style is aligned, say the project is set up and nothing else is needed.
