# Issue catalog

Every report item uses a code from this catalog, so the user can find the rule. Severity:

- **Blocking**: the skill stops, or the item must be solved first.
- **Applied**: a rigid rule; the skill corrects it during the rewrite and the report lists it, without asking.
- **To decide**: the skill makes a proposal and waits for the user's choice.
- **Info**: flagged only.

The rigid rules are context, prefix, type scale, breakpoints and namespace closure. Color and fonts are flexible: almost all their items are "To decide".

The "Source" column says where the issue is found: `inv` = `inventory.mjs`, `con` = `contrast.mjs`, `read` = reading the files.

## Project and structure

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| P1 | Tailwind < 4 or Nuxt < 4 | Blocking | inv | The skill stops: out of scope |
| P2 | `@nuxtjs/tailwindcss`, `@tailwind`, `@config`, `tailwind.config.*` (Tailwind 3) | Blocking | inv, read | Out of scope until the project uses `@tailwindcss/vite` |
| P3 | `@nuxtjs/color-mode` or `@nuxt/fonts` not installed or not in `modules` | Applied | inv | `npx nuxi module add color-mode` / `npx nuxi module add fonts` |
| P4 | `colorMode` without `dataValue: 'theme'` or `classSuffix: ''` | Applied | inv | Configuration from the example |
| P5 | Global CSS in SCSS/Sass | Blocking | inv | Must be converted to CSS before proceeding |
| P6 | Global style scattered across files or outside `assets/css` | Applied | inv | Gathered into the four files |
| P7 | CSS files in `assets` not linked from `nuxt.config` | To decide | inv | Include them or leave them out (never deleted) |
| P8 | `<style>` without `scoped` in `.vue` files (global state outside `assets`) | To decide | inv | Move their rules into the four files and remove the block |
| P9 | More than one CSS entry point in `nuxt.config` | Applied | inv | Only `~/assets/css/main.css` |

## Typography (rigid scale)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| T1 | Off-scale size, offset toward a single step | Applied | inv | Role of the nearby step (`typography.md` §2) |
| T2 | Size equidistant between two steps | Applied | inv | The element's role; reason in the report |
| T3 | Recurring off-scale size | Applied | inv | Aligned like the others, grouped in the report; no new role |
| T4 | Inverted hierarchy | Applied | inv | Each level in its role |
| T5 | Weights outside 400/600/700 | Applied | inv | The role's weight |
| T6 | More than two families (besides monospace for code) | To decide | inv | Which two to keep for `display` and `body` (`fonts.md` §3) |
| T7 | Fonts loaded with `@font-face` or a Google `@import` | Applied | inv | `@nuxt/fonts` with `families` in `nuxt.config` |
| T8 | Inputs below 16px | Applied | inv | `body` (16px) |
| T9 | Line height out of proportion or off the 2px grid | Applied | inv | The role's line height |
| T10 | Letter spacing outside the role; uppercase without spacing | Applied | read | The role's letter spacing |
| T11 | `clamp()` on a size up to `display` | Applied | inv | Role with stepped breakpoints |
| T12 | Text larger than `display` (with or without `clamp()`) | Applied | inv | `hero` role with the formula in `typography.md` §4 |
| T13 | Sizes in `em` or `%` in the global style | Applied | inv | `rem` via tokens |
| T14 | Missing mobile reduction, or on a breakpoint other than `lg` | Applied | inv | `@variant lg` in the `display`, `h1`, `h2` utilities |
| T15 | `--text-*`, `--font-*`, `--font-weight-*` namespaces not closed | Applied | inv | Resets from the example |
| T16 | Family pair not harmonious, or a family unsuited to its role | To decide | inv, read | The user chooses which one to keep; 2–3 alternatives for the other, never change both (`fonts.md`) |

## Breakpoints (rigid)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| B1 | Media queries on widths that are not method breakpoints | Applied | inv | Nearest method breakpoint |
| B2 | Tailwind breakpoints redefined with other values, or `2xl` used | Applied | inv, read | `--breakpoint-*: initial` and the method's four |
| B3 | `max-width` media queries in the global style | Applied | inv | Mobile-first, `min-width` |

## Color and theme (flexible)

| Code | Issue | Severity | Source | Proposal |
| --- | --- | --- | --- | --- |
| C1 | Literal colors outside the theme blocks | Applied | inv | They become variables in `theme.css` (with the role or the agreed name) |
| C2 | Default Tailwind palette not closed | Applied | inv | `--color-*: initial` |
| C3 | Light or dark theme missing | To decide | inv | Full derivation from `method.md` §3, each value marked "derived" |
| C4 | A color of the recommended base is missing (`method.md` §1) | To decide | con, read | Value derived from the closest hue |
| C5 | A pure hue name for a specific meaning (`--blue` used for links) | To decide | read | The role name |
| C6 | Project color without a matching role | To decide | read | Stays, with an agreed semantic name |
| C7 | Contrast below the minimum | To decide | con | Lightness-only correction, before and after |
| C8 | Dark theme by inversion (`ink` pure white, `bg` pure black) | To decide | con | Dark calibration lightness |
| C9 | `on-primary` fixed white in dark mode with a light primary | To decide | con | Ink in the primary's hue |
| C10 | Surface lightness order far from the method | Info | con | Flagged with the calibration values |
| C11 | Same color for decorative and control borders | To decide | read | Separate `border` and `border-strong` |
| C12 | Secondary text made with opacity | To decide | inv | An `ink-muted` color |
| C13 | Obvious imbalance of use (primary as section background, several accents) | Info | read | Note in the report, no change |
| C14 | Theme on `.dark` or only on `prefers-color-scheme`, without `data-theme` | Applied | inv | `[data-theme="dark"]` and `@custom-variant dark` |
| C15 | `color-scheme` missing | Applied | inv | One per theme in `theme.css` |
| C16 | Tailwind colors mapped with a plain `@theme` onto `var()` | Applied | read | `@theme inline` |

## Shapes, shadows (closed sets, adapted values)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| F1 | Scattered radii, not reducible to a few steps | To decide | inv | Four steps in the proportion of `method.md` §6 |
| F2 | Scattered shadows, or identical in both themes | To decide | inv | Three levels per theme |
| F3 | `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*` namespaces not closed | Applied | inv | Resets from the example |

## Motion

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| M1 | `prefers-reduced-motion` missing | Applied | inv | Block from the example |
| M2 | `transition: all` | Applied | inv | `{p}-transition` or explicit properties |
| M3 | Scattered durations or above 400ms | Applied | inv | Nearest token |
| M4 | Animating layout properties | Applied | inv | `opacity` and `transform` |
| M5 | Duplicate keyframes | Applied | inv | Merged |

## Component impact (only if the user asked for it)

Analyzed only with `inventory.mjs --classes`. The skill **does not modify** components: it lists the classes with their replacement.

| Code | Situation | Severity |
| --- | --- | --- |
| I1 | Default palette, text, radius, shadow, weight, easing classes | Info: they stop applying |
| I2 | Arbitrary values (`text-[15px]`, `bg-[#…]`) | Info: they bypass the theme |
| I3 | `rounded-sm/md/lg/xl`, `shadow-sm/md/lg` | Info: they still exist but change value |
| I4 | `dark:` on colors | Info: with roles it is usually redundant |
