---
name: global-style-nuxt
description: Analyzes and reorganizes the global style of a Nuxt 4 + Tailwind 4 project (colors and light/dark theme, typography, shadows, radii, animations) into main.css, theme.css, typography.css and animation.css under assets/css, using the proportion method of the PraticaSicura design system. Use it when asked to analyze, fix, unify or reorganize a Nuxt project's global theme, palette, type scale, dark mode or global CSS.
---

# Global style for Nuxt 4 + Tailwind 4

This skill takes a project's global style, finds its issues and rewrites it into four files. The method comes from the PraticaSicura design system, and it has two sides:

- **rigid** on context, prefix, type scale and breakpoints: they are the proportion standard and are not negotiable;
- **flexible** on colors and fonts: the palette and the families belong to the project. The method organizes and checks them, it does not impose them.

**Language**: this file and its references are in English, but talk to the user in their language: questions, report and summary.

## Scope

It covers **only and exclusively the global state**:

- it writes `main.css`, `theme.css`, `typography.css`, `animation.css` in `<srcDir>/assets/css/` (in Nuxt 4 usually `app/assets/css/`);
- it changes `nuxt.config.ts` only in the `modules`, `css`, `colorMode`, `fonts` keys and, if missing, `vite.plugins` for `@tailwindcss/vite`;
- it installs `@nuxtjs/color-mode` and `@nuxt/fonts` if they are missing.

It **does not touch** components, pages, layouts, `<style scoped>` or `<style module>`.

## Requirements (blocking)

- **Tailwind 4** with `@tailwindcss/vite`, and **Nuxt 4**. With Tailwind 3 (`tailwind.config.*`, `@tailwind`, `@config`, `@nuxtjs/tailwindcss`), Nuxt 3 or global CSS in SCSS, the skill stops and says so (P1, P2, P5). No adaptation.
- **`@nuxtjs/color-mode`** and **`@nuxt/fonts`** are required. If missing, the skill installs them during the write phase (`npx nuxi module add color-mode`, `npx nuxi module add fonts`).

## Questions at startup

Before any analysis, **always** ask these two questions together (with the question tool if available, otherwise in text).

### 1. Prefix (required)

Propose a default derived from the project name. The prefix becomes:

- the prefix of the raw variables: `--{p}-bg`, `--{p}-primary`, `--{p}-duration-base`;
- the prefix of the skill's utilities: `{p}-h1`, `{p}-body`, `{p}-overline`, `{p}-transition`.

Tailwind tokens keep the role name (`--color-primary` → `bg-primary`, `--text-h1` → `text-h1`): those are Tailwind utilities, not the skill's. Show the user an example when you ask for the prefix.

Rules: 2–4 lowercase letters, starting with a letter, no hyphens. It cannot match a Tailwind utility root (`p`, `m`, `w`, `h`, `bg`, `text`, `font`, `border`, `rounded`, `shadow`, `flex`, `grid`, `gap`, `ring`, `top`, `size`, `col`, `row`, `sr`, `dark`, `ease`, `animate`, `inset`, `space`, `divide`, `outline`, `fill`, `stroke`). If the user picks one of these, explain the conflict and ask for another.

### 2. Component impact analysis (optional)

Ask whether they want to know which component classes will stop working once the theme is closed (default palette, text sizes, radii, shadows). Explain that it reads every file in the project and therefore costs more. **Default: no.** If yes, run the inventory with `--classes` and add the "Component impact" section to the report.

## Flow

### 1. Inventory

From the project root:

```bash
node <skill folder>/scripts/inventory.mjs --out /tmp/style-inventory.json        # + --classes if requested
```

It prints: versions and modules, global style sources (including orphan files and global `<style>` blocks in `.vue` files), dark theme, text sizes with the nearest scale step, scattered literal colors, radii, shadows, motion, `clamp()`, breakpoints. If the user passes files instead of a project: `--file a.css --file b.css`.

If the inventory reports a blocking issue (Tailwind or Nuxt not at version 4), **stop here** and report it.

Then read the flagged source files: the script finds the values; you work out the **role** of each rule from its selector and context.

### 2. Existing contrast

If the project already has color variables, measure the current contrast. If the names match the roles: `node <skill folder>/scripts/contrast.mjs <file> --prefix <current prefix>`. Otherwise write a `pairs.json` with the real pairs (text/background, border/surface) and use `--pairs`. Single pair: `--pair "#fff" "#3b82f6"`.

### 3. Report

Write the report in the format of "Report format". Every item has a code from `references/issues.md`. Before each part, read its reference:

- `references/typography.md` → Typography;
- `references/fonts.md` → Fonts;
- `references/method.md` → Color and theme, Shapes and breakpoints;
- `references/motion.md` → Motion.
- `references/design-critique.md` → Design review: judge whether the result is good and fits the product, not only whether it is consistent. Findings go in the report's "Design review" section.

### 4. Confirmation

**Stop and wait.** Do not write anything until the user has confirmed the report and answered the "To decide" items. If they change something, update only that part.

### 5. Writing

1. Install the missing modules and update `nuxt.config.ts` as in `references/example/nuxt.config.ts`: `css` contains **only** `~/assets/css/main.css`; `fonts.families` lists the families with the weights in use.
2. Write `theme.css`, `typography.css`, `animation.css`, `main.css` following **the structure of `references/example/` file by file**: same sections, same order, same resets.
   - `typography.css` and the breakpoints in `theme.css`: identical to the example; only the prefix and the approved families change (plus the `hero` role if any).
   - colors and shadows in `theme.css`: the palette approved in the report, with the example's mechanics (raw values per theme, `@theme inline`, resets).
3. Old global files are not deleted: they are unlinked from `nuxt.config` and listed in the summary. Global `<style>` blocks in `.vue` files are moved only if the user approved it (P8).

### 6. Verification

1. `node <skill folder>/scripts/inventory.mjs --file <srcDir>/assets/css/main.css`: every size with offset 0, no media query outside the breakpoints, no literal color outside `theme.css`, closed namespaces: `color, font, text, shadow, radius, font-weight, inset-shadow, drop-shadow, text-shadow, ease, animate, breakpoint`.
2. `node <skill folder>/scripts/contrast.mjs <srcDir>/assets/css/theme.css --prefix {p}`: the result must match what was approved in the report. A pair the user chose to keep below the minimum stays flagged in the summary; it is never silently corrected.
3. Project build (`npm run build` or `npx nuxi build`): no CSS errors.
4. Rendered check (see `references/design-critique.md`, Verification): one batched look at light and dark, desktop and mobile when a browser tool exists. If none exists, state in the summary that rendered contrast, dark theme and heading wrapping were **not verified**.

If a check fails because of a mistake by the skill, fix it and repeat before delivering.

### 7. Final summary

Short: what changed per area, derived or corrected colors, fonts kept or changed, contrast kept below the minimum by choice, old files to remove. If the impact analysis was requested, the table of classes to replace. Remind the user that components were not modified, and that the `/global-style-refactor` command handles template refactoring.

## Rigid rules

- **Context**: Tailwind 4 + Nuxt 4, global state only, only the four files in `assets/css`.
- **Closed system**: no default Tailwind palette, family, weight, text size, shadow, radius, easing or animation. Namespaces are reset as in the example; only static utilities remain (`transparent`, `current`, `inherit`, `rounded-none`, `rounded-full`, `shadow-none`). Everything the project uses is defined by the theme.
- **Standard type scale** (`references/typography.md`): the scale, line heights, weights (400/600/700), roles and utilities are fixed. Every off-scale size aligns to an existing role. **No roles are added**, with one exception: text larger than `display`. Two family roles, `display` and `body` (plus `mono` only if the project shows code). Inputs never below 16px.
- **Standard breakpoints**: only `sm` 640, `md` 768, `lg` 1024, `xl` 1280, declared in `theme.css`. Every media query on other widths moves to the nearest breakpoint. Text changes **in steps** at `lg`, only `display`, `h1`, `h2`.
- **`clamp()` only above `display`**: text larger than `display` becomes the `hero` role, with a `clamp()` built with the formula in `typography.md` §4. Any other `clamp()` on text becomes a stepped role.
- **Literal colors only in `theme.css`**, in the `:root, [data-theme="light"]` and `[data-theme="dark"]` blocks. Both themes exist.
- **Reduced motion** always handled.

## Flexible rules: color

The palette belongs to the project. The skill:

- **maps** existing colors onto the method's roles (`references/method.md` §1) where the meaning matches, and **keeps** project colors without a matching role (a second brand color, a scale the project really uses, illustration colors), with an agreed semantic name;
- **does not change** existing hues or values on its own initiative: every change to an existing color is a "To decide" proposal;
- **proposes** the missing roles that are needed (typically `on-primary`, the `-soft` tints, `border-strong`, part of the dark theme), derived with the method's proportions as a starting point;
- **measures** contrast and reports it. Pairs below the minimum come with a correction proposal (lightness only), but the choice is the user's;
- uses the calibration lightness values in `method.md` §3 as a **reference**, not a rule: they serve to propose derived values and to flag obvious imbalances.

Radii and shadows follow the same logic: closed sets (no Tailwind defaults), with number and values adapted to the project according to the proportions in `method.md` §6.

## Flexible rules: fonts

The families belong to the project (`references/fonts.md`). The skill:

- checks that each family suits its role (display: character and weights 600/700; body: legibility, weights 400/600/700, tabular figures);
- checks that the pair is harmonious: contrast in personality, kinship in proportions, no pair of near-identical families;
- if the pair is harmonious, keeps it;
- if not, **asks the user which of the two to keep** and proposes 2 or 3 alternatives for the other only. **Never change both.** The user can also keep the pair as it is;
- with more than two families, asks which two to keep; with only one, it is fine for both roles.

Families do not affect the scale: only `--font-display`, `--font-body` and `fonts.families` change.

## Specific cases

- **Value equidistant between two steps** (15px, 17px, 13px): the element's role decides (`typography.md` §2); the report says which and why.
- **Recurring off-scale value**: aligned like the others. The report groups it so the user sees the effect, but it does not become a new role.
- **Several different sizes above `display`**: a single `hero` role, with the most used maximum; the report lists the absorbed values.
- **No dark theme**: propose a full derivation from `method.md` §3, every value marked "derived", to be approved.
- **Dark theme on `.dark` or only on `prefers-color-scheme`**: migrate it to `data-theme` (C14). `color-mode` already covers the system preference.
- **Fonts from `@font-face` or a Google `@import`**: they move to `@nuxt/fonts` (T7). Local fonts: `@nuxt/fonts` serves them from the `public/` folder, and the report says so.
- **Global variables that are not style** (z-index, layout widths…): they stay outside the four files; the report mentions them without touching them.

## Report format

Write the report in the user's language; the structure is this:

```markdown
# Global style — report

**Project**: Nuxt x · Tailwind x · color-mode ✓/✗ · fonts ✓/✗ · prefix `{p}` · component impact: yes/no
**Sources analyzed**: list

## Blocking
- [P1] … (if any, the report stops here)

## Fonts (proposals)
Detected families and their role; outcome: harmonious (one line) or not harmonious (reason + question on which one to keep).

## Typography (applied as follows)
| Code | Where | Now | Role | Reason |
Optional `hero` role with the computed clamp.

## Breakpoints (applied as follows)
| Code | Where | Now | Breakpoint |

## Color and theme (proposals)
Palette: for each color, light value, dark value, proposed role or name, origin (existing / derived / proposed change).
Contrast below the minimum: pair, ratio, proposal.

## Shapes and shadows
## Motion
## Design review
Per `references/design-critique.md`: brief used, findings by severity, what was not verified, questions.

## Component impact (only if requested)
| Class | Count | Files | Replacement |

## To decide
1. … (numbered questions, with the skill's proposal)
```

## References

| File | When to read it |
| --- | --- |
| `references/typography.md` | before the Typography part and before writing `typography.css` |
| `references/fonts.md` | before the Fonts part |
| `references/method.md` | before the Color, Shapes and Breakpoints parts |
| `references/motion.md` | before the Motion part |
| `references/issues.md` | for the code and severity of each item |
| `references/design-critique.md` | before the Design review part: hierarchy, rhythm, states, product fit; also used by `global-style-refactor` |
| `references/example/*` | before writing the files: it is the structure to replicate |
| `scripts/inventory.mjs` | global style inventory (+ impact with `--classes`) |
| `scripts/contrast.mjs` | contrast and OKLCH lightness, light and dark |
