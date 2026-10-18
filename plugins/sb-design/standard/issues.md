# Issue catalog

Part of the **standard**. Every report item uses a code from this catalog, so the user can find the rule. The codes are the same on every stack; the **Layer** column says whose file holds the correction: `standard` (this folder), `engine` (`../engines/tailwind4/README.md`), `framework` (`../frameworks/nuxt.md`, section *Issue corrections*). For a `framework` code the correction below is the rule; the framework file says how it is done there.

Severity:

- **Blocking**: the skill stops, or the item must be solved first.
- **Applied**: a **structure** rule; the skill corrects it during the rewrite and the report lists it, without asking.
- **To decide**: the skill makes a proposal and waits for the user's choice.
- **Follows design-source.md**: a **value**; if `design-source.md` exists it decides, and the report only notes the conflict with the current CSS.
- **Info**: flagged only.

"Applied" is used **only for structure**. Values (palette, sizes, weights, radii, shadows, motion timings) are "To decide" or "Follows design-source.md". Without `design-source.md`, the project's own values are kept and normalized; anything derived is marked **provisional**.

The "Source" column says where the issue is found: `inv` = `inventory.mjs`, `con` = `contrast.mjs`, `read` = reading the files.

## Project and structure

| Code | Issue | Severity | Source | Correction | Layer |
| --- | --- | --- | --- | --- | --- |
| P1 | The framework below the supported version (Nuxt < 4, Vue < 3, Vite < 5.2) | Blocking | inv | The skill stops: out of scope | framework |
| P2 | The engine below the supported version: Tailwind 3 (`@nuxtjs/tailwindcss`, `@tailwind`, `@config`, `tailwind.config.*`) | Blocking | inv, read | Out of scope until the project uses Tailwind 4 | engine |
| P3 | The framework's color-mode or font mechanism missing | Applied | inv | Installed and registered | framework |
| P4 | Color mode not writing `data-theme` on `<html>` | Applied | inv | Configured to write `data-theme` | framework |
| P5 | Global CSS in SCSS/Sass | Blocking | inv | Must be converted to CSS before proceeding | engine |
| P6 | Global style scattered across files or outside the style folder (`paths.styles` of the profile) | Applied | inv | Gathered into the four files | standard |
| P7 | CSS files in the source folder not linked from the global style | To decide | inv | Include them or leave them out (never deleted) | standard |
| P8 | `<style>` without `scoped` in `.vue` files (global state outside `assets`) | To decide | inv | Move their rules into the four files and remove the block | standard |
| P9 | More than one global CSS entry point registered | Applied | inv | Only `main.css` is registered | framework |
| P10 | `design-source.md` conflicts with the current CSS | Follows design-source.md | read | `design-source.md` wins; list each conflict | standard |
| P11 | Eyebrow or kicker usage (`overline` above a heading) in the CSS, `design-source.md` or the brand book | Applied | read | Removed, always: it wins over `design-source.md`. List it in the report | standard |

## Structure (files, sections, tokens, naming)

| Code | Issue | Severity | Source | Correction | Layer |
| --- | --- | --- | --- | --- | --- |
| S1 | File layout differs from the four files (`main`, `theme`, `typography`, `animation`) | Applied | inv | Rewritten into the four files, same sections and order as the example | standard |
| S2 | A file is missing a section of the example (e.g. no `@theme inline`, no base layer, no reduced motion) | Applied | read | Section added | standard |
| S3 | Design tokens declared outside `@theme` / `@theme inline` (plain `:root` for `--color-*`, `--text-*`, …) | Applied | inv | Moved into the right `@theme` block | engine |
| S4 | Raw variables without the `{p}` prefix (`--primary`, `--bg`) | Applied | inv | Renamed to `--{p}-<role>` | standard |
| S5 | Typographic utility without the family (`text-h4` instead of `{p}-h4`), or role utility missing | Applied | read | One utility per role, carrying the family | engine |
| S6 | Role names diverge from the vocabulary (`--text-heading-1`, `--color-text`) | To decide | read | Map to the closed role set; keep project-specific colors with an agreed name | standard |
| S7 | Base layer for `h1`–`h4` or `body` missing | Applied | read | Added from the example | standard |

## Typography (structure; values follow design-source.md)

| Code | Issue | Severity | Source | Correction | Layer |
| --- | --- | --- | --- | --- | --- |
| T1 | Size not in the project's scale, offset toward a single step | To decide | inv | Role of the nearby step (`typography.md` §6) | standard |
| T2 | Size equidistant between two steps | To decide | inv | The element's role; reason in the report | standard |
| T3 | Recurring off-scale size | To decide | inv | Aligned like the others, grouped in the report; no new role | standard |
| T4 | Inverted hierarchy | Applied | inv | Each level in its role | standard |
| T5 | Near-duplicate values for the same role (e.g. 15px and 16px for running text) | To decide | inv | One value, the more frequent | standard |
| T6 | More than two families (besides monospace for code) | To decide | inv | Which roles they play (`fonts.md` §3); pairing: `/impeccable typeset` | standard |
| T7 | Fonts loaded with `@font-face` or a Google `@import` | Applied | inv | The framework's font mechanism, with the weights in use | framework |
| T8 | Inputs below 16px | Applied | inv | `body` | standard |
| T9 | Running text below 1rem, prose measure outside 45–75ch, `display` above 6rem, or adjacent roles not visibly distinct | To decide | inv, read | Guard rails of `typography.md` §2 | standard |
| T10 | Letter spacing below −0.04em | To decide | read | Raise to the limit | standard |
| T11 | `clamp()` on a size up to `display` | Applied | inv | Role with stepped breakpoints | engine |
| T12 | Text larger than `display` (with or without `clamp()`) | Applied | inv | `hero` role with the formula in `typography.md` §4 | standard |
| T13 | Sizes in `em` or `%` in the global style | Applied | inv | `rem` via tokens | standard |
| T14 | Missing mobile reduction, or on a breakpoint other than `lg` | Applied | inv | `@variant lg` in the `display`, `h1`, `h2` utilities | standard |
| T15 | `--text-*`, `--font-*`, `--font-weight-*` namespaces not closed | Applied | inv | Resets from the example | engine |
| T16 | Weights in use not covered by the closed weight set | To decide | inv | The set is the weights the faces and roles use; map the rest to the nearest | standard |

## Breakpoints (fixed)

| Code | Issue | Severity | Source | Correction | Layer |
| --- | --- | --- | --- | --- | --- |
| B1 | Media queries on widths that are not method breakpoints | Applied | inv | Nearest method breakpoint | standard |
| B2 | Tailwind breakpoints redefined with other values, or `2xl` used | Applied | inv, read | `--breakpoint-*: initial` and the method's four | engine |
| B3 | `max-width` media queries in the global style | Applied | inv | Mobile-first, `min-width` | standard |

## Color and theme (structure fixed, values follow design-source.md)

| Code | Issue | Severity | Source | Proposal | Layer |
| --- | --- | --- | --- | --- | --- |
| C1 | Literal colors outside the theme blocks | Applied | inv | They become variables in `theme.css` (with the role or the agreed name) | standard |
| C2 | Default Tailwind palette not closed | Applied | inv | `--color-*: initial` | engine |
| C3 | Light or dark theme missing | To decide | inv | Minimal derivation, each value marked **provisional**; refine with `/impeccable colorize` | standard |
| C4 | A color of the recommended base is missing (`method.md` §1) | To decide | con, read | Minimal derivation, **provisional** | standard |
| C5 | A pure hue name for a specific meaning (`--blue` used for links) | To decide | read | The role name | standard |
| C6 | Project color without a matching role | To decide | read | Stays, with an agreed semantic name | standard |
| C7 | Contrast below the minimum (4.5:1 text, 3:1 large text, controls, focus) | To decide | con | Lightness-only correction, before and after | standard |
| C8 | Color values differ from `design-source.md` | Follows design-source.md | read | `design-source.md` wins | standard |
| C9 | Same color for decorative and control borders | To decide | read | Separate `border` and `border-strong` | standard |
| C10 | Secondary text made with opacity | To decide | inv | An `ink-muted` color | standard |
| C11 | Theme on `.dark` or only on `prefers-color-scheme`, without `data-theme` | Applied | inv | `[data-theme="dark"]`, written by the framework's color mode; the engine's dark variant follows it | framework |
| C12 | `color-scheme` missing | Applied | inv | One per theme in `theme.css` | standard |
| C13 | Tailwind colors mapped with a plain `@theme` onto `var()` | Applied | read | `@theme inline` | engine |

## Shapes, shadows (closed sets, project values)

| Code | Issue | Severity | Source | Correction | Layer |
| --- | --- | --- | --- | --- | --- |
| F1 | Scattered radii, not reducible to a few steps | To decide | inv | Three or four steps from the project's values or `design-source.md` | standard |
| F2 | Scattered shadows, or identical in both themes | To decide | inv | Three levels per theme | standard |
| F3 | `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--text-shadow-*` namespaces not closed | Applied | inv | Resets from the example | engine |

## Motion (structure fixed, timings follow design-source.md)

| Code | Issue | Severity | Source | Correction | Layer |
| --- | --- | --- | --- | --- | --- |
| M1 | `prefers-reduced-motion` missing, or it zeroes every duration | Applied | inv | `--{p}-motion-distance` approach from `motion.md` §3; opacity, color and state transitions kept | standard |
| M2 | `transition: all` | Applied | inv | `{p}-transition` or explicit properties | standard |
| M3 | Scattered durations outside the four bands | To decide | inv | Nearest band token | standard |
| M4 | Animating layout properties | To decide | inv | Prefer `opacity` and `transform`; keep it if deliberate | standard |
| M5 | Duplicate keyframes | Applied | inv | Merged | standard |
| M6 | Easings not in the closed set (`ease-out`, `ease-in`, `ease-in-out`) | Applied | inv | Tokens from `motion.md` | standard |

## Component impact (only if the user asked for it)

Analyzed only with `inventory.mjs --classes`. The skill **does not modify** components: it lists the classes with their replacement.

| Code | Situation | Severity |
| --- | --- | --- |
| I1 | Default palette, text, radius, shadow, weight, easing classes | Info: they stop applying |
| I2 | Arbitrary values (`text-[15px]`, `bg-[#…]`) | Info: they bypass the theme |
| I3 | `rounded-sm/md/lg/xl`, `shadow-sm/md/lg` | Info: they still exist but change value |
| I4 | `dark:` on colors | Info: with roles it is usually redundant |
