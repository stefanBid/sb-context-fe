---
name: onboard
description: Modus operandi for joining a Nuxt 4 + Tailwind 4 project already in progress. Runs setup (stack, local folder, settings), aligns the global style, migrates the templates, builds, and recommends next steps. Command only. For a project already aligned, setup alone is enough.
disable-model-invocation: true
---

# Onboard a project in progress

The plugin's way of joining a Nuxt 4 + Tailwind 4 project that is already underway. This skill does no work itself: it runs the steps below in order and **stops at every confirmation** the called skills require.

If the project is already aligned and the user only wants the plugin to know it, `/sb-context-nuxt:setup` alone is enough: say so before starting.

The plugin aligns the style structure and then maintains the project. It does not judge the design: that is Impeccable's job, a separate optional plugin (see step 5).

**Language**: this file is in English, but talk to the user in their language.

## 1. Set up: stack, local folder, project settings

Run `/sb-context-nuxt:setup`. It checks the stack (**stop** on Nuxt < 4 or Tailwind < 4), reads `CLAUDE.md` (follow its rules for the rest of the run), creates `.sb-context-nuxt/` out of git, asks **all** the missing project settings in one go (so the skills called next do not ask piecemeal) and reports what the plugin knows. Format of the settings: `${CLAUDE_SKILL_DIR}/../../references/project-settings.md`.

Keep its report; its list of next steps is replaced by the steps below. Missing color-mode or fonts is not a stop: `style-align` installs them.

## 2. Align the global style

If the user has a design made in Claude desktop and there is no `.sb-context-nuxt/design-source.md`, ask for the artifact link or the design's name and run `/sb-context-nuxt:design-extract-style` first.

The prefix is read from `style.prefix` in the settings; `style-align` does not ask it again.

Run `/sb-context-nuxt:style-align`. Follow its flow, including its questions (prefix), its report and its confirmation stop.

## 3. Migrate the templates

Run `/sb-context-nuxt:style-migrate`: summary first, then only the areas the user picks, with its confirmation stop before applying.

## 4. Build

Run the project's `build` script with the detected package manager. Report errors and warnings; do not auto-fix beyond what the called skills already changed.

## 5. Next steps (recommendations only)

- **No `DESIGN.md`**: suggest Impeccable's `/impeccable document` to record the aligned system, then `/impeccable critique` and `/impeccable polish`. If Impeccable is not installed, give the two install lines as a suggestion, not a requirement:
  - `/plugin marketplace add https://github.com/pbakaus/impeccable.git`
  - `/plugin install impeccable@impeccable`
- **`DESIGN.md` exists**: suggest `/impeccable critique` on the migrated pages.
- **Repository not connected or not set up yet** (settings, rulesets, labels, security): suggest `/sb-context-nuxt:gh-admin`, which starts with a read-only audit.
- **No PR title lint** (`.github/workflows` has none): suggest `/sb-context-nuxt:gh-checks`.
- Day-to-day checks: `/sb-context-nuxt:full-checkup`.

The two plugins are not connected: nothing here installs, requires or reads Impeccable's files.
