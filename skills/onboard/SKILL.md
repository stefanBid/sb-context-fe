---
name: onboard
description: Modus operandi for joining a Nuxt 4 + Tailwind 4 project already in progress. Checks the stack, aligns the global style, migrates the templates, builds, and recommends next steps. Command only.
disable-model-invocation: true
---

# Onboard a project in progress

The plugin's way of joining a Nuxt 4 + Tailwind 4 project that is already underway. This skill does no work itself: it runs the steps below in order and **stops at every confirmation** the called skills require.

The plugin aligns the style structure and then maintains the project. It does not judge the design: that is Impeccable's job, a separate optional plugin (see step 5).

**Language**: this file is in English, but talk to the user in their language.

## 1. Check the stack

Read `package.json`, the lockfile, `nuxt.config.*` and the project root. Report a 6-line table:

| Item | Check |
| --- | --- |
| Nuxt | version, must be 4 |
| Tailwind | version, must be 4, with `@tailwindcss/vite` |
| Package manager | npm, pnpm, yarn or bun (from the lockfile) |
| `@nuxtjs/color-mode` | installed and in `modules` |
| `@nuxt/fonts` | installed and in `modules` |
| Project docs | presence of `DESIGN.md`, `PRODUCT.md`, `CLAUDE.md` |

**Stop** on Nuxt < 4 or Tailwind < 4, and say so. Missing color-mode or fonts is not a stop: `style-align` installs them.

Read `CLAUDE.md` if present and follow its rules (install policy, commit rules) for the rest of the run.

## 1b. Project settings

How this project is organized is saved once in `.sb-context-nuxt/project-settings.json` (format and rules: `${CLAUDE_SKILL_DIR}/../../references/project-settings.md`). This is the moment to settle it, so the skills called next do not ask piecemeal.

```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/project-settings.mjs" detect
```

It prints what the stack already shows (modules, locales, locale files, component prefixes, package manager, global style prefix, site URL) and a `missing` list. **Ask all the missing questions together** (question tool if available), each with the detected value as the recommended answer, and save every answer with `project-settings.mjs set <key> '<json>'`: i18n (is it on, default locale, other locales and whether they are translated or fall back, messages folder, key style), icons, images, base-component prefix, global style prefix, production URL. Anything already saved is not asked. Say that text is never left inline: it goes to the locale files, and if `@nuxtjs/i18n` is missing it will be proposed (a write, with its own confirmation). Skip the questions that make no sense for this project (no images → no `@nuxt/image` question).

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
