# sb-context-nuxt

[![Tests](https://github.com/stefanBid/sb-context-nuxt/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/stefanBid/sb-context-nuxt/actions/workflows/tests.yml?query=branch%3Amain)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FstefanBid%2Fsb-context-nuxt%2Fbadges%2Fcoverage.json)](#reliability)
[![Branch coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FstefanBid%2Fsb-context-nuxt%2Fbadges%2Fcoverage-branches.json)](#reliability)

Claude Code plugin for **Nuxt 4 + Tailwind 4 projects already in progress**. This README is the user guide: every skill, when to use it, what to say to trigger it, what it reads and writes.

It does two things:

1. **Aligns** the project to one fixed way of organizing the global style, normalizing whatever divergent setup it finds, optionally taking the values from a design made in Claude.
2. **Maintains** the project with a precise, repeatable way of working: template migration, UI extraction from a design, health checks, GitHub management.

It does **not** judge or improve the design. That is the job of [Impeccable](#impeccable-design-quality), a separate plugin. The two are not connected.

---

## Table of contents

- [Quick start](#quick-start)
  - [Install](#install)
  - [Update](#update)
  - [First run on a project](#first-run-on-a-project)
- [How the plugin works](#how-the-plugin-works)
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
- [Skill reference: style](#skill-reference-style)
  - [design-extract-style](#design-extract-style)
  - [style-align](#style-align)
  - [style-migrate](#style-migrate)
  - [design-extract-ui](#design-extract-ui)
- [Skill reference: onboarding and checks](#skill-reference-onboarding-and-checks)
  - [onboard](#onboard)
  - [full-checkup](#full-checkup)
  - [lint-check](#lint-check)
  - [build-check](#build-check)
  - [seo-check](#seo-check)
  - [dependency-check](#dependency-check)
  - [docs-update](#docs-update)
- [Skill reference: GitHub](#skill-reference-github)
  - [gh-admin](#gh-admin)
  - [gh-checks](#gh-checks)
- [Project settings](#project-settings)
  - [Keys](#keys)
  - [The i18n stance](#the-i18n-stance)
- [The global style](#the-global-style)
  - [The four files](#the-four-files)
  - [What is fixed and what follows the design](#what-is-fixed-and-what-follows-the-design)
  - [Hard rules](#hard-rules)
- [Local files and scripts](#local-files-and-scripts)
  - [The .sb-context-nuxt folder](#the-sb-context-nuxt-folder)
  - [Scripts](#scripts)
  - [Exit codes of sync-values](#exit-codes-of-sync-values)
- [Impeccable (design quality)](#impeccable-design-quality)
- [Troubleshooting and FAQ](#troubleshooting-and-faq)
- [Reliability](#reliability)
- [Contributing and releases](#contributing-and-releases)

---

## Quick start

### Install

```
/plugin marketplace add stefanBid/sb-context-nuxt
/plugin install sb-context-nuxt@sb-context-nuxt
```

### Update

```
/plugin marketplace update sb-context-nuxt
```

Pin a version by keeping `version` in `.claude-plugin/plugin.json` unchanged until you want a release.

### First run on a project

Open Claude Code in the Nuxt project and run:

```
/sb-context-nuxt:onboard
```

It checks the stack, settles the project settings, aligns the global style, migrates the templates, builds and recommends next steps. It stops at every confirmation. Details: [onboard](#onboard).

---

## How the plugin works

### Invocation: command or natural language

Every skill has a slash command `/sb-context-nuxt:<skill>`. Most skills can also be **triggered by natural language**: say what you want and Claude loads the matching skill. Three skills are **command only** because they change a lot at once: `onboard`, `style-migrate`, `full-checkup`.

| Invocation | Skills | How to use |
| --- | --- | --- |
| **Command only** | `onboard`, `style-migrate`, `full-checkup` | Type the slash command. Saying "full checkup" in chat will not load them by itself. |
| **Model or command** | all the others | Type the slash command, or write a request that matches the skill's trigger phrases. |

Skills that take an argument show a hint when you type the command: `design-extract-style [link or name]`, `design-extract-ui [what to extract] [link]`, `style-migrate [files or folders]`.

### Language

Talk to Claude in your language. The skill files are in English, but questions, reports and summaries come back in the language you use. Trigger phrases work in **English or Italian** (see the [cheat sheet](#trigger-phrases-cheat-sheet)). PR titles and descriptions are always English.

### Confirmation stops

Reading is free; writing asks first.

| Skill | Stops before |
| --- | --- |
| `style-align` | writing the four CSS files, installing modules, applying synced values, renaming the prefix |
| `style-migrate` | applying the refactor (you pick the areas first) |
| `design-extract-style` | writing `design-source.md` |
| `design-extract-ui` | replacing an existing component, naming new files |
| `gh-admin`, `gh-checks` | any write to the remote: rulesets, labels, settings, pushes, PRs, releases |
| `dependency-check` | the scope (minor/patch or also major) and the approval of every major migration plan |
| `onboard` | every confirmation of the skills it calls |

### Where things live

| What | Where |
| --- | --- |
| Global style (the only place the plugin writes CSS) | `<srcDir>/assets/css/` (`app/assets/css/` in Nuxt 4) |
| Plugin's own local files | `<root>/.sb-context-nuxt/` (kept out of git) |
| Project root | the folder with `nuxt.config.*`, found from wherever a script starts |

Nothing from this plugin is ever committed to a project. Outside a Nuxt project its scripts refuse to run.

### Requirements

| Need | Required by |
| --- | --- |
| Nuxt 4 | everything style-related (stops on Nuxt < 4) |
| Tailwind 4 with `@tailwindcss/vite` | everything style-related (stops on Tailwind 3: `tailwind.config.*`, `@tailwind`, `@nuxtjs/tailwindcss`, SCSS global CSS) |
| `@nuxtjs/color-mode`, `@nuxt/fonts` | `style-align` installs them if missing |
| `@nuxtjs/i18n` | proposed when text is found inline (a write, with its own confirmation) |
| A Claude account with the design | `design-extract-style`, `design-extract-ui` (via the `Artifact` tool, read only) |
| GitHub CLI (`gh`), logged in | `gh-admin`, `gh-checks` |

---

## Skills at a glance

| Skill | Command | Invocation | Purpose |
| --- | --- | --- | --- |
| `onboard` | `/sb-context-nuxt:onboard` | command only | Join a project in progress: stack, settings, align, migrate, build, next steps |
| `design-extract-style` | `/sb-context-nuxt:design-extract-style` | model or command | Extract the style of a Claude design into `.sb-context-nuxt/design-source.md` |
| `style-align` | `/sb-context-nuxt:style-align` | model or command | Normalize the global style into four files; rename the prefix; sync values with the design |
| `style-migrate` | `/sb-context-nuxt:style-migrate` | command only | Migrate Vue templates after the global style changed |
| `design-extract-ui` | `/sb-context-nuxt:design-extract-ui` | model or command | Build a component, section, layout, page or whole design from Claude as Nuxt code |
| `lint-check` | `/sb-context-nuxt:lint-check` | model or command | ESLint fix and report |
| `build-check` | `/sb-context-nuxt:build-check` | model or command | Type check and production build, errors categorized |
| `seo-check` | `/sb-context-nuxt:seo-check` | model or command | robots, sitemap, per-page meta |
| `dependency-check` | `/sb-context-nuxt:dependency-check` | model or command | Outdated and vulnerable dependencies: minor/patch updates and major migrations (changelog, conflicts, notes) |
| `docs-update` | `/sb-context-nuxt:docs-update` | model or command | Align `README.md` with the code of the project |
| `full-checkup` | `/sb-context-nuxt:full-checkup` | command only | All the checks above, aggregated |
| `gh-admin` | `/sb-context-nuxt:gh-admin` | model or command | Connect to the repo, audit it, settings, rulesets, security, labels, PRs |
| `gh-checks` | `/sb-context-nuxt:gh-checks` | model or command | PR title lint and required checks, aligned with release-please |

### Which skill do I need?

| I want to… | Use |
| --- | --- |
| Start working on a Nuxt project I just joined | `onboard` |
| Use the palette, fonts and radii of my design made in Claude | `design-extract-style`, then `style-align` |
| Reorganize a messy global CSS / theme / dark mode | `style-align` |
| Change the token prefix (`sb` → `ps`) | `style-align` (prefix rename) |
| Update the project after the design changed in Claude | `design-extract-style` (re-extract), then `style-align` (sync) |
| Update templates after the global style changed | `style-migrate` |
| Bring a component, a page or a layout from the Claude design | `design-extract-ui` |
| Know if the project is healthy before a release | `full-checkup` |
| Fix lint / see if the build passes | `lint-check` / `build-check` |
| Check robots, sitemap, meta tags | `seo-check` |
| See outdated or vulnerable packages, update them, migrate a major | `dependency-check` |
| Refresh the project README | `docs-update` |
| Connect the repo, set up rulesets, labels, open a PR | `gh-admin` |
| Block merges with a wrong PR title | `gh-checks` |

### Trigger phrases cheat sheet

Phrases below are the ones written in the skill descriptions (**listed**) or requests that match them (**matches**). English or Italian.

| Skill | Phrases that trigger it |
| --- | --- |
| `design-extract-style` | matches: "extract the style from the design", "import the tokens / palette / typography from Claude", "take the colors from my design system", "importa lo stile dal design" |
| `style-align` | matches: "align / normalize / unify the global style", "reorganize the global CSS", "fix the theme", "dark mode setup", "change the prefix to ps", "sync the style with the design" |
| `design-extract-ui` | listed: "extract the Button component", "bring the Home page from the design", "build the main layout"; matches: "turn this Claude design into Nuxt code" |
| `lint-check` | listed: "check the lint", "is the project clean?", "check del lint" |
| `build-check` | listed: "check the build", "does the project build?", "check del build" |
| `seo-check` | listed: "check SEO", "check GSC readiness", "verifica la SEO" |
| `dependency-check` | listed: "check dependencies", "update dependencies", "verifichiamo le dipendenze"; matches: "migrate to the new major", "update nuxt to the next major" |
| `docs-update` | listed: "update the documentation", "update the README", "aggiorna la documentazione" |
| `gh-admin` | matches: "connect to the repo", "open a PR", "manage labels", "change branch protection / rulesets", "inspect repo settings" |
| `gh-checks` | matches: "add the PR title check", "require a status check", "align CI checks with release-please" |
| `onboard`, `style-migrate`, `full-checkup` | none: command only |

Tips for good triggering:

- Name the **thing** (global style, templates, dependencies, repo), not only the action.
- With a design, paste the **artifact link** or say the design's name: Claude lists the account's designs if you do not.
- For `design-extract-ui`, say **what** you want ("the Button", "the Home page", "the main layout", "all the screens"). If a word is ambiguous ("Home": component or page?), it asks.
- For `style-migrate`, give a path to limit the scope: `/sb-context-nuxt:style-migrate app/pages`.

---

## Workflows

### Join a project in progress

```
/sb-context-nuxt:onboard
```

`onboard` runs, in order: stack check → project settings → (design snapshot) → `style-align` → `style-migrate` → build → next steps.

### Start from a design made in Claude

1. `/sb-context-nuxt:design-extract-style <artifact link or design name>` writes `.sb-context-nuxt/design-source.md`.
2. `/sb-context-nuxt:style-align` asks the prefix (proposing the initials of the design's name), reports conflicts and writes the four files with the design's values.
3. `/sb-context-nuxt:style-migrate` brings the templates in line.
4. `/sb-context-nuxt:design-extract-ui <what>` brings in components and pages.

### The design changed in Claude

1. `/sb-context-nuxt:design-extract-style` re-reads the design and rewrites the snapshot.
2. It then checks the project: aligned project → runs the sync flow of `style-align` (table of differences, contrast of changed colors, **Needs a decision** list, stop, then apply).
3. `/sb-context-nuxt:style-migrate` if class names must follow.

`full-checkup` only compares the project with the snapshot **on disk**. To know whether the design changed on Claude, re-run `design-extract-style`.

### Bring a component or a page from the design

```
/sb-context-nuxt:design-extract-ui the Button component
/sb-context-nuxt:design-extract-ui the Home page
/sb-context-nuxt:design-extract-ui the main layout
/sb-context-nuxt:design-extract-ui all the screens
```

It checks that the style is current, checks what the project already has (replace, create new, name), plans, asks, builds with the project's tokens, verifies, reports. Details: [design-extract-ui](#design-extract-ui).

### Daily health check

```
/sb-context-nuxt:full-checkup
```

Or one check at a time: "check the lint", "check the build", "check SEO", "check dependencies".

### Set up the GitHub side

1. `/sb-context-nuxt:gh-admin` (say "connect to the repo"): read-only audit, report of what is missing.
2. `/sb-context-nuxt:gh-checks`: adds the PR title lint through a branch and a PR, then makes it required.
3. Back to `gh-admin` for rulesets, labels, security, PRs.

---

## Skill reference: style

### design-extract-style

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:design-extract-style [claude.ai artifact link, or the design's name]` |
| **Does** | Reads a **Design** or **Design System** artifact of the connected Claude account and saves every value (both themes, mobile sizes, radii, shadows, brand guide, component index, provenance, gaps) into `.sb-context-nuxt/design-source.md` |
| **Reads** | the artifact (read only: never publishes, edits or deletes) |
| **Writes** | `.sb-context-nuxt/design-source.md` (after your go-ahead) |
| **Then** | realigns the project: `style-align` if no global style yet, otherwise the sync flow |
| **Next** | `style-align`, `design-extract-ui` |

Good to know:

- The artifact stays the source of truth; `design-source.md` is the plugin's **own** snapshot, never Impeccable's `DESIGN.md`.
- **Complete or nothing**: a coverage check must pass; a snapshot that lost a token is not written.
- **A name is not a meaning**: if the roles of the design are not yet mapped (`roleMap.status: needs-confirmation`), nothing is compared or applied until `style-align` maps them with you.
- Overrides applied: eyebrows removed, breakpoints fixed, guard rails. Gaps are reported (no motion in the design, missing mobile values, colors without a matching role).
- If the Design System has `project/implementazione.md`, it is mentioned but **not applied**: structure belongs to this plugin.

### style-align

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:style-align` |
| **Does** | Normalizes any global style setup into `main.css`, `theme.css`, `typography.css`, `animation.css` under `assets/css`, keeping the project's values (or the design's, if a snapshot exists) |
| **Reads** | the whole global style, `nuxt.config.ts`, `design-source.md` if present |
| **Writes** | the four files; `nuxt.config.ts` only in `modules`, `css`, `colorMode`, `fonts` (and `vite.plugins` for `@tailwindcss/vite` if missing); installs `@nuxtjs/color-mode` and `@nuxt/fonts` if missing |
| **Never touches** | components, pages, layouts, `<style scoped>`, `<style module>` (only the optional prefix rename replaces the old prefix) |
| **Next** | `style-migrate` |

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

### style-migrate

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:style-migrate [files or folders to analyze]` (command only) |
| **Does** | Reads Vue templates line by line, tag by tag, and proposes the refactor of component classes and styles to the new global style |
| **Flow** | scope (summary first, you pick the areas) → line-by-line analysis → proposal → confirmation → apply → verify → summary |
| **Needs** | a global style already aligned (`style-align`) |

### design-extract-ui

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:design-extract-ui [what to extract] [optional artifact link]` |
| **Does** | Builds what you ask for from a Claude design as Nuxt 4 code: Vue `<script setup lang="ts">`, Tailwind 4 with the project's own theme |
| **Needs** | style aligned **and in sync with the design** (step 0 checks it; otherwise it stops and runs `design-extract-style`) |
| **Reads** | the design (read only), the project, project settings |
| **Writes** | components, layouts, pages, locale files |

What a request becomes:

| You ask for | Destination | Source in the design |
| --- | --- | --- |
| a **component** ("the Button", "the stepper") | `app/components/…` | Design System component folder, or an element of a board |
| a **section** ("the hero", "the FAQ", "the footer") | one or more components in `app/components/…` | a board of a Design |
| a **layout** ("the main layout", "header and footer") | `app/layouts/<name>.vue` with `<slot />`; header, footer, navigation as components | the frame that surrounds `<main>` |
| a **page** ("the Home", "the form page") | `app/pages/<route>.vue` plus the components and layout it needs | a board (desktop, mobile and dark variants are one screen) |
| **everything** ("the whole design") | one page per screen, one layout, the shared components | all boards of the Design |

Flow: style current? → project settings → input → find it in the design → plan with what the project already has → **ask** → build → verify → report. Several things in one request are split, shown as a plan, and built in order.

Text is never left inline: it goes to the locale files (see [The i18n stance](#the-i18n-stance)).

---

## Skill reference: onboarding and checks

### onboard

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:onboard` (command only) |
| **Does** | Joins a project in progress. Does no work itself: runs the steps in order and stops at every confirmation |

| Step | What |
| --- | --- |
| 1. Stack | table: Nuxt (must be 4), Tailwind (must be 4 with `@tailwindcss/vite`), package manager, `@nuxtjs/color-mode`, `@nuxt/fonts`, project docs (`DESIGN.md`, `PRODUCT.md`, `CLAUDE.md`). **Stops** on Nuxt < 4 or Tailwind < 4. Reads `CLAUDE.md` and follows its rules. |
| 1b. Project settings | detects what the project shows, asks all missing questions together, saves answers |
| 2. Align | asks for a design link first if you have one and there is no snapshot, then `style-align` |
| 3. Migrate | `style-migrate`: summary, then the areas you pick |
| 4. Build | the project's `build` script; reports errors and warnings |
| 5. Next steps | recommendations only: Impeccable, `gh-admin`, `gh-checks`, `full-checkup` |

### full-checkup

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:full-checkup` (command only) |
| **Does** | Runs the whole routine and aggregates the result |

| # | Check | Notes |
| --- | --- | --- |
| 1 | `dependency-check` | minor/patch only; reports the open dependency notes |
| 2 | `seo-check` | |
| 3 | Design sync | only if `design-source.md` exists; `sync-values.mjs --check`: drift is reported and `style-align` proposed |
| 4 | Inline text | `check-i18n.mjs` on pages, components, layouts; skipped if `i18n.enabled: false`; findings are **warnings** with file and line |
| 5 | `build-check` | |
| 6 | `lint-check` | |
| 7 | Blockers | build errors or lint errors that cannot be auto-fixed: **stops**, lists each, asks you to fix and re-run |
| 8 | `docs-update` | only if the README needs it (new dependency, component, page, composable, config change) |
| 9 | Summary | dependencies, SEO, design sync, inline text, build, lint, docs, overall result |

### lint-check

| | |
| --- | --- |
| **Trigger** | "check the lint", "is the project clean?", "check del lint" |
| **Does** | `lint:fix` (fallback `npx eslint . --fix`), then `lint`; remaining diagnostics split into **warnings** (non-blocking) and **errors** (blocking, listed for manual review) |
| **Never** | silences an issue with `// eslint-disable` |
| **Reports** | files auto-fixed, remaining warnings, remaining errors |

### build-check

| | |
| --- | --- |
| **Trigger** | "check the build", "does the project build?", "check del build" |
| **Does** | Type check (`npx nuxt typecheck`, needs `vue-tsc` + `typescript`) then production build; package manager detected from the lockfile |
| **Categories** | **TypeScript errors** (type safety), **Build errors** (blocking: TypeScript, Vite, Nitro, module not found, SSR), **Build warnings** (non-blocking) |
| **On failure** | suggests a fix direction, does not auto-apply it |

### seo-check

| | |
| --- | --- |
| **Trigger** | "check SEO", "check GSC readiness", "verifica la SEO" |
| **Does** | Audits readiness for Google Search Console |
| **Asks** | only what is missing: multilingual or not, locales, production URL |

| Check | Expected |
| --- | --- |
| robots | production: `Allow: /` and a `Sitemap:` on the production domain (not `localhost`); previews: `Disallow: /` |
| Sitemap | valid XML, `<loc>` on the production domain, `<xhtml:link>` alternates per locale with `x-default`, hreflang matching `i18n.locales[].iso`, all indexable routes |
| Placeholders | no `yoursite.com`, `Your Site Name`, `example.com` left in config, `.env`, `.env.example` |
| Per-page meta | each page has `title`, `description`, `ogTitle`, `ogDescription`, `ogImage` through i18n; pages without a head call are flagged |
| Inline meta | `check-i18n.mjs` on `app/pages`; hits are warnings on multilingual sites |

Report: per check, blockers vs warnings vs OK.

### dependency-check

| | |
| --- | --- |
| **Trigger** | "check dependencies", "update dependencies", "migrate to the new major", "verifichiamo le dipendenze" |
| **Does** | Lists outdated packages, updates minor/patch, migrates majors like a migration manager, audits vulnerabilities |
| **Lists first** | scans and shows **every** available update **grouped** into Major / Minor / Patch, one table per group: package, **current** (installed) → **new**, and dependency type |
| **Asks only if there is a choice** | nothing outdated: no question. Only minor/patch: no question, it updates. Majors **and** minor/patch: everything, only minor/patch (default), or pick the majors. Only majors: all, pick, or leave them. Skipped if your request already says it |
| **Branch** | follows the install policy of the project's `CLAUDE.md`; otherwise a dedicated `chore/deps-<date>` branch, never `main` |
| **Writes** | `package.json`, lockfile, project files of an approved migration plan, `.sb-context-nuxt/dependency-notes.json` |

Rules:

- **Forward only.** Never downgrades a package, never lowers a constraint, never `--force` / `--legacy-peer-deps` / `npm audit fix --force`, never an `overrides` entry that pins an old version to make a new one fit. What does not fit **waits**, and is noted.
- `0.y.z` → `0.(y+1).z` counts as a major.
- One major at a time, core first (`nuxt`, `vue`, `vite`, `tailwindcss`), verified before the next.

Minor and patch: same major as the declared constraint. The changelog is checked first; if a concern shows up, the package is handled as a major.

Major, per package:

| Step | What happens |
| --- | --- |
| **Read** | release notes of **every** major between current and target (GitHub releases, `CHANGELOG.md`, migration guide): breaking changes, new requirements (Node, peers), deprecations turned into removals |
| **Match** | searches the project for each change (imports, `nuxt.config`, module options, templates, scripts) and builds a table: change, used here?, where, what must change. "Not used" is a finding, not an assumption |
| **Check compatibility** | peers of the target, dependents that still list the old range, install dry run, Node `engines` |
| **Judge each conflict** | who owns it (`project` or `upstream`), how much it matters (blocks install / breaks build or runtime / warning only), is it already fixed in a newer version of the other library, what is the way forward (update both, change our code, **wait**, ask you) |
| **Propose** | release notes in short, exact edits (file, line, before → after), conflicts, order, what is postponed. **Stops** for your approval (all, part, or postpone) |
| **Apply and verify** | edits, install, `build-check`, `lint-check` (and tests if any); only new failures count. If it cannot be fixed inside the plan it stops, does not downgrade, and asks before discarding the attempt |

Dependency notes (`.sb-context-nuxt/dependency-notes.json`): everything postponed or blocked is written there, so the next run remembers.

| Field | Meaning |
| --- | --- |
| `status` | `deferred` (waits for something outside the project, or a later decision), `watching` (could move soon), `resolved` (history) |
| `blockedBy` | package, range, and **owner**: `upstream` (another library must release a fix) or `project` (our code, constraint or choice must change) |
| `recheck` | the concrete thing to verify next time, e.g. "does `@nuxtjs/sitemap@latest` accept `vue-router@^5`?" |

At the start of every run the skill lists the open notes and re-verifies each one before scanning: blocker gone → offers the migration; still blocked → notes what it checked; `project`-owned → reminds you. `full-checkup` runs minor/patch only and reports the open notes.

Vulnerabilities: `npm audit`, `npm audit fix` for what is in range; a fix that needs a major is handled as a major, and if it cannot be done now it is noted with advisory, severity and owner.

### docs-update

| | |
| --- | --- |
| **Trigger** | "update the documentation", "update the README", "aggiorna la documentazione" |
| **Does** | Compares the **project's** `README.md` with its code (components, composables, pages, config, versions, commands, links) and edits only the affected sections, in English |
| **Never** | rewrites the README wholesale unless asked; invents information (unverifiable details are marked TBD) |

---

## Skill reference: GitHub

### gh-admin

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:gh-admin` |
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
| Required checks | the real CI job names, including `lint-pr-title` once `gh-checks` is applied |
| Labels | the set in `labels/labels.json`, including the release-please `autorelease:*` labels |
| Security | secret scanning + push protection, Dependabot alerts and security updates, no secrets in workflows |
| Release | `release-please` workflow and config present, PR titles linted |

Recipes: **Init** (connect and audit, read only), **Inspect**, **Repo settings**, **Rulesets**, **Labels**, **Branch and repo security**, **Open PRs**, **Release check**.

Rules of engagement:

- Read-only commands run freely; known facts come from `.sb-context-nuxt/github_settings.json` first.
- **Asks before** any write to the remote, showing the exact command.
- Never bypasses a ruleset (no `--admin` merges) unless you ask explicitly.
- Never prints or stores tokens; secrets are listed by name only.
- Not logged in? It suggests `! gh auth login` (or `! gh auth refresh -s repo`) so it runs in the session.
- **Signature**: commits and PR descriptions are **not signed** (no `Co-Authored-By`, no "Generated with…", no mention of Claude) unless `signature.enabled` is `true` in `.sb-context-nuxt/github_settings.json`, with the exact name to sign with.

### gh-checks

| | |
| --- | --- |
| **Command** | `/sb-context-nuxt:gh-checks` |
| **Does** | Creates the base GitHub Actions checks and makes them **required** for merging into `main`. Today: the PR title lint |
| **Why** | with squash merge the PR title becomes the commit on `main`, and release-please reads it to choose the version bump and the tag |
| **Job name** | `lint-pr-title` (`amannn/action-semantic-pull-request`, on `opened`, `reopened`, `edited`, `synchronize` PRs into `main`) |

Flow: read the project → adapt and add the workflow (through a branch and a PR, never a direct push) → make it required **after the workflow is on `main`** → verify.

---

## Project settings

How the user wants **this project** built, asked **once** and saved in `.sb-context-nuxt/project-settings.json`. Skills ask only what is missing and only when it matters, with the detected value as the recommended answer. A setting changes only when you ask ("add German", "stop using the Base prefix").

Skills that use it: `onboard` (asks everything missing in one go), `design-extract-ui`, `style-align` (prefix), `seo-check` (i18n, site URL).

### Keys

| Key | Meaning | Detected from |
| --- | --- | --- |
| `i18n.enabled` | all user-visible text goes through i18n | `@nuxtjs/i18n` in modules/deps |
| `i18n.defaultLocale` | language of the design's text and the default locale file | `defaultLocale` in `nuxt.config` |
| `i18n.locales` | supported locales (`["it","en"]`) | `locales` in `nuxt.config`, locale files |
| `i18n.otherLocales` | non-default locales: `"translate"` (written, marked to review) or `"fallback"` (empty, falls back) | asked |
| `i18n.messagesDir` | where the locale files live | `i18n/locales`, `locales`, `langDir` |
| `i18n.keyStyle` | key organization, e.g. `pages.home.hero.title` | existing locale files |
| `i18n.untranslated` | words that stay as they are (brand names) | asked when the design has them |
| `icons.module` | `"@nuxt/icon"` or `null` (inline SVG) | modules |
| `images.module` | `"@nuxt/image"` or `null` | modules |
| `style.prefix` | prefix of the global style tokens and utilities | `--<p>-bg` in `theme.css` |
| `seo.siteUrl` | production URL for robots, sitemap, canonical | `siteUrl`/`baseUrl` in `nuxt.config` |
| `stack.packageManager` | only when there is no lockfile | lockfile |
| `naming.componentPrefix` | prefix of shared components: `"Base"`, `"App"`, `"Ui"`, `"none"` | most common prefix in `components/` |

A missing key means "unknown", not "no". If the project contradicts the file (module removed, folder moved), the skill says so and asks which is right.

### The i18n stance

The plugin **never leaves user-visible text inline**: templates, `alt`, `aria-label`, `placeholder`, `title` and SEO meta included.

| Situation | What happens |
| --- | --- |
| `@nuxtjs/i18n` installed | used, with the saved locales and key style |
| Not installed | it proposes setting it up (the exact command and files are shown, you confirm) |
| You decline | `i18n.enabled: false`; text still stays **out of templates**, in a typed content module (`app/content/<name>.ts`), movable to i18n later |
| Sample data in a design (names, dates in a preview) | becomes props, slots or sample data, not message keys |

Checked by `scripts/check-i18n.mjs`.

---

## The global style

### The four files

All under `<srcDir>/assets/css/`:

| File | Content |
| --- | --- |
| `main.css` | the only file in `nuxt.config.ts` `css`: imports the other three, the `dark` variant on `data-theme`, base layer for `html` / `body` / media |
| `theme.css` | color tokens for light and dark, radii, shadows, `@theme inline` and `@theme` |
| `typography.css` | font families, type scale, the `{p}-<role>` text utilities, mobile sizes, `clamp()` above `display` only, base layer for `h1`–`h4` |
| `animation.css` | durations, easings, animations, Vue transitions, `prefers-reduced-motion` |

`{p}` is the prefix you chose: raw variables `--{p}-bg`, utilities `{p}-h1`, `{p}-body`, `{p}-overline`, `{p}-transition`. Tailwind tokens keep the role name (`--color-primary` → `bg-primary`, `--text-h1` → `text-h1`). The reference structure is in `skills/style-align/references/example/` (values are the example's, not yours).

### What is fixed and what follows the design

| Concern | Owner | Rule |
| --- | --- | --- |
| **Structure**: the four files and their sections, token naming, the `{p}` prefix, role names, closed Tailwind namespaces, `@theme` vs `@theme inline`, utilities `{p}-<role>`, base layer for `h1`–`h4`, light/dark with `data-theme`, `@nuxtjs/color-mode` and `@nuxt/fonts`, breakpoints, `clamp()` only above `display` | **this plugin** | fixed, always enforced |
| **Values and taste**: palette, font families and pairing, type ratios, line heights, letter spacing, weights, radii and shadow values, motion timings and character, how roles are used on a page | **`design-source.md`**, else the project | if `.sb-context-nuxt/design-source.md` exists, its values win; otherwise the project's current values are kept, normalized |

### Hard rules

- **No eyebrows, ever.** `overline` is for badges, tags, counters, table headers and metadata, never a kicker above a heading, even if the design documents one.
- Breakpoints are fixed.
- 16px floor for running text and inputs.
- The skill never judges the design: it fixes the structure.

---

## Local files and scripts

### The .sb-context-nuxt folder

At the project root, kept out of git (`.git/info/exclude`). Never committed.

| File | Written by | Content |
| --- | --- | --- |
| `design-source.md` | `design-extract-style` | snapshot of the Claude design: values, brand guide, component index, provenance, gaps, machine block |
| `design-applied.json` | `style-align` (sync) | which version of the snapshot is applied to the project |
| `project-settings.json` | `onboard`, any skill that needs a setting | the [keys](#keys) above |
| `dependency-notes.json` | `dependency-check` | what was postponed or blocked (package, target, blockers with owner, what to recheck) |
| `github_settings.json` | `gh-admin` | signature settings and the cache of what is known about the repo (slug, default branch, rulesets, labels, check names) |

### Scripts

Skills call these; you rarely run them by hand.

| Script | Used by | Purpose |
| --- | --- | --- |
| `scripts/project-settings.mjs` (`detect`, `get`, `set`) | most skills | read and save project settings |
| `scripts/dependency-notes.mjs` (`list`, `add`, `touch`, `resolve`) | `dependency-check` | read and write the dependency notes |
| `scripts/check-i18n.mjs` | `full-checkup`, `seo-check`, `design-extract-ui` | find inline text and missing keys in the default locale |
| `scripts/lib/project.mjs` | all scripts | find the Nuxt root and `srcDir` |
| `skills/design-extract-style/scripts/tokens-to-source.mjs` | `design-extract-style` | convert the artifact's tokens into the snapshot, with coverage check |
| `skills/style-align/scripts/inventory.mjs` | `style-align` | inventory of the global style (`--classes` for component impact) |
| `skills/style-align/scripts/sync-values.mjs` | `style-align`, `design-extract-style`, `full-checkup` | compare and apply values from the snapshot |
| `skills/style-align/scripts/contrast.mjs` | `style-align` | contrast of color pairs |
| `skills/style-align/scripts/rename-prefix.mjs` | `style-align` | prefix rename |
| `skills/style-migrate/scripts/template.mjs` | `style-migrate` | template summary and line-by-line analysis |

`sync-values.mjs` options: no flag prints the table and writes nothing; `--check` for the exit code; `--apply` writes changed values, refreshes the px comments and records the applied version; `--record` only records "snapshot applied" (after a full `style-align` write); `--map design.name=role …` saves the role mapping (`=null` for a name with no role).

### Exit codes of sync-values

| Code | Meaning | What to do |
| --- | --- | --- |
| `0` | style matches the snapshot | nothing |
| `10` | drift: the design changed or the style never got its values | run the sync flow of `style-align` |
| `4` | role mapping missing or inconsistent | agree the mapping in `style-align`, then repeat |

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
| "The skill stops: Tailwind 3 / Nuxt 3" | style skills require Nuxt 4 and Tailwind 4 with `@tailwindcss/vite`. No adaptation: upgrade first. |
| A script says it is not in a Nuxt project | it looks for `nuxt.config.*` upward from where it starts; run Claude Code inside the project. |
| `design-extract-ui` refuses to start | the style is not aligned or not in sync with the design. Run `design-extract-style` (it realigns) or `style-align`. |
| `sync-values.mjs --check` exits `4` | the design's role names are not mapped to plugin roles. `style-align` maps them with you. |
| `sync-values.mjs --check` exits `10` | values differ from the snapshot: run the sync flow, review the table, confirm. |
| I said "full checkup" and nothing happened | `full-checkup` is command only. Type `/sb-context-nuxt:full-checkup`. |
| The design changed but `full-checkup` shows no drift | it compares with the snapshot on disk. Re-run `design-extract-style` first. |
| It asks again for something I answered | answers live in `.sb-context-nuxt/project-settings.json`; if the file was deleted or the project contradicts it, it asks. |
| `gh` cannot write rulesets or labels | needs `ADMIN` (labels: `WRITE`). The audit reports what the account can do. |
| Where is the prefix used? | `--{p}-*` variables and `{p}-<role>` utilities. Change it with "change the prefix to xx" in `style-align`. |
| Can I commit `.sb-context-nuxt/`? | no: it is local by design and excluded from git. |
| Does the plugin fix my design? | no. Use Impeccable. |

---

## Reliability

A skill is instructions for a model: how well it is followed depends on the model and cannot be pinned by a test. What the skills **compute** can. Every algorithm they rely on lives in a script, and those scripts are covered by a test suite that runs on Node 22 and 24:

| Layer | What it guarantees |
| --- | --- |
| Unit | color parsing, OKLCH and WCAG contrast; CSS variables per theme; value normalizers and in-place rewrites of the style; prefix rules; type scale and size clusters; class anatomy and nearest theme roles; design role maps; i18n heuristics; dependency notes; project settings |
| CLI | every script run end to end on a throwaway Nuxt project: exit codes, JSON output, files written, `--apply` idempotent, nothing written on a dry run |
| Contract | Claude Code's own `claude plugin validate --strict` on the marketplace, the manifest and every skill; every script path a `SKILL.md` points to exists, every `/sb-context-nuxt:<skill>` names a real skill, shared helpers are identical in every skill that ships them, manifests and docs agree with the code |

The badges at the top are measured on `main` after every merge: line and branch coverage of the scripts the skills run (`scripts/` and `skills/*/scripts/`). Every pull request that produces a release (`feat`, `fix`, `perf`, `revert`, breaking changes) must pass the suite before it can be merged.

Run it locally with `npm ci && npm test`; [CONTRIBUTING.md](CONTRIBUTING.md#tests) explains the layers and how to add tests.

---

## Contributing and releases

`main` is protected: every change goes through a pull request, merged with **squash**. The PR title is a conventional-commit title (`feat`, `fix`, `docs`, …) and release-please reads it to choose the next version, the tag and the changelog; the `lint-pr-title` check blocks the merge when it is wrong, and `tests-gate` blocks a releasing PR whose tests fail. A change to what a skill **does** (`skills/**`) is a `feat` or a `fix`. Full rules: [CONTRIBUTING.md](CONTRIBUTING.md).
