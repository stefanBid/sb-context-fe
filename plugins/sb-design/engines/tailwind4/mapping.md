# Mapping: from old classes to theme roles

Part of the **Tailwind 4 engine**: the classes below are Tailwind's. The roles are the standard's (`../../standard/`).

The script proposes; the agent decides by looking at the line, the tag, the siblings and the meaning of the element. The script's proposals are ordered by plausible role, not by certainty.

## 1. Principles

- **Role before similarity.** A dark gray used for a paragraph is `ink-muted` even if the closest theme color is another one. The color is chosen for what the element *does*.
- **The tag says the structure, the class says the look.** `h1`…`h4` already get their style from the base layer: a size class on a heading is removed, unless the look must differ from the level (`<h3 class="{p}-h4">`).
- **A role utility replaces a group.** `{p}-body-strong` carries family, size, line height and weight: when you add it, also remove the `font-*`, `leading-*`, `tracking-*` classes on the same element that described the same thing.
- **Theme colors change on their own in dark mode.** `dark:` classes on colors are removed when the base class with the right role sits next to them. They stay only if the element really must behave differently in the two themes.
- **Heading levels: proposal only.** Changing `h1` to `h2`, or a `div` into a heading, changes the page structure: it is always "To decide".

## 2. Text

Text roles are matched against **the project's scale** (the `--text-<role>` tokens the script reads), not against px ranges. The size of the old class picks the nearest token; the element's role breaks ties.

| Situation | Role |
| --- | --- |
| text of an `h1`…`h4` with the same size as its level | no class |
| heading that must look like another level | `{p}-hN` of the intended level |
| bold `div`/`span` at heading size (card title, section title) | `{p}-h4` or `{p}-h3`; if it really is a heading, also propose the tag (To decide) |
| intro paragraph below a heading | `{p}-lead` |
| running text | `{p}-body` |
| emphasis, values, button text | `{p}-body-strong` |
| `label`, chips, tabs | `{p}-label` |
| help, errors, metadata, captions | `{p}-small` |
| small uppercase (`uppercase`, `tracking-*`) used for badges, tags, counters, table headers, metadata | `{p}-overline` (also removes `uppercase` and `tracking-*`) |
| larger than `display` | `{p}-hero` if the theme has it; otherwise `{p}-display` and a note for the global style |
| `text-{role}` without family (`text-h4`) | `{p}-{role}` |

Small uppercase text that works as a kicker above a heading is not an `overline` case: there is no role for it. Flag it under "To decide" (usually removed or turned into `{p}-small`).

When the old size is equidistant between two of the project's tokens, the element decides: text to read → the body-side role, secondary → `small`, uppercase label → `overline`, bold → the strong or heading-side role.

## 3. Weights and families

- `font-medium` (500): `font-semibold` if the element must stand out (label, active item), `font-normal` if the 500 was just a habit. If the element takes a role utility, the role provides the weight and the class is removed.
- `font-light`, `font-thin`: `font-normal`.
- `font-extrabold`, `font-black`: `font-bold`.
- `font-sans` → `font-body`; `font-serif` → `font-display` only if the display family is a serif, otherwise removed.

## 4. Color

| Property | Roles to consider first |
| --- | --- |
| text | `ink`, `ink-muted`, `primary` (links), `accent-ink`, states |
| white or black text on a fill | `on-primary`, `on-accent`, `on-error` (on a solid `error` fill) |
| page or section background | `bg`, `surface`, `surface-2` |
| button and action background | `primary` (`hover:` `primary-hover`), `accent` (`hover:` `accent-hover`) |
| light highlight background, selected chips | `primary-soft`, state `-soft` tints |
| decorative borders, dividers | `border` |
| input, select, checkbox borders | `border-strong` |
| focus `ring`, `outline` | `focus-ring` |
| state colors (red, green, yellow, informational blue) | `error`, `success`, `warning`, `info` with their `-soft` |

The project's own colors (e.g. `brand-secondary`) count as roles: the script proposes them when they are close, the agent uses them if the meaning matches.

Opacity (`bg-primary/10`) is kept if it was there; if it served to get a light tint, the matching `-soft` tint is almost always better.

## 5. Radii, shadows, motion, breakpoints

- Radii: the script proposes the nearest theme step. Bare `rounded` and `rounded-xs` become `rounded-sm`; `rounded-full` and `rounded-none` stay.
- Shadows: `shadow` and `shadow-xs` → `shadow-sm`; `shadow-xl`, `shadow-2xl` → `shadow-lg`; `shadow-inner` → To decide.
- Easings: `ease-in` → `ease-in`, `ease-out` → `ease-out`, `ease-in-out` → `ease-in-out`, **only if those tokens exist in the theme**; otherwise report. `transition` + `duration-*` + `ease-*` on controls → `{p}-transition`; other durations map to the nearest `--{p}-duration-feedback|state|layout|entrance` band.
- Default animations (`animate-pulse`, `animate-bounce`, `animate-ping`): To decide, usually removed; `animate-spin` stays if the theme defines it.
- Breakpoints: `2xl:` → `xl:`. Arbitrary values (`min-[900px]:`) → the nearest method breakpoint.

## 6. Arbitrary values and inline styles

- `text-[15px]`, `bg-[#…]`, `rounded-[12px]`: replaced with the role, like a broken class.
- `style="…"` with colors, sizes, weights, radii, shadows: moved into classes and the attribute removed. Dynamic `:style`: flagged only, because the value depends on the code.

## 7. Component `<style>`

- Literal colors → `var(--color-{role})`.
- Hand-written `font-size`, `font-weight`, `font-family`, `line-height` → `@apply {p}-{role};` (removing the replaced declarations).
- To use `@apply` with theme utilities, the block must start with `@reference` to the global `main.css` (Tailwind 4 does not know the theme inside component `<style>` blocks without this line). The exact line, with the framework's path alias, is in the framework file.
- `<style scoped>` stays `scoped`: the refactor does not move anything into the global style.
