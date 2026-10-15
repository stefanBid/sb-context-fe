---
name: setup
description: Light setup of the plugin on a Nuxt project that is already in progress or already aligned — creates the local .sb-context-nuxt folder (kept out of git), asks the missing project settings in one go, and reports what the plugin knows and which skill to run next. Never touches the style, the templates or the remote. Trigger phrases (English or Italian) — "set up the plugin on this project", "the project is already aligned", "configura il plugin su questo progetto", "inizializza sb-context-nuxt".
---

# Set up the plugin on a project

For a project where `onboard` would do too much: the style is already aligned (by hand, or by an earlier run), or the user only wants the plugin to know the project. This skill **does no style, template, build or GitHub work**: it prepares the plugin's local folder, settles the project settings and says what is missing. It can be run again at any time: it asks only what is still unknown.

The only writes are inside `<root>/.sb-context-nuxt/` and the line `.sb-context-nuxt/` in `.git/info/exclude`. Nothing is committed.

**Language**: this file is in English, but talk to the user in their language.

## 1. Check the stack

Read `package.json`, the lockfile and `nuxt.config.*`. Report a short table: Nuxt (must be 4), Tailwind (must be 4, with `@tailwindcss/vite`), package manager, `@nuxtjs/color-mode`, `@nuxt/fonts`. **Stop** on Nuxt < 4 or Tailwind < 4, and say so. Missing color-mode or fonts is not a stop: `style-align` installs them when it runs.

Read `CLAUDE.md` if present and follow its rules for the rest of the run.

## 2. Prepare the local folder

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/setup-state.mjs" --init
```

Creates `.sb-context-nuxt/` and keeps it out of git. It prints the state of the project as JSON (`folder`, `files`, `style`, `design`, `github`, `dependencyNotes`, `docs`, `next`); keep it for step 5. If `git` is false, say that the folder cannot be excluded from git until the project is a repository.

## 3. Project settings

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/project-settings.mjs" detect
```

Format and rules: `${CLAUDE_SKILL_DIR}/../../references/project-settings.md`. **Ask all the `missing` questions together** (question tool if available), each with the detected value as the recommended answer, and save each answer with `project-settings.mjs set <key> '<json>'`. Skip the questions that make no sense for this project (no images → no `@nuxt/image` question). Anything already saved is not asked; if the project contradicts a saved value (module removed, folder moved), say so and ask which is right.

On an aligned project the style prefix is already in `theme.css`: `detect` shows it (`facts.style.prefix`), offer it as the answer for `style.prefix`.

## 4. Is the style really aligned?

Only if the four style files exist (`style.files` all true):

```bash
node "${CLAUDE_SKILL_DIR}/../style-align/scripts/inventory.mjs"
```

Read-only. Report its last line (**Already aligned: yes/no**) and, if no, the checks marked **NO**. Do not fix anything: a fix is `/sb-context-nuxt:style-align`, with its own confirmations.

## 5. Report and next steps

One table, what the plugin knows now:

| Area | Source |
| --- | --- |
| Local folder | `folder` (created, excluded from git) |
| Project settings | saved now / already saved / skipped |
| Global style | `style` + the inventory of step 4 (prefix, aligned or not) |
| Design snapshot | `design.source`, `design.applied` |
| GitHub | `github` (remote, cache, signature asked, PR title lint, release-please) |
| Dependency notes | `dependencyNotes.open` |
| Project docs | `docs` |

Then the next steps, **recommendations only** (this skill never runs them): every item of `next`, as `/sb-context-nuxt:<skill>` with its reason, plus:

- style not aligned in step 4 → `/sb-context-nuxt:style-align`;
- templates still using raw Tailwind colors or sizes → `/sb-context-nuxt:style-migrate` (mention it, do not scan for it);
- no `DESIGN.md` → Impeccable's `/impeccable document` (a separate plugin, optional);
- day-to-day checks → `/sb-context-nuxt:full-checkup`.

If `next` is empty and the style is aligned, say the project is set up and nothing else is needed.
