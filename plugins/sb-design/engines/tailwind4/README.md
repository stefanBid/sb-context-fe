# Engine: Tailwind 4

How the standard (`../../standard/`) becomes CSS with **Tailwind 4**. Used when the project profile says `styling.engine.name: "tailwind4"`. Where the files live and how Tailwind is plugged into the build is the framework's file (`../../frameworks/<adapter>.md`: `nuxt.md`, `vue-vite.md`).

`example/` is the `sb` template written with this engine: **the structure to replicate file by file** (same sections, same order, same resets). Its values are never copied into another project.

## Requirements

- **Tailwind 4**. With Tailwind 3 (`tailwind.config.*`, `@tailwind`, `@config`, `@nuxtjs/tailwindcss`) the skill stops and says so (P2). Global CSS in SCSS/Sass stops it too (P5): it must be converted to CSS first. No adaptation.

## Closed system

Every namespace the project could take from Tailwind's defaults is reset first, then filled with the project's values:

```css
--color-*: initial;  --font-*: initial;  --font-weight-*: initial;  --text-*: initial;  --text-shadow-*: initial;
--radius-*: initial; --shadow-*: initial; --inset-shadow-*: initial; --drop-shadow-*: initial;
--ease-*: initial;   --animate-*: initial; --breakpoint-*: initial;
```

Only static utilities remain: `transparent`, `current`, `inherit`, `rounded-none`, `rounded-full`, `shadow-none`. Spacing stays Tailwind's 4px grid (`--spacing: 0.25rem`). The closed namespaces checked after writing: `color, font, text, shadow, radius, font-weight, inset-shadow, drop-shadow, text-shadow, ease, animate, breakpoint`.

## Colors and themes (`theme.css`)

- Raw values per theme, prefixed: `--{p}-primary` in `:root, [data-theme="light"]` and in `[data-theme="dark"]` (`../../standard/roles.md` §3).
- Tailwind colors are mapped in `@theme inline` (`--color-primary: var(--{p}-primary);`), so utilities read `var(--{p}-*)` on the element and also follow a nested `data-theme`. A plain `@theme` onto `var()` is corrected (C13).
- Tailwind token names are the roles without a prefix (`--color-primary` → `bg-primary`); the prefix goes on the raw variables and on the skill's utilities (`{p}-h1`).
- The `dark:` variant follows `data-theme`, declared in `main.css`: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`. With semantic roles it is rarely needed.
- Radii, shadows (one value per theme, through the raw variables) and the four breakpoints live in `theme.css`: `--breakpoint-*: initial`, then `--breakpoint-sm: 40rem` … `--breakpoint-xl: 80rem` (B2).

## Type (`typography.css`)

Families, inside `@theme`, with `--font-*: initial` first, each with a system fallback stack, and `--default-font-family: var(--font-body)`. The weights in use: `--font-weight-*: initial`, then one token per weight.

Token shape, one block per role, inside `@theme`:

```css
--text-<role>: <size>;
--text-<role>--line-height: <value>;
--text-<role>--font-weight: <weight>;
--text-<role>--letter-spacing: <value>;   /* only when the role needs it */
```

The `--text-*` values are the **desktop** values.

Utilities and the base layer, with the `{p}` prefix:

- one utility per role: `{p}-display`, `{p}-h1` … `{p}-overline`. Each carries the family and the complete style (`@apply font-… text-…`), never the color;
- `{p}-display`, `{p}-h1`, `{p}-h2` have the mobile size and an `@variant lg` block with the desktop size;
- `{p}-overline` adds `uppercase`;
- in `@layer base`: `h1`…`h4` apply their role's utility; `body` applies `{p}-body` (in `main.css`).

The `hero` role (`../../standard/typography.md` §4), without `@variant`:

```css
@theme {
  --text-hero: clamp(3.25rem, 1.5rem + 4.375vw, 5rem);
  --text-hero--line-height: 1.04;      /* unitless: follows the size */
  --text-hero--font-weight: 700;
  --text-hero--letter-spacing: -0.025em;
}
@utility {p}-hero { @apply font-display text-hero; }
```

A `clamp()` on a size up to `display` becomes a stepped role (T11). Text tokens outside `@theme`, or namespaces not reset, are corrected (S3, T15).

## Motion (`animation.css`)

Tailwind 4 has no namespace for durations: they are raw variables with the prefix (`--{p}-duration-feedback` …), with `--{p}-motion-distance`. Easings and animations are Tailwind tokens in `@theme`, with `--ease-*: initial` and `--animate-*: initial` first; keyframes sit in the same block. The utilities `{p}-transition` (and `{p}-focus`, `{p}-focus-within`, `{p}-no-focus` when the project uses them) are `@utility` blocks.

## The prefix

On top of the standard's rules (`../../standard/README.md`), the prefix cannot match a Tailwind utility root (`p`, `m`, `w`, `h`, `bg`, `text`, `font`, `border`, `rounded`, `shadow`, `flex`, `grid`, `gap`, `ring`, `top`, `size`, `col`, `row`, `sr`, `dark`, `ease`, `animate`, `inset`, `space`, `divide`, `outline`, `fill`, `stroke`): `{p}-h1` would collide with a real utility.

## Templates and components

- Classes only from the project's theme and utilities (`bg-primary`, `text-on-primary`, `{p}-body-strong`, `rounded-md`, `shadow-sm`, the theme's durations and easings). A class the theme does not generate is broken; arbitrary values (`text-[15px]`, `bg-[#…]`) bypass the theme.
- From an old class to a role: `mapping.md` (role before similarity).
- A component `<style>` block that uses `@apply` with theme utilities starts with `@reference` to the global entry file (the path, with the framework's alias, is in the framework file).

## Issue corrections (engine codes)

| Code | With Tailwind 4 |
| --- | --- |
| P2 | Tailwind 3 setup: stop; the project moves to Tailwind 4 first |
| P5 | SCSS global style: stop; converted to CSS first |
| S3 | `--color-*`, `--text-*` … declared in a plain `:root`: moved into `@theme` / `@theme inline` |
| S5 | `text-h4` used without the family: one `{p}-<role>` utility per role, carrying the family |
| B2 | Breakpoints redefined or `2xl` used: `--breakpoint-*: initial` and the four |
| T11 | `clamp()` on a size up to `display`: a role whose utility steps with `@variant lg` |
| T15 | `--text-*`, `--font-*`, `--font-weight-*` not reset: the resets of `example/typography.css` |
| C2 | Default palette not closed: `--color-*: initial` |
| C13 | Colors mapped with a plain `@theme` onto `var()`: `@theme inline` |
| F3 | Radius, shadow, inset/drop/text shadow namespaces not reset: the resets of `example/theme.css` |

## Verification

1. The inventory on the entry file (`main.css`): every size with offset 0, no media query outside the breakpoints, no literal color outside `theme.css`, the closed namespaces above.
2. Contrast of `theme.css` with the prefix: as approved in the report.

## Files

| File | What |
| --- | --- |
| `example/main.css`, `theme.css`, `typography.css`, `animation.css` | the four files of the `sb` template |
| `mapping.md` | from old classes to theme roles, for `/sb-design:migrate` and `/sb-design:extract-ui` |
