# Typography structure: roles, steps, clamp, alignment

Part of the **standard**: fixed for every engine and framework. This file fixes the **structure** of the type system: which roles exist, what each one carries, how sizes change across screens. How the roles become tokens, utilities and a base layer is the engine's file (`../engines/tailwind4/README.md`). It does **not** fix the numbers. Sizes, line heights, tracking and weights come from `design-source.md` when it exists, otherwise from the project's own current values, normalized. They depend on the chosen faces: there is no universal px scale.

The only numbers that are fixed are the guard rails in §2.

## 1. Roles and tokens

The set of roles is closed:

| Role | Family | Purpose |
| --- | --- | --- |
| `display` | display | largest heading, home hero only |
| `h1` | display | page title, one per page |
| `h2` | display | sections |
| `h3` | display | step or card title |
| `h4` | display | repeatable cards, groups, FAQ items |
| `lead` | body | subtitle below `display` and `h1` |
| `body` | body | running text, inputs |
| `body-strong` | body | emphasis, values, button text |
| `label` | body | field labels, chips |
| `small` | body | help, errors, notes, footer, metadata |
| `overline` | body | badges, tags, counters, table headers, metadata. **Never a kicker above a heading, even if `design-source.md` says so** |
| `hero` (optional) | display | text larger than `display`, with `clamp()` (§4) |

Each role carries a size, a line height, a weight and, when it needs it, a letter spacing. The stored values are the **desktop** values; the mobile step of `display`, `h1`, `h2` lives with the role's class (§3). The set of weights is closed to the weights the chosen faces and roles actually use.

Line height is tuned to the face, its width and the language, not to a fixed ratio. Take it from `design-source.md` or from the project; keep it unitless only for `hero`.

## 2. Guard rails

The only fixed numbers:

- body is **1rem** or more for running text; form inputs are never below **16px** (iOS zoom);
- prose measure **45–75ch**;
- `display` is at most **6rem**;
- letter spacing is not below **−0.04em**;
- adjacent roles are **visibly distinct** (size, weight or family differ enough to read as two levels); two roles that look the same are merged or reported.

`label` and `small` may share a size and differ by weight; that is a valid choice, not an issue.

## 3. Breakpoints: stepped

- Sizes change **in steps** on a method breakpoint, never fluidly.
- Only `display`, `h1` and `h2` change, and they change at `lg` (1024px). Other roles are the same on every screen.
- The reduction lives **inside the role's class**, not in the stored values, which hold the desktop sizes. That way the tag (base layer) and the class behave the same.
- The mobile values come from `design-source.md` or from the project's current mobile values. If the project has none, derive them minimally and mark them **provisional**.
- Media queries on widths that are not method breakpoints (900px, 1100px, 1440px…) move to the nearest method breakpoint and are flagged.

## 4. clamp(): only above `display`

- A `clamp()` on a size **up to `display`** is not allowed: it becomes a role with stepped breakpoints. The role is chosen from the element and the clamp's maximum.
- Text **larger than `display`**, with or without `clamp()`, becomes the `hero` role: special headings (hero, giant numbers) that must shrink proportionally. Its class has no breakpoint step: the `clamp()` does the reduction.
- There is **one** `hero` role. If the project has several sizes above `display`, the most used one becomes the maximum; the report lists the absorbed values.

### Building the clamp

The reduction ratio is the project's own: `ratio = display mobile / display desktop` (from `design-source.md` or the project's `display` values). Interpolate between `sm` (40rem) and `xl` (80rem):

```
max   = the project's desktop size, rounded to 4px
min   = max × ratio, rounded to 4px, and always > display mobile
slope = (max − min) / 40           in rem per rem
vw    = slope × 100
base  = min − slope × 40           in rem
font-size: clamp(min, base + vw, max)
```

Example with `max` 80px and a `display` ratio of 0.643 (the example's 36 → 56): min = 51.4 → 52px (3.25rem); slope = (5 − 3.25) / 40 = 0.04375; vw = 4.375; base = 3.25 − 1.75 = 1.5rem, so `clamp(3.25rem, 1.5rem + 4.375vw, 5rem)`. How the engine writes it: `../engines/tailwind4/README.md`.

The line height of a clamped size is always **unitless**, otherwise lines overlap at small sizes.

## 5. Classes and tags

- **One class per role** (`{p}-display` … `{p}-overline`, plus `{p}-hero`): it carries the family and the complete style, **never the color** (the context gives it). `overline` is uppercase.
- The tags `h1`…`h4` take their role's style, and `body` takes `body`: these are required. Styling `p`, `label`, `small`, `code`, inputs (never below 16px) and prose margins is optional, kept when the project already has it.
- The tag level follows the page structure; the look is corrected with the class (`<h3 class="{p}-h4">`). An element that must look like a heading without being one uses the class (`<span class="{p}-h4">`).

How the classes and the tag styles are written: the engine's file.

## 6. Aligning a value to the project's scale

The scale is **the project's**: its role tokens when they exist (`--text-<role>` with Tailwind 4), otherwise the distinct sizes found in the CSS. `inventory.mjs` reports every size with its nearest step **in that scale** and the offset.

1. **Offset 0**: on scale. Only the role's weight and line height are checked.
2. **Near-duplicates** (sizes within 1px, or 2px above 24px): merge into one role value. Choose the more frequent one (e.g. 15px and 16px both used for running text → one `body` value, the more used).
3. **One nearest step**: align to that step, taking the full role.
4. **Equidistant between two steps**: the **element's role** decides, not arithmetic (a card title takes the heading role, a paragraph the text role, uppercase metadata `overline`).
5. **Off scale and recurring**: aligned like the others; it does not become a role. Occurrences are grouped in the report.
6. **Above `display`**: not aligned, it becomes the `hero` role (§4).
7. **Inverted hierarchy** (an `h4` larger than an `h3`, a `small` larger than `body`): always corrected.
8. **No role tokens yet**: cluster the distinct sizes (the inventory proposes clusters), map each cluster to a role by element, and mark the resulting values **provisional** until the user approves them or `design-source.md` exists.

Never introduce a value from the `example/` files.

## 7. Typical roles for component text

Useful for assigning off-scale values found in global CSS:

| Element | Role |
| --- | --- |
| button text | `body-strong` (small button: `label`) |
| chips, tabs, stepper items | `label` |
| help below fields, errors, counters, metadata, captions | `small` |
| callout or toast title | `body-strong` |
| callout, toast, card text | `body` (`small` if secondary) |
| badges, tags, step counters, table headers | `overline` |
| card title, summary section title | `h4` (or `h3` if the card is the main choice) |
| text inside an icon or thumbnail (e.g. file extension) | `overline` |

## 8. Example values (`../engines/tailwind4/example/typography.css`)

**Non-normative.** These are the `sb` template's values, tuned to Poppins + Inter. They show the shape of a filled-in scale; they are never imposed on another project.

| Role | Desktop (size / line height) | Mobile | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| `display` | 56 / 60 | 36 / 40 | 700 | −0.02em |
| `h1` | 40 / 46 | 30 / 36 | 700 | −0.015em |
| `h2` | 30 / 36 | 24 / 30 | 700 | −0.01em |
| `h3` | 22 / 28 | same | 600 | — |
| `h4` | 18 / 24 | same | 600 | — |
| `lead` | 19 / 30 | same | 400 | — |
| `body` | 16 / 26 | same | 400 | — |
| `body-strong` | 16 / 26 | same | 600 | — |
| `label` | 14 / 20 | same | 600 | — |
| `small` | 14 / 20 | same | 400 | — |
| `overline` | 12 / 16 | same | 700 | +0.08em, uppercase |

Its mobile reduction ratio is `display` × 0.643, which is where the `hero` example above comes from. Another project, with other faces, has other numbers.
