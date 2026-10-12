# sb-context-nuxt

Claude Code plugin for **Nuxt 4 + Tailwind 4 projects already in progress**. It does two things:

1. **Aligns** the project to one fixed way of organizing the global style, normalizing whatever divergent setup it finds.
2. **Maintains** the project with a precise, repeatable way of working: template migration, GitHub management, and later lint, build and SEO.

It does **not** judge or improve the design. That is the job of [Impeccable](#4-improve-the-design-recommended-separate-plugin), a separate plugin. The two are not connected.

Kept **outside** project repos: nothing here is ever committed to a project.

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

- `/sb-context-nuxt:gh-admin`: repository settings, rulesets, PRs, release checks.
- Planned, **not yet available**: `lint`, `build`, `seo`.

## Skills

| Skill | Command | Invocation | Purpose |
| --- | --- | --- | --- |
| `onboard` | `/sb-context-nuxt:onboard` | command only | Join a project in progress: check the stack, align, migrate, build, next steps |
| `style-align` | `/sb-context-nuxt:style-align` | model or command | Normalize the global style into `main.css`, `theme.css`, `typography.css`, `animation.css` |
| `style-migrate` | `/sb-context-nuxt:style-migrate` | command only | Migrate Vue templates after the global style changed |
| `gh-admin` | `/sb-context-nuxt:gh-admin` | model or command | `gh` CLI: rulesets, repo settings, PRs, release checks |

## What is fixed / what follows `DESIGN.md`

| Concern | Owner | Rule |
| --- | --- | --- |
| **Structure**: the four files and their sections, token naming, the `{p}` prefix, the role names, closed Tailwind namespaces, `@theme` vs `@theme inline`, utilities `{p}-<role>`, base layer for `h1`–`h4`, light/dark mechanics with `data-theme`, `@nuxtjs/color-mode` and `@nuxt/fonts`, breakpoints, `clamp()` only above `display` | **this plugin** | fixed, always enforced |
| **Values and taste**: palette, font families and pairing, type ratios, line heights, letter spacing, weights, radii and shadow values, motion timings and character, how roles are used on a page | **`DESIGN.md` / Impeccable** | if `DESIGN.md` exists, its values win; otherwise the project's current values are kept, normalized |
