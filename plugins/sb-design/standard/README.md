# The style standard

What sb-design fixes in **every** project, whatever its styling engine and framework. The skills read this folder first, then two adapters:

| Layer | Folder | Chosen by | Says |
| --- | --- | --- | --- |
| **standard** | `standard/` (this folder) | always | which files, roles, steps and rules exist; what is structure and what is value |
| **engine** | `engines/<name>/` | `styling.engine.name` of the project profile | how the standard becomes CSS in that engine (tokens, utilities, resets, the example files) |
| **framework** | `frameworks/<adapter>.md` | `adapter` of the project profile | where the style lives, how it is registered, how color mode and fonts are loaded, how UI is written |

Today there is one engine, `tailwind4` (`../engines/tailwind4/README.md`), and one framework, `nuxt` (`../frameworks/nuxt.md`). A project whose profile names another engine or adapter is **out of scope**: the skill says which one is missing and stops; it never improvises one. The profile: `node "<plugin>/core/scripts/profile.mjs" get` (format in `core/references/profile.md`).

## Structure and values

The skill fixes the **structure**. It does not judge or improve the design.

| Concern | Owner | Rule |
| --- | --- | --- |
| **Structure**: the four files and their sections, token naming, the `{p}` prefix, the role names, closed sets, one class per role, base styles for `h1`–`h4` and `body`, light and dark through `data-theme`, breakpoints, `clamp()` only above `display` | **sb-design** (this standard, made concrete by the engine and the framework) | fixed, always enforced |
| **Values and taste**: palette, font families and pairing, type ratios, line heights, letter spacing, weights, radii and shadow values, motion timings and character, how roles are used on a page | **`design-source.md`**, else the **project** | if `design-source.md` exists, its values win; otherwise keep the project's current values, normalized; never impose the example's |

**One exception to "`design-source.md` wins": no eyebrows, ever.** `overline` is for badges, tags, counters, table headers and metadata, never a kicker above a heading, even if `design-source.md` documents one. The same goes for the fixed breakpoints and the 16px floor for running text and inputs.

The engine's `example/` files are the `sb` template (prefix `sb`): the **structural** reference. Its values are never copied into another project. Improving the design is the job of Impeccable (`impeccable@impeccable`), a separate plugin: sb-design never reads or writes its `DESIGN.md`.

## Scope

sb-design covers **only and exclusively the global state**: the four files `main.css`, `theme.css`, `typography.css`, `animation.css` in the project's style folder (`paths.styles` of the profile), plus the few framework settings that register them (the framework file lists which). It **does not touch** components, pages, layouts or component-scoped styles; the one exception is the optional prefix rename, which only replaces the old prefix.

| File | Holds |
| --- | --- |
| `main.css` | the entry point: imports the engine and the other three files, the dark variant, the page-level base styles (`html`, `body`, media, selection) |
| `theme.css` | every literal color, per theme; radii, shadows, breakpoints |
| `typography.css` | the families, the type roles with their values, one class per role, the tag styles |
| `animation.css` | durations, the motion distance, easings, animations, the transition and focus classes, reduced motion |

## The prefix `{p}`

Chosen by the user once, saved in the project settings (`style.prefix`), never a fixed default (`sb` is only the example's). 2–4 lowercase letters or digits, starting with a letter, no hyphens; the engine may forbid more (Tailwind 4: its utility roots). It prefixes the raw variables (`--{p}-bg`, `--{p}-duration-state`) and the classes sb-design defines (`{p}-h1`, `{p}-transition`). Role names exposed by the engine keep no prefix (`primary`, `h1`).

## Fixed rules

- **Closed system**: no default palette, family, weight, text size, shadow, radius, easing or animation of the engine. Everything the project uses is defined by the theme.
- **Type roles** (`typography.md`): the set of roles is fixed; sizes and weights are the project's (or `design-source.md`'s). Two family roles, `display` and `body` (plus `mono` only if the project shows code). Guard rails: running text 1rem floor, inputs never below 16px, prose 45–75ch, `display` at most 6rem, tracking not below −0.04em, adjacent roles visibly distinct.
- **Standard breakpoints**: only `sm` 640, `md` 768, `lg` 1024, `xl` 1280, declared in `theme.css`. Every media query on other widths moves to the nearest breakpoint. Text changes **in steps** at `lg`, only `display`, `h1`, `h2`.
- **`clamp()` only above `display`**: text larger than `display` becomes the `hero` role (`typography.md` §4). Any other `clamp()` on text becomes a stepped role.
- **Literal colors only in `theme.css`** (`roles.md` §3). Both themes exist.
- **Reduced motion** always handled, by zeroing `--{p}-motion-distance`, not the durations (`motion.md` §3).

## Values: how they are treated

**Color** (`roles.md`). The palette belongs to the project (or `design-source.md`). The skill **maps** existing colors onto the roles where the meaning matches and **keeps** project colors without a matching role, with an agreed semantic name; **does not change** existing values on its own initiative (every change is a "To decide" proposal); **derives** missing roles minimally, marked **provisional**; **measures** contrast (4.5:1 text, 3:1 large text, controls, focus) in both themes. Pairs below the minimum come with a lightness-only correction proposal; the choice is the user's. The lightness table in `roles.md` is an *example*, never a rule.

**Radii, shadows, motion** (`roles.md` §5, `motion.md`). Closed sets with the project's values (or `design-source.md`'s), merged into the fixed number of steps.

**Fonts** (`fonts.md`). Only declaration and loading are normalized: two family roles, loaded with only the weights in use. The pairing is never judged; with more than two families in use the skill asks which roles they play and, if the pairing looks unintentional, points to `/impeccable typeset`.

Without `design-source.md`, the project's values are kept and **normalized**: near-duplicates merge into one role (15px and 16px for running text → one `body` value, the more frequent); every remaining size maps to a role; roles the structure needs but the project lacks (a dark value, `on-primary`, a `-soft` tint) are derived minimally, marked **provisional**, and listed for refinement with `/impeccable colorize` or `/impeccable typeset`.

## Specific cases

- **Value equidistant between two steps**: the element's role decides (`typography.md` §6); the report says which and why.
- **Recurring off-scale value**: aligned like the others. The report groups it so the user sees the effect, but it does not become a new role.
- **Several different sizes above `display`**: a single `hero` role, with the most used maximum; the report lists the absorbed values.
- **No dark theme**: propose a minimal derivation, every value marked **provisional**, to be approved.
- **Dark theme on `.dark` or only on `prefers-color-scheme`**: migrate it to `data-theme` (C11). The framework's color mode covers the system preference.
- **Fonts from `@font-face` or a Google `@import`**: they move to the framework's font mechanism (T7).
- **Global variables that are not style** (z-index, layout widths…): they stay outside the four files; the report mentions them without touching them.

## Files

| File | What |
| --- | --- |
| `roles.md` | color roles, contrast, themes, example calibration, closed shapes |
| `typography.md` | type roles, guard rails, steps, `clamp()`, aligning a value to the scale, roles for component text |
| `fonts.md` | family roles and the procedure |
| `motion.md` | duration bands, easings, animations, rules, reduced motion |
| `issues.md` | the issue codes of every report, with the layer that corrects each |
