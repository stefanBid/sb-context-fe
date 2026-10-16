---
name: onboard
description: Modus operandi for joining a Nuxt 4 + Tailwind 4 project already in progress. Runs setup (stack, local folder, settings), aligns the global style, migrates the templates, builds, and recommends next steps. Command only. For a project already aligned, setup alone is enough.
disable-model-invocation: true
---

# Onboard a project in progress

The plugins' way of joining a Nuxt 4 + Tailwind 4 project that is already underway. This skill does no work itself: it runs the steps below in order and **stops at every confirmation** the called skills require.

The steps call skills of other plugins of the marketplace (sb-design, sb-health, sb-github). A step whose skill is not among the available skills is **skipped**, saying which plugin would run it (`/plugin install <plugin>@sb-context-fe`); onboarding goes on with the next step.

Onboarding is for a **Nuxt app**: its steps align and migrate the global style, which `sb-design` does only there. For any other project (a library, a Vue + Vite app), `/sb-core:setup` is the way in: say so and run it instead.

If the project is already aligned and the user only wants the plugins to know it, `/sb-core:setup` alone is enough: say so before starting.

The plugins align the style structure and then maintain the project. It does not judge the design: that is Impeccable's job, a separate optional plugin (see step 5).

**Language**: this file is in English, but talk to the user in their language.

## 1. Set up: stack, local folder, project settings

Run `/sb-core:setup`. It checks the stack (**stop** on Nuxt < 4), reads `CLAUDE.md` (follow its rules for the rest of the run), creates `.sb-context/`, asks **all** the missing project settings in one go (so the skills called next do not ask piecemeal) and reports what the plugins know. Tailwind < 4 stops step 2 (`/sb-design:align` refuses it). Format of the settings: `${CLAUDE_SKILL_DIR}/../../core/references/project-settings.md`.

Keep its report; its list of next steps is replaced by the steps below. Missing color-mode or fonts is not a stop: `/sb-design:align` installs them.

## 2. Align the global style

If the user has a design made in Claude desktop and there is no `.sb-context/design-source.md`, ask for the artifact link or the design's name and run `/sb-design:extract-style` first.

The prefix is read from `style.prefix` in the settings; `/sb-design:align` does not ask it again.

Run `/sb-design:align`. Follow its flow, including its questions (prefix), its report and its confirmation stop.

## 3. Migrate the templates

Run `/sb-design:migrate`: summary first, then only the areas the user picks, with its confirmation stop before applying.

## 4. Build

Run `/sb-health:build` (or, without the sb-health plugin, the project's `build` script with the detected package manager). Report errors and warnings; do not auto-fix beyond what the called skills already changed.

## 5. Next steps (recommendations only)

- **No `DESIGN.md`**: suggest Impeccable's `/impeccable document` to record the aligned system, then `/impeccable critique` and `/impeccable polish`. If Impeccable is not installed, give the two install lines as a suggestion, not a requirement:
  - `/plugin marketplace add https://github.com/pbakaus/impeccable.git`
  - `/plugin install impeccable@impeccable`
- **`DESIGN.md` exists**: suggest `/impeccable critique` on the migrated pages.
- **Repository not connected or not set up yet** (settings, rulesets, labels, security): suggest `/sb-github:admin`, which starts with a read-only audit.
- **No PR title lint** (`.github/workflows` has none): suggest `/sb-github:checks`.
- Day-to-day checks: `/sb-health:checkup`.

Impeccable is not connected to these plugins: nothing here installs, requires or reads its files.
