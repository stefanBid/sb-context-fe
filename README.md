# sb-context-fe

[![Tests](https://github.com/stefanBid/sb-context-fe/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/stefanBid/sb-context-fe/actions/workflows/tests.yml?query=branch%3Amain)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FstefanBid%2Fsb-context-fe%2Fbadges%2Fcoverage.json)](#reliability)
[![Branch coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FstefanBid%2Fsb-context-fe%2Fbadges%2Fcoverage-branches.json)](#reliability)

A Claude Code **marketplace of everyday plugins for frontend projects**. `sb-core`, `sb-github` and `sb-health` work on **Nuxt 4** and **Vue 3 + Vite** projects, apps and libraries; `sb-design` aligns the style of **Tailwind 4 apps** on Nuxt 4 or Vue 3 + Vite (not libraries). This README is the user guide: every plugin and skill, when to use it, what to say to trigger it, what it reads and writes.

The plugins do two things:

1. **Align** a project to one fixed way of organizing the global style, normalizing whatever divergent setup they find, optionally taking the values from a design made in Claude.
2. **Maintain** the project with a precise, repeatable way of working: template migration, UI extraction from a design, health checks, GitHub management.

They do **not** judge or improve the design. That is the job of [Impeccable](#impeccable-design-quality), a separate plugin. The two are not connected.

> **Coming from `sb-context-nuxt` 0.x?** The plugin was split and renamed in 1.0. See [Migrating from sb-context-nuxt 0.x](#migrating-from-sb-context-nuxt-0x).

---

## Table of contents

- [The plugins](#the-plugins)
- [Quick start](#quick-start)
  - [Install](#install)
  - [Update](#update)
  - [First run on a project](#first-run-on-a-project)
  - [Migrating from sb-context-nuxt 0.x](#migrating-from-sb-context-nuxt-0x)
- [How the plugins work](#how-the-plugins-work)
  - [Invocation: command or natural language](#invocation-command-or-natural-language)
  - [Language](#language)
  - [Confirmation stops](#confirmation-stops)
  - [Where things live](#where-things-live)
  - [Requirements](#requirements)
- [Skills at a glance](#skills-at-a-glance)
  - [Which skill do I need?](#which-skill-do-i-need)
  - [Trigger phrases cheat sheet](#trigger-phrases-cheat-sheet)
- [Workflows](#workflows)
  - [Join a project in progress](#join-a-project-in-progress)
  - [Start from a design made in Claude](#start-from-a-design-made-in-claude)
  - [The design changed in Claude](#the-design-changed-in-claude)
  - [Bring a component or a page from the design](#bring-a-component-or-a-page-from-the-design)
  - [Daily health check](#daily-health-check)
  - [Set up the GitHub side](#set-up-the-github-side)
- [Skill reference: sb-design](#skill-reference-sb-design)
  - [/sb-design:extract-style](#extract-style)
  - [/sb-design:align](#align)
  - [/sb-design:migrate](#migrate)
  - [/sb-design:extract-ui](#extract-ui)
  - [/sb-design:check](#check)
- [Skill reference: sb-core](#skill-reference-sb-core)
  - [/sb-core:onboard](#onboard)
  - [/sb-core:setup](#setup)
  - [/sb-core:context](#context)
  - [/sb-core:migration](#migration)
- [Skill reference: sb-health](#skill-reference-sb-health)
  - [/sb-health:checkup](#checkup)
  - [/sb-health:lint](#lint)
  - [/sb-health:build](#build)
  - [/sb-health:seo](#seo)
  - [/sb-health:deps](#deps)
  - [/sb-health:docs](#docs)
- [Skill reference: sb-github](#skill-reference-sb-github)
  - [/sb-github:admin](#admin)
  - [/sb-github:checks](#checks)
- [Project profile](#project-profile)
- [Project settings](#project-settings)
  - [Keys](#keys)
  - [The i18n stance](#the-i18n-stance)
- [The global style](#the-global-style)
  - [The four files](#the-four-files)
  - [What is fixed and what follows the design](#what-is-fixed-and-what-follows-the-design)
  - [Hard rules](#hard-rules)
- [Project files and scripts](#project-files-and-scripts)
  - [The .sb-context folder](#the-sb-context-folder)
  - [Scripts](#scripts)
  - [Exit codes of sync-values](#exit-codes-of-sync-values)
- [Impeccable (design quality)](#impeccable-design-quality)
- [Troubleshooting and FAQ](#troubleshooting-and-faq)
- [Reliability](#reliability)
- [Contributing and releases](#contributing-and-releases)

---

## The plugins

| Plugin | Skills | Install it on |
| --- | --- | --- |
| [`sb-core`](plugins/sb-core/README.md) | `/sb-core:setup`, `/sb-core:context`, `/sb-core:onboard`, `/sb-core:migration` | every project: the others depend on it and install it for you |
| [`sb-github`](plugins/sb-github/README.md) | `/sb-github:admin`, `/sb-github:checks` | every project hosted on GitHub |
| [`sb-health`](plugins/sb-health/README.md) | `/sb-health:checkup`, `/sb-health:build`, `/sb-health:lint`, `/sb-health:deps`, `/sb-health:docs`, `/sb-health:seo` | every project |
| [`sb-design`](plugins/sb-design/README.md) | `/sb-design:align`, `/sb-design:migrate`, `/sb-design:extract-style`, `/sb-design:extract-ui`, `/sb-design:check` | apps whose global style you want aligned (not libraries) |
| `sb-context-fe` | none: a bundle | installs the four plugins above in one step |

The plugins share one folder in the project, [`.sb-context/`](#the-sb-context-folder), so what one learns (settings, design snapshot, GitHub cache) the others read. A skill that needs another plugin's skill calls it by name and, if that plugin is not installed, skips the step and says which plugin would run it.

---

## Quick start

### Install

```
/plugin marketplace add stefanBid/sb-context-fe
/plugin install sb-context-fe@sb-context-fe      # all four plugins
```

Or only what a project needs (each one brings `sb-core` along):

```
/plugin install sb-health@sb-context-fe
/plugin install sb-github@sb-context-fe
/plugin install sb-design@sb-context-fe --scope local   # only in the app you are in
```

### Update

```
/plugin marketplace update sb-context-fe
/reload-plugins
```

Each plugin has its own version and changelog (`plugins/<plugin>/CHANGELOG.md`).

### First run on a project

Open Claude Code in the app (Nuxt, or Vue + Vite) and run:

```
/sb-core:onboard
```

It checks the stack, settles the project settings, aligns the global style, migrates the templates, builds and recommends next steps. It stops at every confirmation. Details: [/sb-core:onboard](#onboard).

Project **already aligned**, or you only want the plugins to know it? Run `/sb-core:setup` instead: it creates the `.sb-context/` folder, asks the missing settings and reports what to run next, without touching the style or the templates. Details: [/sb-core:setup](#setup).

### Migrating from sb-context-nuxt 0.x

1.0 splits `sb-context-nuxt` into the four plugins above, renames the project folder and shortens the skill names.

| 0.x | 1.0 |
| --- | --- |
| plugin `sb-context-nuxt@sb-context-nuxt` | bundle `sb-context-fe@sb-context-fe`, which installs the four plugins |
| `/sb-context-nuxt:style-align`, `style-migrate`, `design-extract-style`, `design-extract-ui` | `/sb-design:align`, `/sb-design:migrate`, `/sb-design:extract-style`, `/sb-design:extract-ui` |
| `/sb-context-nuxt:setup`, `onboard` | `/sb-core:setup`, `/sb-core:onboard` |
| `/sb-context-nuxt:full-checkup`, `build-check`, `lint-check`, `dependency-check`, `docs-update`, `seo-check` | `/sb-health:checkup`, `/sb-health:build`, `/sb-health:lint`, `/sb-health:deps`, `/sb-health:docs`, `/sb-health:seo` |
| `/sb-context-nuxt:gh-admin`, `gh-checks` | `/sb-github:admin`, `/sb-github:checks` |
| `.sb-context-nuxt/` (kept out of git) | `.sb-context/` (can be committed) |
| `project-settings.json`, `github_settings.json` | `settings.json`, `github.json` |

In each project set up with 0.x run:

```
/sb-core:migration
```

It shows the plan first, then moves the folder, renames the files, removes the old line from `.git/info/exclude` and, if you approve, rewrites the old commands in the project's docs and Claude settings. Until a project is migrated, the 1.0 scripts refuse to run there. Details: [/sb-core:migration](#migration).

The plugins themselves, once per machine. After an update the marketplace renames the old plugin to the bundle, but it keeps the marketplace registered under its old name and the bundle still has to be installed; registering it again keeps every name as this README writes it:

```
/plugin marketplace remove sb-context-nuxt
/plugin marketplace add stefanBid/sb-context-fe
/plugin install sb-context-fe@sb-context-fe
/reload-plugins
```

---

## How the plugins work

### Invocation: command or natural language

Every skill has a slash command `/<plugin>:<skill>`. Most skills can also be **triggered by natural language**: say what you want and Claude loads the matching skill. Three skills are **command only** because they change a lot at once: `/sb-core:onboard`, `/sb-design:migrate`, `/sb-health:checkup`.

| Invocation | Skills | How to use |
| --- | --- | --- |
| **Command only** | `/sb-core:onboard`, `/sb-design:migrate`, `/sb-health:checkup` | Type the slash command. Saying "full checkup" in chat will not load them by itself. |
| **Model or command** | all the others | Type the slash command, or write a request that matches the skill's trigger phrases. |

Skills that take an argument show a hint when you type the command: `/sb-design:extract-style [link or name]`, `/sb-design:extract-ui [what to extract] [link]`, `/sb-design:migrate [files or folders]`.

### Language

Talk to Claude in your language. The skill files are in English, but questions, reports and summaries come back in the language you use. Trigger phrases work in **English or Italian** (see the [cheat sheet](#trigger-phrases-cheat-sheet)). PR titles and descriptions are always English.

### Confirmation stops

Reading is free; writing asks first.

| Skill | Stops before |
| --- | --- |
| `/sb-design:align` | writing the four CSS files, installing modules, applying synced values, renaming the prefix |
| `/sb-design:migrate` | applying the refactor (you pick the areas first) |
| `/sb-design:extract-style` | writing `design-source.md` |
| `/sb-design:extract-ui` | replacing an existing component, naming new files |
| `/sb-github:admin`, `/sb-github:checks` | any write to the remote: rulesets, labels, settings, pushes, PRs, releases |
| `/sb-health:deps` | the scope (minor/patch or also major) and the approval of every major migration plan |
| `/sb-core:onboard` | every confirmation of the skills it calls |
| `/sb-core:setup` | nothing outside `.sb-context/` is written; the settings are asked before they are saved |
| `/sb-core:context` | saving the links you chose; writing the block in `CLAUDE.md` (or creating the file) after showing it |
| `/sb-core:migration` | moving the folder, and rewriting references in your docs (approved separately) |

### Where things live

| What | Where |
| --- | --- |
| Global style (the only place `sb-design` writes CSS) | `<srcDir>/assets/css/` (`app/assets/css/` in Nuxt 4, `src/assets/css/` in Vue + Vite) |
| The plugins' files in the project | `<root>/.sb-context/`: it can be committed; its own `.gitignore` keeps `github.json` and `*.prev.md` out. To keep it all local, add `.sb-context/` to the project's `.gitignore` |
| Project root | the folder with `nuxt.config.*`, or a `package.json` that depends on nuxt or vue, found from wherever a script starts |
| What the project is | `.sb-context/profile.json`: framework, kind (app or library), paths, styling, libraries. See [Project profile](#project-profile) |
| Which docs Claude follows | `.sb-context/docs.json`, and a managed block of `CLAUDE.md`. See [/sb-core:context](#context) |

The plugins never commit anything themselves. Outside a Nuxt or Vue project their scripts refuse to run.

### Requirements

| Need | Required by |
| --- | --- |
| Nuxt 4, or Vue 3 (with Vite) | everything; `/sb-core:setup` stops on Nuxt < 4 and Vue < 3 |
| An app (Nuxt, or Vue + Vite) | `sb-design` (its scripts refuse libraries and other stacks) |
| Tailwind 4 with `@tailwindcss/vite` | `sb-design` (stops on Tailwind 3: `tailwind.config.*`, `@tailwind`, `@nuxtjs/tailwindcss`, SCSS global CSS) |
| Color mode and fonts: `@nuxtjs/color-mode` and `@nuxt/fonts` (Nuxt); `@vueuse/core` and `@fontsource/*` (Vue + Vite) | `/sb-design:align` installs them if missing |
| `@nuxtjs/i18n` (Nuxt) or `vue-i18n` (Vue) | proposed when text is found inline (a write, with its own confirmation) |
| A Claude account with the design | `/sb-design:extract-style`, `/sb-design:extract-ui` (via the `Artifact` tool, read only) |
| GitHub CLI (`gh`), logged in | `/sb-github:admin`, `/sb-github:checks` |

---

## Skills at a glance

| Plugin | Command | Invocation | Purpose |
| --- | --- | --- | --- |
| sb-core | `/sb-core:onboard` | command only | Join a project in progress: stack, settings, align, migrate, build, next steps |
| sb-core | `/sb-core:setup` | model or command | Light setup on a project already in progress or aligned: `.sb-context/` folder, settings, state report, next steps |
| sb-core | `/sb-core:context` | model or command | Choose the official docs of the stack, at the project's versions: `docs.json` and a short block in `CLAUDE.md` |
| sb-core | `/sb-core:migration` | model or command | Move a project from sb-context-nuxt 0.x to 1.0: folder, file names, references |
| sb-design | `/sb-design:extract-style` | model or command | Extract the style of a Claude design into `.sb-context/design-source.md` |
| sb-design | `/sb-design:align` | model or command | Normalize the global style into four files; rename the prefix; sync values with the design |
| sb-design | `/sb-design:migrate` | command only | Migrate Vue templates after the global style changed |
| sb-design | `/sb-design:extract-ui` | model or command | Build a component, section, layout, page or whole design from Claude as code of the app (Nuxt, or Vue + Vite) |
| sb-design | `/sb-design:check` | model or command | Read-only: is the style aligned, and still in sync with the design snapshot? |
| sb-health | `/sb-health:lint` | model or command | ESLint fix and report |
| sb-health | `/sb-health:build` | model or command | Type check and production build, errors categorized; for a library, what the package ships |
| sb-health | `/sb-health:seo` | model or command | robots, sitemap, per-page meta |
| sb-health | `/sb-health:deps` | model or command | Outdated and vulnerable dependencies: minor/patch updates and major migrations (changelog, conflicts, notes) |
| sb-health | `/sb-health:docs` | model or command | Align `README.md` with the code of the project |
| sb-health | `/sb-health:checkup` | command only | All the checks above, aggregated |
| sb-github | `/sb-github:admin` | model or command | Connect to the repo, audit it, settings, rulesets, security, labels, PRs |
| sb-github | `/sb-github:checks` | model or command | PR title lint and required checks, aligned with release-please |

### Which skill do I need?

| I want to… | Use |
| --- | --- |
| Start working on an app I just joined (Nuxt, or Vue + Vite) | `/sb-core:onboard` |
| Use the plugins on a project that is already aligned | `/sb-core:setup` |
| Move a project from sb-context-nuxt 0.x | `/sb-core:migration` |
| Tell Claude which docs (and which versions) this project follows | `/sb-core:context` |
| Know if the style is aligned and in sync, without changing anything | `/sb-design:check` |
| Use the palette, fonts and radii of my design made in Claude | `/sb-design:extract-style`, then `/sb-design:align` |
| Reorganize a messy global CSS / theme / dark mode | `/sb-design:align` |
| Change the token prefix (`sb` → `ps`) | `/sb-design:align` (prefix rename) |
| Update the project after the design changed in Claude | `/sb-design:extract-style` (re-extract), then `/sb-design:align` (sync) |
| Update templates after the global style changed | `/sb-design:migrate` |
| Bring a component, a page or a layout from the Claude design | `/sb-design:extract-ui` |
| Know if the project is healthy before a release | `/sb-health:checkup` |
| Fix lint / see if the build passes | `/sb-health:lint` / `/sb-health:build` |
| Check that my library's package exports, types and peers are right | `/sb-health:build` |
| Check robots, sitemap, meta tags | `/sb-health:seo` |
| See outdated or vulnerable packages, update them, migrate a major | `/sb-health:deps` |
| Refresh the project README | `/sb-health:docs` |
| Connect the repo, set up rulesets, labels, open a PR | `/sb-github:admin` |
| Block merges with a wrong PR title | `/sb-github:checks` |

### Trigger phrases cheat sheet

Phrases below are the ones written in the skill descriptions (**listed**) or requests that match them (**matches**). English or Italian.

| Skill | Phrases that trigger it |
| --- | --- |
| `/sb-core:setup` | listed: "set up the plugin on this project", "the project is already aligned", "configura il plugin su questo progetto", "inizializza sb-context" |
| `/sb-design:extract-style` | matches: "extract the style from the design", "import the tokens / palette / typography from Claude", "take the colors from my design system", "importa lo stile dal design" |
| `/sb-design:align` | matches: "align / normalize / unify the global style", "reorganize the global CSS", "fix the theme", "dark mode setup", "change the prefix to ps", "sync the style with the design" |
| `/sb-design:extract-ui` | listed: "extract the Button component", "bring the Home page from the design", "build the main layout"; matches: "turn this Claude design into Nuxt code" |
| `/sb-health:lint` | listed: "check the lint", "is the project clean?", "check del lint" |
| `/sb-health:build` | listed: "check the build", "does the project build?", "check del build" |
| `/sb-health:seo` | listed: "check SEO", "check GSC readiness", "verifica la SEO" |
| `/sb-health:deps` | listed: "check dependencies", "update dependencies", "verifichiamo le dipendenze"; matches: "migrate to the new major", "update nuxt to the next major" |
| `/sb-health:docs` | listed: "update the documentation", "update the README", "aggiorna la documentazione" |
| `/sb-github:admin` | matches: "connect to the repo", "open a PR", "manage labels", "change branch protection / rulesets", "inspect repo settings" |
| `/sb-core:context` | listed: "set up the project docs", "which docs should Claude follow?", "add this link to the project docs", "imposta la documentazione del progetto", "aggiungi questo link alla documentazione" |
| `/sb-core:migration` | listed: "migrate to v1", "the project uses sb-context-nuxt", "migra il progetto alla v1", "aggiorna da sb-context-nuxt" |
| `/sb-design:check` | listed: "is the style aligned?", "check the design sync", "lo stile è allineato?", "controlla il design" |
| `/sb-github:checks` | matches: "add the PR title check", "require a status check", "align CI checks with release-please" |
| `/sb-core:onboard`, `/sb-design:migrate`, `/sb-health:checkup` | none: command only |

Tips for good triggering:

- Name the **thing** (global style, templates, dependencies, repo), not only the action.
- With a design, paste the **artifact link** or say the design's name: Claude lists the account's designs if you do not.
- For `/sb-design:extract-ui`, say **what** you want ("the Button", "the Home page", "the main layout", "all the screens"). If a word is ambiguous ("Home": component or page?), it asks.
- For `/sb-design:migrate`, give a path to limit the scope: `/sb-design:migrate app/pages`.

---

## Workflows

### Join a project in progress

```
/sb-core:onboard
```

`/sb-core:onboard` runs, in order: `/sb-core:setup` (stack check, `.sb-context/` folder, project settings) → (design snapshot) → `/sb-design:align` → `/sb-design:migrate` → build → next steps.

If the project is already aligned:

```
/sb-core:setup
```

It only prepares `.sb-context/`, asks the missing settings, checks that the style is really aligned (read-only) and lists the skills still worth running (`/sb-github:admin`, `/sb-github:checks`, `/sb-design:extract-style`…). Run it again any time: it asks only what is still unknown.

### Start from a design made in Claude

1. `/sb-design:extract-style <artifact link or design name>` writes `.sb-context/design-source.md`.
2. `/sb-design:align` asks the prefix (proposing the initials of the design's name), reports conflicts and writes the four files with the design's values.
3. `/sb-design:migrate` brings the templates in line.
4. `/sb-design:extract-ui <what>` brings in components and pages.

### The design changed in Claude

1. `/sb-design:extract-style` re-reads the design and rewrites the snapshot.
2. It then checks the project: aligned project → runs the sync flow of `/sb-design:align` (table of differences, contrast of changed colors, **Needs a decision** list, stop, then apply).
3. `/sb-design:migrate` if class names must follow.

`/sb-health:checkup` only compares the project with the snapshot **on disk**. To know whether the design changed on Claude, re-run `/sb-design:extract-style`.

### Bring a component or a page from the design

```
/sb-design:extract-ui the Button component
/sb-design:extract-ui the Home page
/sb-design:extract-ui the main layout
/sb-design:extract-ui all the screens
```

It checks that the style is current, checks what the project already has (replace, create new, name), plans, asks, builds with the project's tokens, verifies, reports. Details: [/sb-design:extract-ui](#extract-ui).

### Daily health check

```
/sb-health:checkup
```

Or one check at a time: "check the lint", "check the build", "check SEO", "check dependencies".

### Set up the GitHub side

1. `/sb-github:admin` (say "connect to the repo"): read-only audit, report of what is missing.
2. `/sb-github:checks`: adds the PR title lint through a branch and a PR, then makes it required.
3. Back to `/sb-github:admin` for rulesets, labels, security, PRs.

---

## Skill reference: sb-design

### extract-style

| | |
| --- | --- |
| **Command** | `/sb-design:extract-style [claude.ai artifact link, or the design's name]` |
| **Does** | Reads a **Design** or **Design System** artifact of the connected Claude account and saves every value (both themes, mobile sizes, radii, shadows, brand guide, component index, provenance, gaps) into `.sb-context/design-source.md` |
| **Reads** | the artifact (read only: never publishes, edits or deletes) |
| **Writes** | `.sb-context/design-source.md` (after your go-ahead) |
| **Then** | realigns the project: `/sb-design:align` if no global style yet, otherwise the sync flow |
| **Next** | `/sb-design:align`, `/sb-design:extract-ui` |

Good to know:

- The artifact stays the source of truth; `design-source.md` is the plugin's **own** snapshot, never Impeccable's `DESIGN.md`.
- **Complete or nothing**: a coverage check must pass; a snapshot that lost a token is not written.
- **A name is not a meaning**: if the roles of the design are not yet mapped (`roleMap.status: needs-confirmation`), nothing is compared or applied until `/sb-design:align` maps them with you.
- Overrides applied: eyebrows removed, breakpoints fixed, guard rails. Gaps are reported (no motion in the design, missing mobile values, colors without a matching role).
- If the Design System has `project/implementazione.md`, it is mentioned but **not applied**: structure belongs to this plugin.

### align

| | |
| --- | --- |
| **Command** | `/sb-design:align` |
| **Does** | Normalizes any global style setup into `main.css`, `theme.css`, `typography.css`, `animation.css` under `assets/css`, keeping the project's values (or the design's, if a snapshot exists) |
| **Reads** | the whole global style, the framework's files (`nuxt.config.ts`; or `src/main.ts`, `vite.config.ts`, `index.html`), `design-source.md` if present |
| **Writes** | the four files. Nuxt: `nuxt.config.ts` only in `modules`, `css`, `colorMode`, `fonts` (and `vite.plugins` for `@tailwindcss/vite` if missing); installs `@nuxtjs/color-mode` and `@nuxt/fonts` if missing. Vue + Vite: the style and Fontsource imports of `src/main.ts`, `@tailwindcss/vite` and the `@` alias in `vite.config.ts`, the inline theme script of `index.html`, the `useTheme` composable (VueUse `useColorMode`); installs `@vueuse/core` and the `@fontsource/*` packages if missing |
| **Never touches** | components, pages, layouts, `<style scoped>`, `<style module>` (only the optional prefix rename replaces the old prefix) |
| **Next** | `/sb-design:migrate` |

Questions at startup (skipped when the project is already aligned or the answer is in the settings):

| Question | Rules |
| --- | --- |
| **Prefix** (required) | 2–4 lowercase letters, starts with a letter, no hyphens, cannot match a Tailwind root (`p`, `m`, `w`, `h`, `bg`, `text`, `font`, `border`, `rounded`, `shadow`, `flex`, `grid`, `gap`, `ring`, `top`, `size`, `col`, `row`, `sr`, `dark`, `ease`, `animate`, `inset`, `space`, `divide`, `outline`, `fill`, `stroke`). Whatever you answer is the prefix. Saved once in `style.prefix`. |
| **Component impact analysis** (optional) | Lists component classes that will stop working once the theme is closed. Reads every file, costs more. Default: no. |

Three modes, chosen from the state of the project:

| Mode | When | Result |
| --- | --- | --- |
| **Full alignment** | style not in the fixed structure | inventory → report (blocking issues, conflicts, provisional values, things to decide) → confirmation → write → verify → summary |
| **Sync values with the design** | already aligned, `design-source.md` exists, `--check` found differences | table of differences (token, theme, now, design) → contrast of new color pairs → **Needs a decision** (new role, dropped role, changed family) → stop → apply values only |
| **Prefix rename** | you ask to change the prefix | replaces the old prefix only; structure and values untouched |

If the project is **already aligned** and values match, it says so and stops.

### migrate

| | |
| --- | --- |
| **Command** | `/sb-design:migrate [files or folders to analyze]` (command only) |
| **Does** | Reads Vue templates line by line, tag by tag, and proposes the refactor of component classes and styles to the new global style |
| **Flow** | scope (summary first, you pick the areas) → line-by-line analysis → proposal → confirmation → apply → verify → summary |
| **Needs** | a global style already aligned (`/sb-design:align`) |

### extract-ui

| | |
| --- | --- |
| **Command** | `/sb-design:extract-ui [what to extract] [optional artifact link]` |
| **Does** | Builds what you ask for from a Claude design as code of the app (Nuxt 4, or Vue 3 + Vite): Vue `<script setup lang="ts">`, Tailwind 4 with the project's own theme |
| **Needs** | style aligned **and in sync with the design** (step 0 checks it; otherwise it stops and runs `/sb-design:extract-style`) |
| **Reads** | the design (read only), the project, project settings |
| **Writes** | components, layouts, pages, locale files |

What a request becomes:

| You ask for | Destination (Nuxt) | Destination (Vue + Vite) | Source in the design |
| --- | --- | --- | --- |
| a **component** ("the Button", "the stepper") | `app/components/…` | `src/components/…` | Design System component folder, or an element of a board |
| a **section** ("the hero", "the FAQ", "the footer") | one or more components in `app/components/…` | one or more components in `src/components/…` | a board of a Design |
| a **layout** ("the main layout", "header and footer") | `app/layouts/<name>.vue` with `<slot />` | `src/layouts/<Name>Layout.vue` with `<RouterView />`; header, footer, navigation as components | the frame that surrounds `<main>` |
| a **page** ("the Home", "the form page") | `app/pages/<route>.vue` plus the components and layout it needs | `src/views/<Name>View.vue` and its route in the router | a board (desktop, mobile and dark variants are one screen) |
| **everything** ("the whole design") | one page per screen, one layout, the shared components | all boards of the Design |

Flow: style current? → project settings → input → find it in the design → plan with what the project already has → **ask** → build → verify → report. Several things in one request are split, shown as a plan, and built in order.

Text is never left inline: it goes to the locale files (see [The i18n stance](#the-i18n-stance)).

---

### check

| | |
| --- | --- |
| **Command** | `/sb-design:check` (or natural language) |
| **Does** | Read-only: runs the inventory (**Already aligned: yes/no**, with the failing checks) and, when `.sb-context/design-source.md` exists, `sync-values.mjs --check` (in sync, drift, mapping missing). Changes nothing |
| **Used by** | `/sb-core:setup` and `/sb-health:checkup`, so they never reach into this plugin's scripts |

## Skill reference: sb-core

### onboard

| | |
| --- | --- |
| **Command** | `/sb-core:onboard` (command only) |
| **Does** | Joins a project in progress. Does no work itself: runs the steps in order and stops at every confirmation |

| Step | What |
| --- | --- |
| 1. Setup | runs [`/sb-core:setup`](#setup): stack (**stops** on Nuxt < 4 or Vue < 3), `CLAUDE.md` rules, `.sb-context/` folder, all missing project settings in one go |
| 2. Align | asks for a design link first if you have one and there is no snapshot, then `/sb-design:align` |
| 3. Migrate | `/sb-design:migrate`: summary, then the areas you pick |
| 4. Build | `/sb-health:build` (or the project's `build` script without sb-health); reports errors and warnings |
| 5. Next steps | recommendations only: Impeccable, `/sb-github:admin`, `/sb-github:checks`, `/sb-health:checkup` |

### setup

| | |
| --- | --- |
| **Command** | `/sb-core:setup` (or natural language) |
| **Does** | The way into any project: learns what it is, turns on only the plugins it needs, settles the project settings. No style, template, build or GitHub work. Safe to run again |
| **Writes** | `.sb-context/` (the folder, its `.gitignore`, `profile.json`, `settings.json`); `.claude/settings.local.json` only to turn plugins off or on for this project, after your yes |

| Step | What |
| --- | --- |
| 1. Profile | `profile.mjs detect`: framework, kind, rendering, paths, styling. Asks the **type of project** (app or library) once, plus what the files cannot tell; **stops** on Nuxt < 4 or Vue < 3 |
| 2. Folder | `setup-state.mjs --init`: creates `.sb-context/` and its `.gitignore`, reads the state of the project |
| 3. Plugins and skills | `project-plugins.mjs plan`: which plugins this project needs and why (e.g. no `sb-design` on a library), the install command for the missing ones, and, on your yes, the unneeded ones turned off **for this project only** |
| 4. Project settings | `project-settings.mjs detect`, only the questions that apply to this project, all together |
| 5. Style check | when sb-design applies and the four files exist, `/sb-design:check` (read-only) |
| 6. Report | profile, plugins, settings, style, design snapshot, GitHub, dependency notes, docs; the skills for this project and the next steps, as recommendations |

### context

| | |
| --- | --- |
| **Command** | `/sb-core:context` (or natural language) |
| **Does** | Chooses with you the official docs of the project's stack, at the versions it uses, and points every session to them |
| **Reads** | the profile and the dependencies (installed versions included), the catalog of official docs the plugins know, the links you give (opened and summarized) |
| **Writes** | `.sb-context/docs.json`; the block between `<!-- sb-context:docs:start -->` and `<!-- sb-context:docs:end -->` in `CLAUDE.md`, after showing it (the file is created only if you say yes). Nothing outside the markers |

| Step | What |
| --- | --- |
| 1. Project | `docs.mjs detect`: one line on what the project is, the packages the catalog knows with the major the project uses and the one the docs document, the proposals, the dependencies the catalog does not know |
| 2. Versions | for a package the project is **behind** on, asks whether to follow the docs of its major (recommended) or the latest; the latest everywhere else |
| 3. Links | the proposals by package: you drop what you do not want and add your own links, which are opened and summarized ("covers X, Y, Z; version N") before you decide |
| 4. Save | `docs.mjs add`, `remove`, `set`: only `docs.json` |
| 5. CLAUDE.md | `docs.mjs render` shows the block and what would change; `render --write` after your yes |

Every skill that needs the docs reads the project's links first (`docs.mjs get --for sb-design:extract-ui`); without `docs.json` it falls back on the catalog's links for the stack. `/sb-core:setup` recommends this skill until the project has its links. Format: [core/references/docs.md](core/references/docs.md).

### migration

| | |
| --- | --- |
| **Command** | `/sb-core:migration` (or natural language) |
| **Does** | Moves a project set up with sb-context-nuxt 0.x to 1.0. Plan first, then two separate approvals |
| **Writes** | `.sb-context/` (files moved from `.sb-context-nuxt/`, its `.gitignore`), the `.sb-context-nuxt/` line removed from `.git/info/exclude`; with your approval, the old commands and plugin id in the project's docs and Claude settings (`CLAUDE.md`, `.claude/settings.json`…), never in source code |

| Step | What |
| --- | --- |
| 1. Plan | `migrate-v1.mjs`: files to move (and rename), the exclude line, the references found. A file `.sb-context/` already has is a **conflict**: nothing is written until you choose |
| 2. Apply | `--apply` (folder) and `--apply --refs` (also the references) |
| 3. Plugins | the commands to run yourself if the plugin was not moved to the bundle automatically |
| 4. Check | `/sb-core:setup` on the migrated project |

## Skill reference: sb-health

### checkup

| | |
| --- | --- |
| **Command** | `/sb-health:checkup` (command only) |
| **Does** | Runs the whole routine and aggregates the result |

| # | Check | Notes |
| --- | --- | --- |
| 1 | `/sb-health:deps` | minor/patch only; reports the open dependency notes |
| 2 | `/sb-health:seo` | |
| 3 | Global style and design sync | `/sb-design:check`, only if sb-design is installed: not aligned or drift is reported and `/sb-design:align` proposed |
| 4 | Inline text | `check-i18n.mjs` on pages, components, layouts; skipped if `i18n.enabled: false`; findings are **warnings** with file and line |
| 5 | `/sb-health:build` | |
| 6 | `/sb-health:lint` | |
| 7 | Blockers | build errors or lint errors that cannot be auto-fixed: **stops**, lists each, asks you to fix and re-run |
| 8 | `/sb-health:docs` | only if the README needs it (new dependency, component, page, composable, config change) |
| 9 | Summary | dependencies, SEO, design sync, inline text, build, lint, docs, overall result |

### lint

| | |
| --- | --- |
| **Trigger** | "check the lint", "is the project clean?", "check del lint" |
| **Does** | `lint:fix` (fallback `npx eslint . --fix`), then `lint`; remaining diagnostics split into **warnings** (non-blocking) and **errors** (blocking, listed for manual review) |
| **Never** | silences an issue with `// eslint-disable` |
| **Reports** | files auto-fixed, remaining warnings, remaining errors |

### build

| | |
| --- | --- |
| **Trigger** | "check the build", "does the project build?", "does the library build?", "check del build" |
| **Does** | Type check (`npx nuxt typecheck` for Nuxt; the project's script or `vue-tsc` for Vue, never `tsc` alone, which skips `.vue` files) then production build; package manager from the profile |
| **Categories** | **TypeScript errors** (type safety), **Build errors** (blocking: TypeScript, Vite, Rollup, Nitro, module not found, SSR), **Package errors** of a library (blocking a release), **Warnings** (non-blocking) |
| **A library** | after the build, `npm pack --dry-run --json` piped into `lib-check.mjs --pack -`: every path of `exports` / `main` / `module` / `types` in the package and `.d.ts` files shipped (L1), a `files` field (L2), a `types` condition, first (L3, L4), `vue` and Vue-coupled packages as peers, not dependencies (L5, L6), every peer in `devDependencies` on an allowed major (L7), peer ranges with an upper bound (L8), peers left out of the bundle (L9), `sideEffects` and CSS (L10). Writes nothing |
| **On failure** | suggests a fix direction, does not auto-apply it |

### seo

| | |
| --- | --- |
| **Trigger** | "check SEO", "check GSC readiness", "verifica la SEO" |
| **Does** | Audits readiness for Google Search Console: Nuxt apps, and Vue + Vite apps generated at build time (`vite-ssg`, whose generated HTML is checked for its meta). Stops on libraries and client-rendered apps |
| **Asks** | only what is missing: multilingual or not, locales, production URL |

| Check | Expected |
| --- | --- |
| robots | production: `Allow: /` and a `Sitemap:` on the production domain (not `localhost`); previews: `Disallow: /` |
| Sitemap | valid XML, `<loc>` on the production domain, `<xhtml:link>` alternates per locale with `x-default`, hreflang matching `i18n.locales[].iso`, all indexable routes |
| Placeholders | no `yoursite.com`, `Your Site Name`, `example.com` left in config, `.env`, `.env.example` |
| Per-page meta | each page has `title`, `description`, `ogTitle`, `ogDescription`, `ogImage` through i18n; pages without a head call are flagged |
| Inline meta | `check-i18n.mjs` on the pages folder (`app/pages`, `src/views`); hits are warnings on multilingual sites |

Report: per check, blockers vs warnings vs OK.

### deps

| | |
| --- | --- |
| **Trigger** | "check dependencies", "update dependencies", "migrate to the new major", "verifichiamo le dipendenze" |
| **Does** | Lists outdated packages, updates minor/patch, migrates majors like a migration manager, audits vulnerabilities |
| **Lists first** | scans and shows **every** available update **grouped** into Major / Minor / Patch, one table per group: package, **current** (installed) → **new**, and dependency type |
| **Asks only if there is a choice** | nothing outdated: no question. Only minor/patch: no question, it updates. Majors **and** minor/patch: everything, only minor/patch (default), or pick the majors. Only majors: all, pick, or leave them. Skipped if your request already says it |
| **Branch** | follows the install policy of the project's `CLAUDE.md`; otherwise a dedicated `chore/deps-<date>` branch, never `main` |
| **Writes** | `package.json`, lockfile, project files of an approved migration plan, `.sb-context/dependency-notes.json` |

Rules:

- **Forward only.** Never downgrades a package, never lowers a constraint, never `--force` / `--legacy-peer-deps` / `npm audit fix --force`, never an `overrides` entry that pins an old version to make a new one fit. What does not fit **waits**, and is noted.
- `0.y.z` → `0.(y+1).z` counts as a major.
- One major at a time, core first (`nuxt` or `vue`, `vite`, `tailwindcss`), verified before the next.
- A library's **peer ranges** are its public contract: a peer with a new major is tested through the `devDependency`, then you choose to **widen** the range (`^1 || ^2`, a minor release of the library) or **move** it (`^2`, a major release). A peer is never moved into `dependencies`.

Minor and patch: same major as the declared constraint. The changelog is checked first; if a concern shows up, the package is handled as a major.

Major, per package:

| Step | What happens |
| --- | --- |
| **Read** | release notes of **every** major between current and target (GitHub releases, `CHANGELOG.md`, migration guide): breaking changes, new requirements (Node, peers), deprecations turned into removals |
| **Match** | searches the project for each change (imports, the framework's config, module and plugin options, templates, scripts) and builds a table: change, used here?, where, what must change. "Not used" is a finding, not an assumption |
| **Check compatibility** | peers of the target, dependents that still list the old range, install dry run, Node `engines` |
| **Judge each conflict** | who owns it (`project` or `upstream`), how much it matters (blocks install / breaks build or runtime / warning only), is it already fixed in a newer version of the other library, what is the way forward (update both, change our code, **wait**, ask you) |
| **Propose** | release notes in short, exact edits (file, line, before → after), conflicts, order, what is postponed. **Stops** for your approval (all, part, or postpone) |
| **Apply and verify** | edits, install, `/sb-health:build`, `/sb-health:lint` (and tests if any); only new failures count. If it cannot be fixed inside the plan it stops, does not downgrade, and asks before discarding the attempt |

Dependency notes (`.sb-context/dependency-notes.json`): everything postponed or blocked is written there, so the next run remembers.

| Field | Meaning |
| --- | --- |
| `status` | `deferred` (waits for something outside the project, or a later decision), `watching` (could move soon), `resolved` (history) |
| `blockedBy` | package, range, and **owner**: `upstream` (another library must release a fix) or `project` (our code, constraint or choice must change) |
| `recheck` | the concrete thing to verify next time, e.g. "does `@nuxtjs/sitemap@latest` accept `vue-router@^5`?" |

At the start of every run the skill lists the open notes and re-verifies each one before scanning: blocker gone → offers the migration; still blocked → notes what it checked; `project`-owned → reminds you. `/sb-health:checkup` runs minor/patch only and reports the open notes.

Vulnerabilities: `npm audit`, `npm audit fix` for what is in range; a fix that needs a major is handled as a major, and if it cannot be done now it is noted with advisory, severity and owner.

### docs

| | |
| --- | --- |
| **Trigger** | "update the documentation", "update the README", "aggiorna la documentazione" |
| **Does** | Compares the **project's** `README.md` with its code (components, composables, pages, config, versions, commands, links) and edits only the affected sections, in English |
| **Never** | rewrites the README wholesale unless asked; invents information (unverifiable details are marked TBD) |

---

## Skill reference: sb-github

### admin

| | |
| --- | --- |
| **Command** | `/sb-github:admin` |
| **Does** | Manages the GitHub side with the GitHub CLI |
| **Say** | "connect to the repo", "open a PR", "manage labels", "change branch protection", "inspect repo settings" |

Branch model it enforces:

| Branch | Role | Rules |
| --- | --- | --- |
| `main` | only long-lived branch; tags and releases (release-please) | PR only, no direct push, no force push, no deletion |
| `feat/*`, `fix/*`, `chore/*` | short-lived, one per task (dependency upgrades included) | none; PR into `main`, delete after merge |

What "set up" means:

| Area | Target |
| --- | --- |
| Repo settings | squash merge only, PR title + body as squash message, delete branch on merge, auto-merge optional |
| Branch rules | ruleset `main-protected` |
| Required checks | the real CI job names, including `lint-pr-title` once `/sb-github:checks` is applied |
| Labels | the set in `labels/labels.json`, including the release-please `autorelease:*` labels |
| Security | secret scanning + push protection, Dependabot alerts and security updates, no secrets in workflows |
| Release | `release-please` workflow and config present, PR titles linted |

Recipes: **Init** (connect and audit, read only), **Inspect**, **Repo settings**, **Rulesets**, **Labels**, **Branch and repo security**, **Open PRs**, **Release check**.

Rules of engagement:

- Read-only commands run freely; known facts come from `.sb-context/github.json` first.
- **After every write** (labels, rulesets, settings) it re-reads the remote and refreshes the matching key of `github.json`; anything that changed beyond what was applied is reported.
- **Asks before** any write to the remote, showing the exact command.
- Never bypasses a ruleset (no `--admin` merges) unless you ask explicitly.
- Never prints or stores tokens; secrets are listed by name only.
- Not logged in? It suggests `! gh auth login` (or `! gh auth refresh -s repo`) so it runs in the session.
- **Signature**: commits and PR descriptions are **not signed** (no `Co-Authored-By`, no "Generated with…", no mention of Claude) unless `signature.enabled` is `true` in `.sb-context/github.json`, with the exact name to sign with.

### checks

| | |
| --- | --- |
| **Command** | `/sb-github:checks` |
| **Does** | Creates the base GitHub Actions checks and makes them **required** for merging into `main`. Today: the PR title lint |
| **Why** | with squash merge the PR title becomes the commit on `main`, and release-please reads it to choose the version bump and the tag |
| **Job name** | `lint-pr-title` (`amannn/action-semantic-pull-request`, on `opened`, `reopened`, `edited`, `synchronize` PRs into `main`) |

Flow: read the project → adapt and add the workflow (through a branch and a PR, never a direct push) → make it required **after the workflow is on `main`** → verify.

It shares `github.json` with `/sb-github:admin`: once the workflow is merged and the check is required, it refreshes `ci` and `rulesets` in the cache.

---

## Project profile

What the project **is**, in `.sb-context/profile.json`: detected from its files every time, confirmed by you once. Every skill and script reads it instead of assuming a Nuxt layout. The settings below are your **choices**; the profile holds the **facts**.

| Key | Example (Nuxt app) | Example (Vue library) |
| --- | --- | --- |
| `framework`, `bundler` | `nuxt 4`, `vite` | `vue 3`, `vite 7` |
| `adapter` | `nuxt` | `vue-vite` |
| `kind`, `rendering` | `app`, `ssr` | `library`, `null` |
| `paths.src`, `paths.styles` | `app`, `app/assets/css` | `src`, `src/assets/css` |
| `entries` | config `nuxt.config.ts`, css `nuxt.config.ts` | config `vite.config.ts`, lib `src/index.ts` |
| `styling.engine` | `tailwind4` via `@tailwindcss/vite` | `null` |
| `features` | router `nuxt`, i18n `@nuxtjs/i18n` | typecheck `vue-tsc` |
| `library` | `null` | name, formats, types, peers |

- **Re-detected on every read**: a moved folder or a new dependency shows up by itself.
- **Confirmed values win**: what you confirm or correct (`profile.mjs set kind '"library"'`) is listed in `confirmed` and never overwritten by a detection.
- **Drift is asked**: when the files contradict a confirmed value, `/sb-core:setup` asks which one is right.

All the keys: [core/references/profile.md](core/references/profile.md).

## Project settings

How the user wants **this project** built, asked **once** and saved in `.sb-context/settings.json`. Skills ask only what is missing and only when it matters, with the detected value as the recommended answer. A setting changes only when you ask ("add German", "stop using the Base prefix").

Skills that use it: `/sb-core:setup` and `/sb-core:onboard` (ask everything missing in one go), `/sb-design:extract-ui`, `/sb-design:align` (prefix), `/sb-health:seo` (i18n, site URL).

### Keys

| Key | Meaning | Detected from |
| --- | --- | --- |
| `i18n.enabled` | all user-visible text goes through i18n | `@nuxtjs/i18n` (Nuxt) or `vue-i18n` (Vue) in modules/deps |
| `i18n.defaultLocale` | language of the design's text and the default locale file | `defaultLocale` in `nuxt.config`, or `locale` of `createI18n` |
| `i18n.locales` | supported locales (`["it","en"]`) | `locales` in `nuxt.config`, the `messages` of `createI18n`, locale files |
| `i18n.otherLocales` | non-default locales: `"translate"` (written, marked to review) or `"fallback"` (empty, falls back) | asked |
| `i18n.messagesDir` | where the locale files live | `i18n/locales`, `locales`, `src/locales`, `src/i18n/locales`, `langDir` |
| `i18n.keyStyle` | key organization, e.g. `pages.home.hero.title` | existing locale files |
| `i18n.untranslated` | words that stay as they are (brand names) | asked when the design has them |
| `icons.module` | `"@nuxt/icon"`, `"unplugin-icons"`, `"@iconify/vue"` or `null` (inline SVG) | modules, dependencies |
| `images.module` | `"@nuxt/image"` or `null` | modules |
| `style.prefix` | prefix of the global style tokens and utilities | `--<p>-bg` in `theme.css` |
| `seo.siteUrl` | production URL for robots, sitemap, canonical | `siteUrl`/`baseUrl` in the framework's config, `SITE_URL` in `.env.production` / `.env` |
| `stack.packageManager` | only when there is no lockfile | lockfile |
| `naming.componentPrefix` | prefix of shared components: `"Base"`, `"App"`, `"Ui"`, `"none"` | most common prefix in `components/` |

A missing key means "unknown", not "no". If the project contradicts the file (module removed, folder moved), the skill says so and asks which is right.

### The i18n stance

The plugin **never leaves user-visible text inline**: templates, `alt`, `aria-label`, `placeholder`, `title` and SEO meta included.

| Situation | What happens |
| --- | --- |
| `@nuxtjs/i18n` (Nuxt) or `vue-i18n` (Vue) installed | used, with the saved locales and key style |
| Not installed | it proposes setting it up (the exact command and files are shown, you confirm) |
| You decline | `i18n.enabled: false`; text still stays **out of templates**, in a typed content module (`app/content/<name>.ts`, `src/content/<name>.ts` in Vue), movable to i18n later |
| Sample data in a design (names, dates in a preview) | becomes props, slots or sample data, not message keys |

Checked by `scripts/check-i18n.mjs`.

---

## The global style

### Three layers

sb-design writes its rules in three layers, so a new stack only adds an adapter:

| Layer | Folder | Holds | Today |
| --- | --- | --- | --- |
| **standard** | [`plugins/sb-design/standard/`](plugins/sb-design/standard/README.md) | what is fixed on every stack: the four files, roles, guard rails, breakpoints, `clamp()`, contrast, motion, the issue codes | one |
| **engine** | [`plugins/sb-design/engines/<name>/`](plugins/sb-design/engines/tailwind4/README.md) | how the standard becomes CSS: tokens, resets, utilities, the example files | `tailwind4` |
| **framework** | [`plugins/sb-design/frameworks/<adapter>.md`](plugins/sb-design/frameworks/nuxt.md), with its script adapter in `plugins/sb-design/scripts/lib/frameworks/` | where the style lives, how it is registered, color mode, fonts, how UI is written | `nuxt`, `vue-vite` |

The engine is the profile's `styling.engine.name`, the framework its `adapter`. A project whose engine or adapter has no file yet is out of scope: the skills say which one is missing and stop.

### The four files

All under `<srcDir>/assets/css/`:

| File | Content |
| --- | --- |
| `main.css` | the only style file registered (Nuxt: `css` of `nuxt.config.ts`; Vue + Vite: imported by `src/main.ts`): imports the other three, the `dark` variant on `data-theme`, base layer for `html` / `body` / media |
| `theme.css` | color tokens for light and dark, radii, shadows, `@theme inline` and `@theme` |
| `typography.css` | font families, type scale, the `{p}-<role>` text utilities, mobile sizes, `clamp()` above `display` only, base layer for `h1`–`h4` |
| `animation.css` | durations, easings, animations, Vue transitions, `prefers-reduced-motion` |

`{p}` is the prefix you chose: raw variables `--{p}-bg`, utilities `{p}-h1`, `{p}-body`, `{p}-overline`, `{p}-transition`. Tailwind tokens keep the role name (`--color-primary` → `bg-primary`, `--text-h1` → `text-h1`). The reference structure is in `plugins/sb-design/engines/tailwind4/example/` (values are the example's, not yours); the rules are in `plugins/sb-design/standard/`, and what is specific to each stack in `plugins/sb-design/frameworks/nuxt.md` and `plugins/sb-design/frameworks/vue-vite.md`.

### What is fixed and what follows the design

| Concern | Owner | Rule |
| --- | --- | --- |
| **Structure**: the four files and their sections, token naming, the `{p}` prefix, role names, closed Tailwind namespaces, `@theme` vs `@theme inline`, utilities `{p}-<role>`, base layer for `h1`–`h4`, light/dark with `data-theme`, the framework's color mode and fonts (`@nuxtjs/color-mode` and `@nuxt/fonts`; VueUse `useColorMode` with an inline script, and Fontsource), breakpoints, `clamp()` only above `display` | **this plugin** | fixed, always enforced |
| **Values and taste**: palette, font families and pairing, type ratios, line heights, letter spacing, weights, radii and shadow values, motion timings and character, how roles are used on a page | **`design-source.md`**, else the project | if `.sb-context/design-source.md` exists, its values win; otherwise the project's current values are kept, normalized |

### Hard rules

- **No eyebrows, ever.** `overline` is for badges, tags, counters, table headers and metadata, never a kicker above a heading, even if the design documents one.
- Breakpoints are fixed.
- 16px floor for running text and inputs.
- The skill never judges the design: it fixes the structure.

---

## Project files and scripts

### The .sb-context folder

At the project root, shared by all the plugins. It can be committed with the project: its own `.gitignore` keeps out the files that are personal or throwaway (`github.json`, `*.prev.md`). To keep the whole folder local, add `.sb-context/` to the project's `.gitignore`: the plugins never change that file.

| File | Written by | Content | In git |
| --- | --- | --- | --- |
| `profile.json` | `/sb-core:setup` (`profile.mjs set`, `write`) | what the project is: the [profile](#project-profile) | yes |
| `settings.json` | `/sb-core:setup` (and `/sb-core:onboard` through it), any skill that needs a setting | the [keys](#keys) above | yes |
| `docs.json` | `/sb-core:context` | the documentation links of the project: url, title, version documented, summary, which skill opens them | yes |
| `design-source.md` | `/sb-design:extract-style` | snapshot of the Claude design: values, brand guide, component index, provenance, gaps, machine block | yes |
| `design-source.prev.md` | `/sb-design:extract-style` | the previous snapshot, kept on re-extraction | no |
| `design-applied.json`, `design-map.json` | `/sb-design:align` | which version of the snapshot is applied; the confirmed role mapping | yes |
| `dependency-notes.json` | `/sb-health:deps` | what was postponed or blocked (package, target, blockers with owner, what to recheck) | yes |
| `github.json` | `/sb-github:admin`, `/sb-github:checks` | signature settings (personal) and the cache of what is known about the repo, refreshed after every write to the remote | no |

### Scripts

Skills call these; you rarely run them by hand. Paths are relative to the repo: `core/` is copied into every plugin as `plugins/<plugin>/core/`.

| Script | Used by | Purpose |
| --- | --- | --- |
| `core/scripts/project-settings.mjs` (`detect`, `get`, `set`) | most skills | read and save project settings |
| `plugins/sb-health/scripts/dependency-notes.mjs` (`list`, `add`, `touch`, `resolve`) | `/sb-health:deps` | read and write the dependency notes |
| `plugins/sb-health/scripts/lib-check.mjs` (`--pack`, `--json`) | `/sb-health:build` | a library's package against its `package.json`: exports, types, peers, bundle externals |
| `core/scripts/docs.mjs` (`detect`, `get`, `add`, `remove`, `set`, `render`) | `/sb-core:context`, every skill that opens the stack's docs | propose, save and read the project's documentation links; write the `CLAUDE.md` block |
| `core/scripts/profile.mjs` (`detect`, `get`, `set`, `write`) | `/sb-core:setup`, the skills that check the stack | detect, read and confirm the project profile |
| `plugins/sb-core/scripts/project-plugins.mjs` (`plan`, `disable`, `enable`, `reset`) | `/sb-core:setup` | which plugins the project needs; turns them off or on in `.claude/settings.local.json` |
| `plugins/sb-core/scripts/setup-state.mjs` (`--init`) | `/sb-core:setup` | state of the project for the plugins and next steps; `--init` creates the folder |
| `plugins/sb-github/scripts/github-settings.mjs` (`get`, `status`, `set`, `refresh`) | `/sb-github:admin`, `/sb-github:checks` | read and write the signature choice and the repo cache; `refresh` prints what changed |
| `core/scripts/check-i18n.mjs` | `/sb-health:checkup`, `/sb-health:seo`, `/sb-design:extract-ui` | find inline text and missing keys in the default locale |
| `core/lib/project.mjs` | all scripts | find the project root and `srcDir`, the `.sb-context/` folder |
| `plugins/sb-design/scripts/lib/frameworks/` | the sb-design scripts | the adapter of each stack (`nuxt`, `vue-vite`): where the style is registered, aliases, color mode, fonts |
| `plugins/sb-core/scripts/migrate-v1.mjs` (`--apply`, `--refs`) | `/sb-core:migration` | plan and apply the move from 0.x |
| `plugins/sb-design/skills/extract-style/scripts/tokens-to-source.mjs` | `/sb-design:extract-style` | convert the artifact's tokens into the snapshot, with coverage check |
| `plugins/sb-design/skills/align/scripts/inventory.mjs` | `/sb-design:align` | inventory of the global style (`--classes` for component impact) |
| `plugins/sb-design/skills/align/scripts/sync-values.mjs` | `/sb-design:align`, `/sb-design:extract-style`, `/sb-design:check` | compare and apply values from the snapshot |
| `plugins/sb-design/skills/align/scripts/contrast.mjs` | `/sb-design:align` | contrast of color pairs |
| `plugins/sb-design/skills/align/scripts/rename-prefix.mjs` | `/sb-design:align` | prefix rename |
| `plugins/sb-design/skills/migrate/scripts/template.mjs` | `/sb-design:migrate` | template summary and line-by-line analysis |

`sync-values.mjs` options: no flag prints the table and writes nothing; `--check` for the exit code; `--apply` writes changed values, refreshes the px comments and records the applied version; `--record` only records "snapshot applied" (after a full `/sb-design:align` write); `--map design.name=role …` saves the role mapping (`=null` for a name with no role).

### Exit codes of sync-values

| Code | Meaning | What to do |
| --- | --- | --- |
| `0` | style matches the snapshot | nothing |
| `10` | drift: the design changed or the style never got its values | run the sync flow of `/sb-design:align` |
| `3` | no snapshot (`.sb-context/design-source.md`), or no aligned style (`theme.css` / `typography.css` missing) | run `/sb-design:extract-style`, or `/sb-design:align` first |
| `4` | role mapping missing or inconsistent | agree the mapping in `/sb-design:align`, then repeat |

---

## Impeccable (design quality)

[Impeccable](https://github.com/pbakaus/impeccable) (`impeccable@impeccable`) owns design values and taste: critique, polish, color, typography, motion. It is **optional** and **not connected** to this plugin: no dependency, no shared files. This plugin never reads or writes its `DESIGN.md`.

```
/plugin marketplace add https://github.com/pbakaus/impeccable.git
/plugin install impeccable@impeccable
```

After alignment: `/impeccable document` records the aligned system in `DESIGN.md`, then `/impeccable critique` and `/impeccable polish` improve it.

---

## Troubleshooting and FAQ

| Problem | Cause and fix |
| --- | --- |
| "The skill stops: Tailwind 3 / Nuxt 3 / Vue 2" | style skills require Nuxt 4 or Vue 3 + Vite 5.2+, and Tailwind 4 with `@tailwindcss/vite`. No adaptation: upgrade first. |
| A script says the project was set up with sb-context-nuxt 0.x | run `/sb-core:migration`: it moves `.sb-context-nuxt/` to `.sb-context/`. |
| A step says a plugin is not installed | the skill needs another plugin of the marketplace: `/plugin install <plugin>@sb-context-fe`, or the bundle `sb-context-fe`. |
| A script says it is not in a Nuxt or Vue project | it looks upward for `nuxt.config.*` or a `package.json` that depends on nuxt or vue; run Claude Code inside the project. |
| An sb-design script says it supports nuxt, vue-vite projects for now | sb-design has no adapter for this stack (Vue without Vite, another framework), or the project is a library. `/sb-core:setup` can turn sb-design off for this project. |
| The profile says the wrong kind or folder | correct it once: `/sb-core:setup` asks, or `profile.mjs set kind '"app"'`. A confirmed value is never overwritten. |
| `/sb-design:extract-ui` refuses to start | the style is not aligned or not in sync with the design. Run `/sb-design:extract-style` (it realigns) or `/sb-design:align`. |
| `sync-values.mjs --check` exits `4` | the design's role names are not mapped to plugin roles. `/sb-design:align` maps them with you. |
| `sync-values.mjs --check` exits `10` | values differ from the snapshot: run the sync flow, review the table, confirm. |
| I said "full checkup" and nothing happened | `/sb-health:checkup` is command only. Type `/sb-health:checkup`. |
| The design changed but `/sb-health:checkup` shows no drift | it compares with the snapshot on disk. Re-run `/sb-design:extract-style` first. |
| It asks again for something I answered | answers live in `.sb-context/settings.json`; if the file was deleted or the project contradicts it, it asks. |
| `gh` cannot write rulesets or labels | needs `ADMIN` (labels: `WRITE`). The audit reports what the account can do. |
| Where is the prefix used? | `--{p}-*` variables and `{p}-<role>` utilities. Change it with "change the prefix to xx" in `/sb-design:align`. |
| The project is aligned but `.sb-context/` does not exist | nothing was saved yet. Run `/sb-core:setup`: it creates the folder and asks the settings once. |
| Can I commit `.sb-context/`? | yes: settings, snapshot and notes travel with the project; `github.json` and `*.prev.md` stay out through the folder's `.gitignore`. To keep it all local, add `.sb-context/` to your `.gitignore`. |
| Do the plugins fix my design? | no. Use Impeccable. |

---

## Reliability

A skill is instructions for a model: how well it is followed depends on the model and cannot be pinned by a test. What the skills **compute** can. Every algorithm they rely on lives in a script, and those scripts are covered by a test suite that runs on Node 22 and 24:

| Layer | What it guarantees |
| --- | --- |
| Unit | color parsing, OKLCH and WCAG contrast; CSS variables per theme; value normalizers and in-place rewrites of the style; prefix rules; type scale and size clusters; class anatomy and nearest theme roles; design role maps; i18n heuristics; dependency notes; project settings |
| CLI | every script run end to end on a throwaway Nuxt project: exit codes, JSON output, files written, `--apply` idempotent; read-only commands change no file and writing ones touch only what they declare |
| Contract | no script imports a network or process module; Claude Code's own `claude plugin validate --strict` on the marketplace and every plugin; every script path a `SKILL.md` points to exists **inside its own plugin**, every `/<plugin>:<skill>` names a real skill, every plugin's copy of `core/` is up to date, shared helpers are identical in every skill that ships them, manifests and docs agree with the code |

The badges at the top are measured on `main` after every merge: line and branch coverage of the scripts the skills run (`core/` and `plugins/*/`). Every pull request that produces a release (`feat`, `fix`, `perf`, `revert`, breaking changes) must pass the suite before it can be merged.

Run it locally with `npm ci && npm test`; [CONTRIBUTING.md](CONTRIBUTING.md#tests) explains the layers and how to add tests.

---

## Contributing and releases

`main` is protected: every change goes through a pull request, merged with **squash**. The PR title is a conventional-commit title (`feat`, `fix`, `docs`, …) and release-please reads it to choose the next version, the tag and the changelog; the `lint-pr-title` check blocks the merge when it is wrong, and `tests-gate` blocks a releasing PR whose tests fail. A change to what a skill **does** (`plugins/**`, `core/**`) is a `feat` or a `fix`. Each plugin is released on its own, with its own version, changelog and tag (`sb-design-v1.2.0`). Full rules: [CONTRIBUTING.md](CONTRIBUTING.md).
