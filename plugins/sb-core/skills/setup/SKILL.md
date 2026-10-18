---
name: setup
description: Sets up the sb-context-fe plugins on a project (Nuxt, or Vue with Vite, app or library) — detects the project profile and confirms the type of project, creates the .sb-context folder, says which plugins and skills this project needs and turns the others off for this project only (after a yes), asks the missing project settings in one go, and reports what to run next. Never touches the style, the templates or the remote. Trigger phrases (English or Italian) — "set up the plugin on this project", "the project is already aligned", "configura il plugin su questo progetto", "inizializza sb-context".
---

# Set up the plugins on a project

The entry point of the plugins on any project: it learns **what the project is** (the profile), tailors which plugins and skills are on for it, and settles the project settings. It **does no style, template, build or GitHub work**, and it can be run again at any time: it asks only what is still unknown, or what the project now contradicts.

For an app in progress (Nuxt, or Vue + Vite) whose style still has to be aligned, `/sb-core:onboard` runs this skill and then the alignment.

Writes, all shown before they happen:

- `.sb-context/` (profile, settings, the folder's `.gitignore`);
- `.claude/settings.local.json`, only to turn plugins off (or on) for this project, and only after the user says yes.

Whether `.sb-context/` goes into git is the user's choice: the folder is made to be committed (its own `.gitignore` keeps `github.json` and `*.prev.md` out); to keep it all local, the user adds `.sb-context/` to the project's `.gitignore`.

If the project still has `.sb-context-nuxt/` (set up with sb-context-nuxt 0.x), the scripts refuse to run: run `/sb-core:migration` first.

**Language**: this file is in English, but talk to the user in their language.

## 1. The project profile

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" detect
```

Format and rules: `${CLAUDE_SKILL_DIR}/../../core/references/profile.md`. It prints the profile as the files show it (`profile`), the saved one (`saved`), what changed since (`drift`) and the keys nobody can tell from the files (`unknown`).

Show a short table: framework and major, bundler, **kind** (app or library), rendering, language, package manager, source and style folders, styling engine, router, i18n. Then ask, in one go (question tool if available), with the detected value as the recommended answer:

- **the type of project**: an app (SSR, static or client-side) or a library. Ask it the first time even when it was detected, because it decides which plugins and skills apply; once confirmed it is never asked again;
- every key in `unknown` (no lockfile → package manager);
- every `drift` entry with `confirmed: true` (the project now says something else than what the user confirmed): which one is right.

Save each answer with `profile.mjs set <key> '<json>'` (`set kind '"library"'`), then `profile.mjs write` to save the profile.

**Stop** on Nuxt < 4 or Vue < 3, and say so. A stack the plugins have no detector for (no Nuxt, no Vue) is refused by the scripts themselves: say which stacks are supported.

## 2. Prepare the folder

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/setup-state.mjs" --init
```

Creates `.sb-context/` and its `.gitignore`. It prints the state of the project as JSON (`profile`, `folder`, `files`, `style`, `design`, `docLinks`, `github`, `dependencyNotes`, `docs`, `next`); keep it for step 6. `folder.ignoredByProject` says whether the project's `.gitignore` keeps the whole folder local; mention it once, without asking to change it.

Read `CLAUDE.md` if present and follow its rules for the rest of the run.

## 3. Plugins and skills for this project

```bash
claude plugin list --json
node "${CLAUDE_SKILL_DIR}/../../scripts/project-plugins.mjs" plan --installed <ids>
```

Pass as `<ids>` the `id` of every `sb-*` plugin in the list (`sb-core@sb-context-fe,sb-design@sb-context-fe`), comma-separated. `plan` prints, for each of `sb-core`, `sb-github`, `sb-health`, `sb-design`: the installed id, whether this project needs it and why, and what the project settings already say (`project`: `false` = off here); plus `skills`, the skills worth knowing for this project.

Show it as one table (plugin, needed or not and why, installed, on in this project) and then:

- **needed but not installed** → give the command, do not run it: `/plugin install <plugin>@sb-context-fe` (or `--scope local` to install it for this project only);
- **installed, on, but not needed** (typically `sb-design` on a library, or on a stack it has no adapter for yet) → ask whether to turn it off **for this project only**. On a yes: `project-plugins.mjs disable <id>`. It writes `.claude/settings.local.json`, which is personal and wins over the user settings, so the plugin stays on in every other project. Then ask the user to run `/reload-plugins`;
- **off in this project but now needed** (the project changed) → offer `project-plugins.mjs reset <id>` the same way.

`sb-core` is never turned off: the others depend on it. Never turn a plugin off without the user's yes.

## 4. Project settings

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" detect
```

Format and rules: `${CLAUDE_SKILL_DIR}/../../core/references/project-settings.md`. **Ask all the `missing` questions together** (question tool if available), each with the detected value as the recommended answer, and save each answer with `project-settings.mjs set <key> '<json>'`. Ask only what makes sense for this project and for the plugins it keeps on: no style prefix when sb-design does not apply, no site URL for a library, no `@nuxt/image` question without images. Anything already saved is not asked; if the project contradicts a saved value (module removed, folder moved), say so and ask which is right.

On an aligned project the style prefix is already in `theme.css`: `detect` shows it (`facts.style.prefix`), offer it as the answer for `style.prefix`.

## 5. Is the style really aligned?

Only if sb-design applies to this project (step 3), the four style files exist (`style.files` all true) **and** `/sb-design:check` is among the available skills: run it. It is read-only and reports whether the style is aligned and in sync with the design snapshot. Otherwise say why the check was skipped; do not look for its scripts.

## 6. Report and next steps

One table, what the plugins know now:

| Area | Source |
| --- | --- |
| Profile | framework, kind, rendering, adapter; saved, confirmed keys |
| Plugins | on in this project, turned off now, to install |
| Folder | `folder` (created or already there; kept local by the project or committed) |
| Project settings | saved now / already saved / skipped |
| Global style | `style` + `/sb-design:check` of step 5 (when sb-design applies) |
| Design snapshot | `design.source`, `design.applied` |
| Documentation links | `docLinks` (links saved in `docs.json`, `CLAUDE.md` pointing to them) |
| GitHub | `github` (remote, cache, signature asked, PR title lint, release-please) |
| Dependency notes | `dependencyNotes.open` |
| Project docs | `docs` |

Then the skills for this project (`skills` of step 3), each with one line on what it is for here, and the next steps, **recommendations only** (this skill never runs them): every item of `next`, with its reason (each `skill` is already written as `/<plugin>:<skill>`), plus, when sb-design applies:

- style not aligned in step 5 → `/sb-design:align`;
- templates still using raw Tailwind colors or sizes → `/sb-design:migrate` (mention it, do not scan for it);
- no `DESIGN.md` → Impeccable's `/impeccable document` (a separate plugin, optional);

and day-to-day checks → `/sb-health:checkup`.

If `next` is empty and nothing is missing, say the project is set up and nothing else is needed.
