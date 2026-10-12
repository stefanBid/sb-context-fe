# Issue catalog

Every report item uses a code from this catalog, so the user can find the rule. Severity:

- **Blocking**: the skill stops, or the item must be solved first.
- **Applied**: a **structure** rule; the skill corrects it during the rewrite and the report lists it, without asking.
- **To decide**: the skill makes a proposal and waits for the user's choice.
- **Follows DESIGN.md**: a **value**; if `DESIGN.md` exists it decides, and the report only notes the conflict with the current CSS.
- **Info**: flagged only.

"Applied" is used **only for structure**. Values (palette, sizes, weights, radii, shadows, motion timings) are "To decide" or "Follows DESIGN.md". Without `DESIGN.md`, the project's own values are kept and normalized; anything derived is marked **provisional**.

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
| P10 | `DESIGN.md` conflicts with the current CSS | Follows DESIGN.md | read | `DESIGN.md` wins; list each conflict |

## Structure (files, sections, tokens, naming)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| S1 | File layout differs from the four files (`main`, `theme`, `typography`, `animation`) | Applied | inv | Rewritten into the four files, same sections and order as the example |
| S2 | A file is missing a section of the example (e.g. no `@theme inline`, no base layer, no reduced motion) | Applied | read | Section added |
| S3 | Design tokens declared outside `@theme` / `@theme inline` (plain `:root` for `--color-*`, `--text-*`, …) | Applied | inv | Moved into the right `@theme` block |
| S4 | Raw variables without the `{p}` prefix (`--primary`, `--bg`) | Applied | inv | Renamed to `--{p}-<role>` |
| S5 | Typographic utility without the family (`text-h4` instead of `{p}-h4`), or role utility missing | Applied | read | One utility per role, carrying the family |
| S6 | Role names diverge from the vocabulary (`--text-heading-1`, `--color-text`) | To decide | read | Map to the closed role set; keep project-specific colors with an agreed name |
| S7 | Base layer for `h1`–`h4` or `body` missing | Applied | read | Added from the example |

## Typography (structure; values follow DESIGN.md)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| T1 | Size not in the project's scale, offset toward a single step | To decide | inv | Role of the nearby step (`typography.md` §6) |
| T2 | Size equidistant between two steps | To decide | inv | The element's role; reason in the report |
| T3 | Recurring off-scale size | To decide | inv | Aligned like the others, grouped in the report; no new role |
| T4 | Inverted hierarchy | Applied | inv | Each level in its role |
| T5 | Near-duplicate values for the same role (e.g. 15px and 16px for running text) | To decide | inv | One value, the more frequent |
| T6 | More than two families (besides monospace for code) | To decide | inv | Which roles they play (`fonts.md` §3); pairing: `/impeccable typeset` |
| T7 | Fonts loaded with `@font-face` or a Google `@import` | Applied | inv | `@nuxt/fonts` with `families` in `nuxt.config` |
| T8 | Inputs below 16px | Applied | inv | `body` |
| T9 | Running text below 1rem, prose measure outside 45–75ch, `display` above 6rem, or adjacent roles not visibly distinct | To decide | inv, read | Guard rails of `typography.md` §2 |
| T10 | Letter spacing below −0.04em | To decide | read | Raise to the limit |
| T11 | `clamp()` on a size up to `display` | Applied | inv | Role with stepped breakpoints |
| T12 | Text larger than `display` (with or without `clamp()`) | Applied | inv | `hero` role with the formula in `typography.md` §4 |
| T13 | Sizes in `em` or `%` in the global style | Applied | inv | `rem` via tokens |
| T14 | Missing mobile reduction, or on a breakpoint other than `lg` | Applied | inv | `@variant lg` in the `display`, `h1`, `h2` utilities |
| T15 | `--text-*`, `--font-*`, `--font-weight-*` namespaces not closed | Applied | inv | Resets from the example |
| T16 | Weights in use not covered by the closed weight set | To decide | inv | The set is the weights the faces and roles use; map the rest to the nearest |

## Breakpoints (fixed)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| B1 | Media queries on widths that are not method breakpoints | Applied | inv | Nearest method breakpoint |
| B2 | Tailwind breakpoints redefined with other values, or `2xl` used | Applied | inv, read | `--breakpoint-*: initial` and the method's four |
| B3 | `max-width` media queries in the global style | Applied | inv | Mobile-first, `min-width` |

## Color and theme (structure fixed, values follow DESIGN.md)

| Code | Issue | Severity | Source | Proposal |
| --- | --- | --- | --- | --- |
| C1 | Literal colors outside the theme blocks | Applied | inv | They become variables in `theme.css` (with the role or the agreed name) |
| C2 | Default Tailwind palette not closed | Applied | inv | `--color-*: initial` |
| C3 | Light or dark theme missing | To decide | inv | Minimal derivation, each value marked **provisional**; refine with `/impeccable colorize` |
| C4 | A color of the recommended base is missing (`method.md` §1) | To decide | con, read | Minimal derivation, **provisional** |
| C5 | A pure hue name for a specific meaning (`--blue` used for links) | To decide | read | The role name |
| C6 | Project color without a matching role | To decide | read | Stays, with an agreed semantic name |
| C7 | Contrast below the minimum (4.5:1 text, 3:1 large text, controls, focus) | To decide | con | Lightness-only correction, before and after |
| C8 | Color values differ from `DESIGN.md` | Follows DESIGN.md | read | `DESIGN.md` wins |
| C9 | Same color for decorative and control borders | To decide | read | Separate `border` and `border-strong` |
| C10 | Secondary text made with opacity | To decide | inv | An `ink-muted` color |
| C11 | Theme on `.dark` or only on `prefers-color-scheme`, without `data-theme` | Applied | inv | `[data-theme="dark"]` and `@custom-variant dark` |
| C12 | `color-scheme` missing | Applied | inv | One per theme in `theme.css` |
| C13 | Tailwind colors mapped with a plain `@theme` onto `var()` | Applied | read | `@theme inline` |

## Shapes, shadows (closed sets, project values)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| F1 | Scattered radii, not reducible to a few steps | To decide | inv | Three or four steps from the project's values or `DESIGN.md` |
| F2 | Scattered shadows, or identical in both themes | To decide | inv | Three levels per theme |
| F3 | `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*` namespaces not closed | Applied | inv | Resets from the example |

## Motion (structure fixed, timings follow DESIGN.md)

| Code | Issue | Severity | Source | Correction |
| --- | --- | --- | --- | --- |
| M1 | `prefers-reduced-motion` missing, or it zeroes every duration | Applied | inv | `--{p}-motion-distance` approach from `motion.md` §3; opacity, color and state transitions kept |
| M2 | `transition: all` | Applied | inv | `{p}-transition` or explicit properties |
| M3 | Scattered durations outside the four bands | To decide | inv | Nearest band token |
| M4 | Animating layout properties | To decide | inv | Prefer `opacity` and `transform`; keep it if deliberate |
| M5 | Duplicate keyframes | Applied | inv | Merged |
| M6 | Easings not in the closed set (`ease-out`, `ease-in`, `ease-in-out`) | Applied | inv | Tokens from `motion.md` |

## Component impact (only if the user asked for it)

Analyzed only with `inventory.mjs --classes`. The skill **does not modify** components: it lists the classes with their replacement.

| Code | Situation | Severity |
| --- | --- | --- |
| I1 | Default palette, text, radius, shadow, weight, easing classes | Info: they stop applying |
| I2 | Arbitrary values (`text-[15px]`, `bg-[#…]`) | Info: they bypass the theme |
| I3 | `rounded-sm/md/lg/xl`, `shadow-sm/md/lg` | Info: they still exist but change value |
| I4 | `dark:` on colors | Info: with roles it is usually redundant |
