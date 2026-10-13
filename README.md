# sb-context-nuxt

Claude Code plugin for **Nuxt 4 + Tailwind 4 projects already in progress**. It does two things:

1. **Aligns** the project to one fixed way of organizing the global style, normalizing whatever divergent setup it finds.
2. **Maintains** the project with a precise, repeatable way of working: template migration, GitHub management, and later lint, build and SEO.

It does **not** judge or improve the design. That is the job of [Impeccable](#4-improve-the-design-recommended-separate-plugin), a separate plugin. The two are not connected.

Kept **outside** project repos: nothing here is ever committed to a project. The plugin works only on Nuxt projects: its scripts find the project root (the folder with `nuxt.config.*`) from wherever they start, keep the global style in `<srcDir>/assets/css/` and their own files in `<root>/.sb-context-nuxt/`.

## 1. Install

```
/plugin marketplace add stefanBid/sb-context-nuxt
/plugin install sb-context-nuxt@sb-context-nuxt
```

Update: `/plugin marketplace update sb-context-nuxt`. Pin by keeping `version` in `.claude-plugin/plugin.json` unchanged until you want a release.

## 2. Join a project

```
/sb-context-nuxt:onboard
```

The plugin's modus operandi for a project in progress. It checks the stack (Nuxt 4, Tailwind 4, package manager, color-mode, fonts, `DESIGN.md` / `PRODUCT.md` / `CLAUDE.md`), then runs the steps below in order, stopping at every confirmation, then builds and recommends next steps.

## 3. Align

0. Optional, for a design made in Claude: `/sb-context-nuxt:design-extract-style [link or name]` reads a Design or Design System artifact of the connected Claude account and saves it as `.sb-context-nuxt/design-source.md`, the plugin's own snapshot (kept out of git, never Impeccable's `DESIGN.md`); `style-align` turns it into the global style.
1. `/sb-context-nuxt:style-align` normalizes the global style into the four-file structure under `assets/css`, keeping the project's own values.
2. `/sb-context-nuxt:style-migrate` then migrates the templates (summary first, then the areas you pick).

## 4. Improve the design (recommended, separate plugin)

[Impeccable](https://github.com/pbakaus/impeccable) (`impeccable@impeccable`) owns design values and taste: critique, polish, color, typography, motion. After alignment, `/impeccable document` records the aligned system in `DESIGN.md`, then `/impeccable critique` and `/impeccable polish` improve it.

Optional, and **not connected** to this plugin: no dependency, no shared files. If you want it:

```
/plugin marketplace add https://github.com/pbakaus/impeccable.git
/plugin install impeccable@impeccable
```

## 5. Maintain

Checks, run on demand (each also triggers from natural phrases, English or Italian):

- `/sb-context-nuxt:lint-check`, `/sb-context-nuxt:build-check`, `/sb-context-nuxt:seo-check`, `/sb-context-nuxt:dependency-check`, `/sb-context-nuxt:docs-update`;
- `/sb-context-nuxt:full-checkup` runs them in order and aggregates the result.

GitHub:

- `/sb-context-nuxt:gh-admin`: connect to the repo (init and audit), repo settings, rulesets and security, labels, PRs, release checks.
- `/sb-context-nuxt:gh-checks`: base CI checks, starting with the PR title lint that blocks the merge when the title does not match the conventional-commit format used by release-please.

Bring in UI from a Claude design:

- `/sb-context-nuxt:design-extract-ui <what>`: extracts from a Claude design what you ask for (a component, a section, a layout, a page, or the whole set of screens), checks what the project already has (replace, create new, name), and builds it for Nuxt 4 + Tailwind 4 with the project's tokens.
- Project preferences (i18n, naming, icons, images) are asked once, when a skill needs them, and saved in `.sb-context-nuxt/project-settings.json` (local, never committed). Text is never left inline: it goes to the locale files.

## Skills

| Skill | Command | Invocation | Purpose |
| --- | --- | --- | --- |
| `onboard` | `/sb-context-nuxt:onboard` | command only | Join a project in progress: check the stack, align, migrate, build, next steps |
| `design-extract-style` | `/sb-context-nuxt:design-extract-style` | model or command | Extract the global style of a Claude design (Design or Design System artifact) into `.sb-context-nuxt/design-source.md`, then `style-align` |
| `style-align` | `/sb-context-nuxt:style-align` | model or command | Normalize the global style into `main.css`, `theme.css`, `typography.css`, `animation.css`; change the token prefix, or sync the values with the design when it changed in Claude |
| `style-migrate` | `/sb-context-nuxt:style-migrate` | command only | Migrate Vue templates after the global style changed |
| `design-extract-ui` | `/sb-context-nuxt:design-extract-ui` | model or command | Extract a component, section, layout, page or whole design from Claude and build it as Nuxt code with the project's style |
| `gh-admin` | `/sb-context-nuxt:gh-admin` | model or command | Connect to the repo, audit it, settings, rulesets, security, labels, PRs |
| `gh-checks` | `/sb-context-nuxt:gh-checks` | model or command | PR title lint and required checks, aligned with release-please |
| `lint-check` | `/sb-context-nuxt:lint-check` | model or command | ESLint fix and report |
| `build-check` | `/sb-context-nuxt:build-check` | model or command | Type check and production build, errors categorized |
| `seo-check` | `/sb-context-nuxt:seo-check` | model or command | robots, sitemap, per-page meta |
| `dependency-check` | `/sb-context-nuxt:dependency-check` | model or command | Outdated and vulnerable dependencies, safe updates |
| `docs-update` | `/sb-context-nuxt:docs-update` | model or command | Align `README.md` with the code |
| `full-checkup` | `/sb-context-nuxt:full-checkup` | command only | All the checks above, aggregated |

## What is fixed / what follows the design

| Concern | Owner | Rule |
| --- | --- | --- |
| **Structure**: the four files and their sections, token naming, the `{p}` prefix, the role names, closed Tailwind namespaces, `@theme` vs `@theme inline`, utilities `{p}-<role>`, base layer for `h1`–`h4`, light/dark mechanics with `data-theme`, `@nuxtjs/color-mode` and `@nuxt/fonts`, breakpoints, `clamp()` only above `display` | **this plugin** | fixed, always enforced |
| **Values and taste**: palette, font families and pairing, type ratios, line heights, letter spacing, weights, radii and shadow values, motion timings and character, how roles are used on a page | **`design-source.md`**, else the project | if `.sb-context-nuxt/design-source.md` exists, its values win; otherwise the project's current values are kept, normalized |

One exception: **no eyebrows, ever**. `overline` is for badges, tags, counters, table headers and metadata, never a kicker above a heading, even if the design documents one. Breakpoints and the 16px floor for running text and inputs are also fixed.
