# Typography: scale, roles, breakpoints, clamp

The type scale is the **rigid** part of the method: it is the proportion standard. PraticaSicura's scale is fixed, body text is always 16px, and the other styles keep the same ratio. From one project to another only the families change, and those are flexible (`fonts.md`). No roles are added, no sizes are moved, no other breakpoints are used. The only allowed extension is the `hero` role for text larger than `display` (§4).

## 1. Roles and scale

| Role | Family | Desktop (size / line height) | Mobile | Weight | Letter spacing | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `display` | display | 56 / 60 (3.5rem / 3.75rem) | 36 / 40 | 700 | −0.02em | home hero only |
| `h1` | display | 40 / 46 (2.5rem / 2.875rem) | 30 / 36 | 700 | −0.015em | page title, one per page |
| `h2` | display | 30 / 36 (1.875rem / 2.25rem) | 24 / 30 | 700 | −0.01em | sections |
| `h3` | display | 22 / 28 (1.375rem / 1.75rem) | same | 600 | — | step or card title |
| `h4` | display | 18 / 24 (1.125rem / 1.5rem) | same | 600 | — | repeatable cards, groups, FAQ items |
| `lead` | body | 19 / 30 (1.1875rem / 1.875rem) | same | 400 | — | subtitle below `display` and `h1` |
| `body` | body | 16 / 26 (1rem / 1.625rem) | same | 400 | — | running text, inputs |
| `body-strong` | body | 16 / 26 | same | 600 | — | emphasis, values, button text |
| `label` | body | 14 / 20 (0.875rem / 1.25rem) | same | 600 | — | field labels, chips |
| `small` | body | 14 / 20 | same | 400 | — | help, errors, notes, footer, metadata |
| `overline` | body | 12 / 16 (0.75rem / 1rem) | same | 700 | +0.08em, uppercase | eyebrows, counters, badges |

Ratios to `body` = 1: 0.75 · 0.875 · 1 · 1.125 · 1.1875 · 1.375 · 1.875 · 2.5 · 3.5. Mobile reduction: `display` × 0.643, `h1` × 0.75, `h2` × 0.8.

### Scale rules

- **Line height on a 2px grid**, decreasing as text grows: about 1.6 for running text, 1.4 for `label` and `small`, 1.25–1.33 for `h3`–`h4`, 1.15–1.2 for `h1`–`h2`, about 1.07 for `display`.
- **Letter spacing** negative only on headings of 30px and above; positive only on uppercase (`overline`). Never positive on headings, never negative on small text.
- **Two family roles**: `--font-display` for headings, `--font-body` for everything else (they can be the same family). Which families to use is up to the project, with the harmony check in `fonts.md`. A third role, `--font-mono` only, if the project really shows code.
- **Three weights**: 400, 600, 700. A 500 or an 800 moves to the role's weight.
- **Inputs never go below 16px** (on iOS they would trigger zoom). If a global CSS sets them smaller, the skill always corrects it (T8).
- `label` and `small` share a size and differ by weight: that is intentional.

## 2. Aligning an off-scale value

`inventory.mjs` reports, for every size, the nearest step and the offset.

1. **Offset 0**: on scale. Only the role's weight and line height are checked.
2. **Offset of 1–2px toward a single step**: align to that step, taking the full role (size, line height, weight).
3. **Equidistant** (15px between 14 and 16, 17px between 16 and 18, 13px between 12 and 14): the **element's role** decides, not arithmetic. A 17px card title becomes `h4` (18); a 15px paragraph becomes `body` (16); 13px metadata becomes `small` (14); a 13px badge becomes `overline` (12).
4. **Off scale and recurring** (the same value in many places): aligned like the others, it **does not become a role**. In the report the occurrences are grouped, so the user sees the effect of the correction at a glance.
5. **Above `display`** (more than 56px): not aligned, it becomes the `hero` role (§4).
6. **Inverted hierarchy** (an `h4` larger than an `h3`, a `small` larger than `body`): always corrected.

## 3. Breakpoints: stepped

- Sizes change **in steps**, on a method breakpoint, never fluidly.
- Only `display`, `h1` and `h2` change, and they change at `lg` (1024px). The other roles are the same on every screen.
- The reduction lives **inside the utility** (`@variant lg`); the `--text-*` tokens hold the desktop values. That way the tag (from the base layer) and the class behave the same, and the rule lives in one place.
- Media queries on widths that are not method breakpoints (900px, 1100px, 1440px…) in global CSS: moved to the nearest method breakpoint, and flagged.

## 4. clamp(): only above `display`

- A `clamp()` on a size **up to `display`** (56px) is not allowed: it is converted into a role with stepped breakpoints. The role is chosen from the element and the clamp's maximum (e.g. `h1 { font-size: clamp(2rem, 5vw, 4.5rem) }` → `h1` role, or `display` if it is the hero).
- Text **larger than `display`**, with or without `clamp()`, becomes the `hero` role: these are special headings (hero, giant numbers) that must shrink proportionally. It gets a token and a `{p}-hero` utility, without `@variant`: the `clamp()` does the reduction.
- There is **only one** `hero` role. If the project has several sizes above `display`, the most used one becomes the maximum; the report lists the others, which are absorbed.

### Building the clamp for a role above `display`

Keep the reduction ratio of `display` (mobile = desktop × 0.643) and interpolate between `sm` (40rem) and `xl` (80rem):

```
max   = the project's desktop size, rounded to 4px
min   = max × 0.643, rounded to 4px, and always > 36px (above display mobile)
slope = (max − min) / 40           in rem per rem
vw    = slope × 100
base  = min − slope × 40           in rem
font-size: clamp(min, base + vw, max)
```

Example with max 80px: min = 51.4 → 52px (3.25rem); slope = (5 − 3.25) / 40 = 0.04375; vw = 4.375; base = 3.25 − 1.75 = 1.5rem.

```css
@theme {
  --text-hero: clamp(3.25rem, 1.5rem + 4.375vw, 5rem);
  --text-hero--line-height: 1.04;      /* unitless: follows the size */
  --text-hero--font-weight: 700;
  --text-hero--letter-spacing: -0.025em;
}
@utility {p}-hero { @apply font-display text-hero; }
```

The line height of a clamped size is always **unitless** (1.0–1.08), otherwise lines overlap at small sizes.

## 5. Utilities and the base layer

In `typography.css`, with the `{p}` prefix chosen at startup:

- one utility per role: `{p}-display`, `{p}-h1` … `{p}-overline`. Each carries the family and the complete style (`@apply font-… text-…`), never the color;
- `{p}-display`, `{p}-h1`, `{p}-h2` have the mobile size and an `@variant lg` block with the desktop size;
- `{p}-overline` adds `uppercase`;
- in `@layer base`: `h1`…`h4` apply their role's utility; `body` applies `{p}-body` (in `main.css`).

The tag level follows the page structure; the look is corrected with the class (`<h3 class="{p}-h4">`). An element that must look like a heading without being one uses the class (`<span class="{p}-h4">`).

## 6. Typical roles for component text

Useful for assigning off-scale values found in global CSS:

| Element | Role |
| --- | --- |
| button text | `body-strong` (small button: `label`) |
| chips, tabs, stepper items | `label` |
| help below fields, errors, counters, metadata, captions | `small` |
| callout or toast title | `body-strong` |
| callout, toast, card text | `body` (`small` if secondary) |
| badges, tags, step counters | `overline` |
| card title, summary section title | `h4` (or `h3` if the card is the main choice) |
| text inside an icon or thumbnail (e.g. file extension) | `overline` |
