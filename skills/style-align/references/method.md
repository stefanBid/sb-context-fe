# Method: color roles, light and dark themes, shapes

The skill applies the **structure**, not the values. Every project keeps its own palette, radii and shadows. What is fixed: the role names, where literal colors live, how light and dark work, the closed namespaces. What follows `DESIGN.md` (or, without it, the project's current values): the colors themselves, radii, shadow values, how roles are used on a page. Taste is Impeccable's job.

If `DESIGN.md` exists its palette wins over the CSS; report any conflict. Without it, keep the project's colors. Roles the structure needs but the project lacks (a dark value, `on-primary`, a `-soft` tint) are derived minimally, marked **provisional**, and listed for refinement with `/impeccable colorize`.

## 1. Roles: a reference vocabulary

Where a project color has the same meaning as a role, it takes the role's name. That way new components always find `bg-surface`, `text-ink-muted` or `bg-primary` without guessing.

| Group | Roles | What they are for |
| --- | --- | --- |
| Surfaces | `bg`, `surface`, `surface-2` | page; cards, forms and panels; section headers and summaries |
| Borders | `border`, `border-strong` | decorative dividers; input and control borders |
| Text | `ink`, `ink-muted` | main text; secondary text, help, placeholders |
| Primary | `primary`, `primary-hover`, `on-primary`, `primary-soft` | actions, links, selection, focus; text on top; relief tint |
| Accent | `accent`, `accent-hover`, `on-accent`, `accent-ink` | a secondary highlight color; `accent-ink` when it has to be text |
| States | `success`, `error`, `warning`, `info` and their `-soft` | feedback |
| Focus | `focus-ring` | focus ring, usually an alias of `primary` |

**Recommended base.** A theme holds up with: `bg`, `surface`, `border`, `ink`, `ink-muted`, `primary`, `on-primary`, `focus-ring`. If one is missing, the skill derives it (provisional). The other roles are added when the project needs them (a form that shows errors needs `error` and `error-soft`), not to fill the table.

**Project colors without a matching role** stay:

- a second brand color, a category color, an illustration color → a semantic name agreed with the user (`brand-secondary`, `highlight`, `category-travel`);
- a numeric scale (`brand-50` … `brand-900`) → stays if the project really uses it; if it uses two or three steps, the skill proposes giving those steps a role;
- a pure hue name (`--blue`, `--gray-700`) for a color that has a meaning → the skill proposes the role name.

Every color, role or project-specific, has a value for the light theme and one for the dark theme. Neutral grays are valid; there is no rule about tinting.

## 2. Contrast

Always measured with `scripts/contrast.mjs`, never by eye, in **both themes**. Pairs below the minimum go into the report with a proposal; the decision is the user's, and a pair kept below the minimum by choice is still flagged in the final summary. Minimums (WCAG AA):

- text: **4.5:1** on the surfaces where it actually appears;
- large text, control borders, focus ring, icons without text: **3:1**;
- decorative `border`: no requirement, but it must remain distinguishable from `surface`.

Two colors that must be told apart (for example success and error) differ in lightness, not only in hue. When a correction is needed, move **only lightness** (never the hue) and show before and after.

## 3. Theme mechanics (Nuxt + Tailwind 4)

- Raw values live in `theme.css`: `:root, [data-theme="light"]` for light, `[data-theme="dark"]` for dark, each with `color-scheme`.
- `@nuxtjs/color-mode` with `dataValue: 'theme'` and `classSuffix: ''` writes `data-theme` on `<html>` before the first render, with `preference: 'system'` and `fallback: 'light'`.
- Tailwind's `dark:` variant follows `data-theme` (`@custom-variant dark` in `main.css`). With semantic roles it is rarely needed: the color changes on its own.
- Tailwind colors are mapped in `@theme inline`, so utilities read `var(--{p}-*)` on the element and also follow a nested `data-theme`.
- Tailwind token names are the roles without a prefix (`--color-primary` → `bg-primary`); the prefix goes on the raw variables (`--{p}-primary`) and on the skill's utilities (`{p}-h1`).
- The dark theme is **not** an inversion by definition of the structure: each role has its own dark value. A project without a dark theme gets a derived one, provisional.

## 4. Example calibration

**Non-normative.** OKLCH lightness (L from 0 to 1) measured on a reference project (not the `example/` files). Use it only as a starting point to derive a *missing* value, then check contrast. Never use it to correct an existing color.

### Light theme

| Role | L | Note |
| --- | --- | --- |
| `surface` | 1.00 | |
| `bg` | 0.96 | |
| `surface-2` | 0.94 | |
| `border` | 0.87 | decorative |
| `border-strong` | 0.65 | ≥ 3:1 on `surface` |
| `ink-muted` | 0.49 | ≥ 4.5:1 on `surface-2` |
| `ink` | 0.24 | |
| `primary` | 0.40 | ≥ 4.5:1 with `on-primary` |
| `primary-hover` | `primary` − 0.06 | |
| state text colors, `accent-ink` | 0.48–0.53 | ≥ 4.5:1 on `surface` and on their `-soft` |
| `-soft` tints | 0.94–0.96 | same hue as their reference color |

### Dark theme

| Role | L | Note |
| --- | --- | --- |
| `bg` | 0.19 | |
| `surface` | 0.23 | surfaces get lighter toward the viewer |
| `surface-2` | 0.27 | |
| `border` | 0.34 | |
| `border-strong` | 0.53 | ≥ 3:1 on `surface` |
| `ink-muted` | 0.73 | |
| `ink` | 0.94 | |
| `primary` | 0.72–0.78 | |
| `primary-hover` | `primary` + 0.05 | |
| `on-primary` | ~0.24 | whatever holds contrast on the primary |
| state text colors, `accent-ink` | 0.71–0.81 | |
| `-soft` tints | 0.26–0.30 | |
| shadows | alpha 0.4–0.7 on black | |

## 5. Shapes: closed sets

| Family | Closed set | Note |
| --- | --- | --- |
| Radii | `sm`, `md`, `lg` (+ `xl` if the project needs a fourth step; `none` and `full` are always available) | values from `DESIGN.md` or the project, merged into three or four steps |
| Shadows | `sm`, `md`, `lg`, a value per theme | values from `DESIGN.md` or the project, merged into three levels |
| Spacing | Tailwind default (`--spacing: 0.25rem`) | 4px grid |
| Breakpoints | `sm` 640, `md` 768, `lg` 1024, `xl` 1280 | **fixed**: no others, no different values |

Radii and shadows are closed (no Tailwind defaults, reset in the example) but the values are the project's. Scattered values (eight different shadows) are reduced to the three levels by nearest value; the report lists what was merged.

The `example/` files are a non-normative illustration: three radii (10 / 14 / 22px), three shadow levels per theme.

Content max widths are component layout rules, not global style; the skill mentions them only if it finds scattered max widths in the global CSS.
