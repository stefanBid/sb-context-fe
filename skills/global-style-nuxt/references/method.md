# Method: color, light and dark themes, shapes

The method comes from the PraticaSicura design system (full example in `example/`). The skill applies the **method**, not the values: every project keeps its own brand hue, its own fonts and its own character. What carries over from one project to another is the roles, the lightness proportions, the contrast rules and the balance in how colors are used.

All lightness values are in OKLCH (L from 0 to 1). PraticaSicura's measurements are the **calibration values**: they are used to propose derived values and to point out obvious imbalances, not to correct a project's palette.

**Color is the flexible part of the method.** The palette belongs to the project: the skill organizes it, completes it where needed and measures its contrast, but every change to an existing color is a proposal the user approves. Only the container is rigid: no default Tailwind palette, literal colors only in `theme.css`, both themes.

## 1. Roles: a reference vocabulary

Where a project color has the same meaning as a role, it takes the role's name. That way new components always find `bg-surface`, `text-ink-muted` or `bg-primary` without guessing.

| Group | Roles | What they are for |
| --- | --- | --- |
| Surfaces | `bg`, `surface`, `surface-2` | page; cards, forms and panels; section headers and summaries |
| Borders | `border`, `border-strong` | decorative dividers; input and control borders |
| Text | `ink`, `ink-muted` | main text; secondary text, help, placeholders |
| Primary | `primary`, `primary-hover`, `on-primary`, `primary-soft` | actions, links, selection, focus; text on top; relief tint |
| Accent | `accent`, `accent-hover`, `on-accent`, `accent-ink` | a single warm accent; `accent-ink` when it has to be text |
| States | `success`, `error`, `warning`, `info` and their `-soft` | feedback, always with an icon and a word |
| Focus | `focus-ring` | focus ring, usually an alias of `primary` |

**Recommended base.** A theme holds up with: `bg`, `surface`, `border`, `ink`, `ink-muted`, `primary`, `on-primary`, `focus-ring`. If one of these is missing, the skill proposes it. The other roles are proposed when the project needs them (a form that shows errors needs `error` and `error-soft`), not to fill the table.

**Project colors without a matching role** stay:

- a second brand color, a category color, an illustration color → a semantic name agreed with the user (`brand-secondary`, `highlight`, `category-travel`);
- a numeric scale (`brand-50` … `brand-900`) → stays if the project really uses it; if it uses two or three steps, the skill proposes giving those steps a role;
- only a pure hue name (`--blue`, `--gray-700`) is avoided for a color that has a meaning: in that case the skill proposes the role name.

Every color, role or project-specific, has a value for the light theme and one for the dark theme.

## 2. Balance of use

This is what makes the design feel "balanced". These are guidelines: the skill uses them to write usage notes and to point out obvious imbalances (for example the primary color used as the background of whole sections), not to block anything.

- **Neutrals dominate.** The page is almost all `bg`, `surface`, `surface-2`, `ink`, `ink-muted`. The brand color never fills large surfaces.
- **Primary only where people act**: buttons, links, active step, selection, focus. Large colored areas use `primary-soft`, never `primary`.
- **One accent per view, used sparingly**: an entry CTA, a logo detail, step numbers. Never as text color on a light background: that is what `accent-ink` is for.
- **States only for feedback**, always on a `-soft` or `surface` background, always with an icon and text: never color alone.
- **Depth through surface lightness, not shadows.** Shadows are for what floats.

## 3. Lightness proportions

### Light theme

| Role | Calibration L | Reference |
| --- | --- | --- |
| `surface` | 1.00 | can be pure white |
| `bg` | 0.96 | **never pure white**: a barely tinted white (warm or toward the brand hue), C ≤ 0.01 |
| `surface-2` | 0.94 | one step below `bg` |
| `border` | 0.87 | decorative, no contrast requirement |
| `border-strong` | 0.65 | ≥ 3:1 on `surface` |
| `ink-muted` | 0.49 | ≥ 4.5:1 on `surface-2` (the darkest surface it appears on) |
| `ink` | 0.24 | **never pure black**: tinted ink, C 0.02–0.03, hue close to the brand |
| `primary` | 0.40 | ≥ 4.5:1 with `on-primary` and as text on every surface |
| `primary-hover` | `primary` − 0.06 | |
| text colors (states, `accent-ink`) | 0.48–0.53 | ≥ 4.5:1 on `surface` and on their `-soft` |
| `-soft` tints | 0.94–0.96, C 0.012–0.027 | same hue as their reference color |
| `accent` | 0.76 | fill color, text on top in a dark `on-accent` |

Expected surface order: `surface ≥ bg > surface-2`.

### Dark theme

The dark theme **is not an inversion**. Each role keeps its hue and the lightness is rebuilt:

| Role | Calibration L | Reference |
| --- | --- | --- |
| `bg` | 0.19 | the darkest, never pure black, tinted toward the brand |
| `surface` | 0.23 | surfaces **rise** toward the viewer |
| `surface-2` | 0.27 | |
| `border` | 0.34 | |
| `border-strong` | 0.53 | ≥ 3:1 on `surface` |
| `ink-muted` | 0.73 | |
| `ink` | 0.94 | never pure white |
| `primary` | 0.72–0.78 | the brand **gets lighter**; C slightly lower than in light |
| `primary-hover` | `primary` + 0.05 | in dark mode hover gets lighter |
| `on-primary` | ~0.24, primary hue | **ink, not white**: white does not hold up on a light primary |
| text colors (states, `accent-ink`) | 0.71–0.81 | |
| `-soft` tints | 0.26–0.30, C 0.04–0.05 | they become deep |
| shadows | alpha 0.4–0.7 on black | denser than in light, otherwise they disappear |

Expected surface order: `bg < surface < surface-2`.

### How to propose a missing color

When the project lacks a color it needs (often: the whole dark theme, the `-soft` tints, `on-primary`, `border-strong`), the skill derives it from the project's closest hue, with the calibration L from the table, and checks it with `scripts/contrast.mjs`. If the contrast does not hold, it moves **only L** (never the hue). The value goes into the report as **derived**, to be approved.

An existing color is never changed on the skill's own initiative. If it fails contrast or breaks an obvious balance, the skill proposes a correction (lightness only) with the before and after values, and the user decides.

## 4. Contrast

Always measured with `scripts/contrast.mjs`, never by eye, in **both themes**. Pairs below the minimum go into the report with a proposal; the decision is the user's, and a pair kept below the minimum by choice is still flagged in the final summary. Reference minimums (WCAG AA):

- text: 4.5:1 on the surfaces where it actually appears;
- control borders, focus ring, icons without text: 3:1;
- decorative `border`: no requirement, but it must remain distinguishable from `surface`.

Two colors that must be told apart (for example success and error) differ in lightness, not only in hue.

## 5. Theme mechanics (Nuxt + Tailwind 4)

- Raw values live in `theme.css`: `:root, [data-theme="light"]` for light, `[data-theme="dark"]` for dark, each with `color-scheme`.
- `@nuxtjs/color-mode` with `dataValue: 'theme'` and `classSuffix: ''` writes `data-theme` on `<html>` before the first render, with `preference: 'system'` and `fallback: 'light'`.
- Tailwind's `dark:` variant follows `data-theme` (`@custom-variant dark` in `main.css`). With semantic roles it is rarely needed: the color changes on its own.
- Tailwind colors are mapped in `@theme inline`, so utilities read `var(--{p}-*)` on the element and also follow a nested `data-theme`.
- Tailwind token names are the roles without a prefix (`--color-primary` → `bg-primary`); the prefix goes on the raw variables (`--{p}-primary`) and on the skill's utilities (`{p}-h1`).

## 6. Shapes and depth

| Family | Closed set | Use |
| --- | --- | --- |
| Radii | `sm` 6px, `md` 10px, `lg` 16px, `xl` 24px (+ `none` and `full`, always available) | checkboxes and badges; inputs, buttons, chips; cards, callouts, toasts; hero and choice cards |
| Shadows | `sm`, `md`, `lg`, different in light and dark | resting cards; hover and dropdowns; what floats (toasts, panels, sticky bars) |
| Spacing | Tailwind default (`--spacing: 0.25rem`) | 4px grid |
| Breakpoints | `sm` 640, `md` 768, `lg` 1024, `xl` 1280 | **rigid**: no others, no different values |

Radii and shadows are closed sets (no Tailwind defaults) but adapted to the project. The four radii follow the method's proportion: they can move a few pixels to suit the project's character (squarer or softer), keeping the ratio between steps (about 1 : 1.7 : 2.7 : 4).

Shadows are tinted with the ink in light mode (`rgba` of the `ink` color) and black in dark mode. Scattered values (eight different shadows in a project) are reduced to the three.

Content at most 1200px wide, forms at most 720px: these are component layout rules, not global style rules, and the skill mentions them in the report only if it finds scattered max widths in the global CSS.
