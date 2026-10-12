---
name: style-align
description: Normalizes any global style setup of a Nuxt 4 + Tailwind 4 project into the fixed four-file structure (main.css, theme.css, typography.css, animation.css under assets/css), keeping the project's own values. Use it when asked to align, normalize, unify or reorganize a Nuxt project's global theme, palette, type scale, dark mode or global CSS.
---

# Align the global style (Nuxt 4 + Tailwind 4)

Normalizes any global style setup of a Nuxt 4 + Tailwind 4 project into the fixed four-file structure, keeping the project's own values.

The skill fixes the **structure**. It does not judge or improve the design: values and taste belong to `DESIGN.md` and to Impeccable (`impeccable@impeccable`), a separate plugin the user may install. The two plugins are not connected; this skill only recommends Impeccable as the next step.

**Language**: this file and its references are in English, but talk to the user in their language: questions, report and summary.

## Precedence

| Concern | Owner | Rule |
| --- | --- | --- |
| **Structure**: the four files and their sections, token naming, the `{p}` prefix, the role names, closed Tailwind namespaces, `@theme` vs `@theme inline`, utilities `{p}-<role>`, base layer for `h1`–`h4`, light/dark mechanics with `data-theme`, `@nuxtjs/color-mode` and `@nuxt/fonts`, breakpoints, `clamp()` only above `display` | **this plugin** | fixed, always enforced |
| **Values and taste**: palette, font families and pairing, type ratios, line heights, letter spacing, weights, radii and shadow values, motion timings and character, how roles are used on a page (composition) | **`DESIGN.md` / Impeccable** | if `DESIGN.md` exists, its values win; otherwise keep the project's current values, normalized; never impose the example's |

**One exception to "`DESIGN.md` wins": no eyebrows, ever.** `overline` is for badges, tags, counters, table headers and metadata, never a kicker above a heading, even if `DESIGN.md` documents one. The same goes for the fixed breakpoints and the 16px floor for running text and inputs.

`references/example/` is the `sb` template (prefix `sb`): it is the **structural** reference. Its values are never copied into another project.

## Scope

It covers **only and exclusively the global state**:

- it writes `main.css`, `theme.css`, `typography.css`, `animation.css` in `<srcDir>/assets/css/` (in Nuxt 4 usually `app/assets/css/`);
- it changes `nuxt.config.ts` only in the `modules`, `css`, `colorMode`, `fonts` keys and, if missing, `vite.plugins` for `@tailwindcss/vite`;
- it installs `@nuxtjs/color-mode` and `@nuxt/fonts` if they are missing.

It **does not touch** components, pages, layouts, `<style scoped>` or `<style module>`. The one exception is the optional prefix rename, which only replaces the old prefix.

## Requirements (blocking)

- **Tailwind 4** with `@tailwindcss/vite`, and **Nuxt 4**. With Tailwind 3 (`tailwind.config.*`, `@tailwind`, `@config`, `@nuxtjs/tailwindcss`), Nuxt 3 or global CSS in SCSS, the skill stops and says so (P1, P2, P5). No adaptation.
- **`@nuxtjs/color-mode`** and **`@nuxt/fonts`** are required. If missing, the skill installs them during the write phase (`npx nuxi module add color-mode`, `npx nuxi module add fonts`; use the project's package manager).

## Questions at startup

Run the inventory first (Flow step 1: it is read only). If the project is **already aligned** (step 1b), skip these questions. Otherwise, before the report, ask these two questions together (with the question tool if available, otherwise in text).

### 1. Prefix (required)

Always ask. Propose a default: the `suggestedPrefix` of `DESIGN.md` when it has one (initials of the design's name, e.g. `PraticaSicura` → `ps`), otherwise one derived from the project name. It is only a proposal: **whatever the user answers is the prefix** (`pippo` → `pippo`, within the rules below). Never fall back to a fixed prefix, and `sb` in `references/example/` is just the example's. The prefix becomes:

- the prefix of the raw variables: `--{p}-bg`, `--{p}-primary`, `--{p}-duration-state`;
- the prefix of the skill's utilities: `{p}-h1`, `{p}-body`, `{p}-overline`, `{p}-transition`.

Tailwind tokens keep the role name (`--color-primary` → `bg-primary`, `--text-h1` → `text-h1`): those are Tailwind utilities, not the skill's. Show the user an example when you ask for the prefix.

Rules: 2–4 lowercase letters, starting with a letter, no hyphens. It cannot match a Tailwind utility root (`p`, `m`, `w`, `h`, `bg`, `text`, `font`, `border`, `rounded`, `shadow`, `flex`, `grid`, `gap`, `ring`, `top`, `size`, `col`, `row`, `sr`, `dark`, `ease`, `animate`, `inset`, `space`, `divide`, `outline`, `fill`, `stroke`). If the user picks one of these, explain the conflict and ask for another.

### 2. Component impact analysis (optional)

Ask whether they want to know which component classes will stop working once the theme is closed (default palette, text sizes, radii, shadows). Explain that it reads every file in the project and therefore costs more. **Default: no.** If yes, run the inventory with `--classes` and add the "Component impact" section to the report.

## Flow

### 0. Values source

If `DESIGN.md` exists at the project root, **read it first** and take palette, families, type values, radii, shadows and motion from it. `DESIGN.md` follows the open DESIGN.md format (YAML frontmatter: colors, typography, rounded, spacing; standard body sections). When it comes from `/sb-context-nuxt:design-import` it also has a `style-align extension` JSON block (dark theme, mobile sizes, shadows, breakpoints, `suggestedPrefix`); see `${CLAUDE_SKILL_DIR}/../design-import/references/design-md.md`. Its "Gaps" list, or whatever is absent (a `DESIGN.md` written by Impeccable has no extension), becomes the **provisional** items of the report. Report any conflict between `DESIGN.md` and the current CSS (P10); `DESIGN.md` wins, except for the eyebrow, breakpoint and 16px rules.

No `DESIGN.md` but the user has a design made in Claude desktop (an artifact link)? Run `/sb-context-nuxt:design-import` first.

If it does not exist, keep the project's values and **normalize** them:

- merge near-duplicates into one role (15px and 16px both used for running text → one `body` value, the more frequent one);
- map every remaining size to a role; never introduce values from the example;
- roles the structure needs but the project lacks (a dark theme value, `on-primary`, a `-soft` tint) are derived minimally, marked **provisional**, and listed for refinement with `/impeccable colorize` or `/impeccable typeset`.

### 1. Inventory

From the project root:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs" --out /tmp/style-inventory.json        # + --classes if requested
```

It prints: versions and modules, global style sources (including orphan files and global `<style>` blocks in `.vue` files), dark theme, text sizes with the nearest step **of the project's own scale** (the `--text-*` tokens, or proposed clusters when there are none), scattered literal colors, radii, shadows, motion, `clamp()`, breakpoints. If the user passes files instead of a project: `--file a.css --file b.css`.

If the inventory reports a blocking issue (Tailwind or Nuxt not at version 4), **stop here** and report it.

Then read the flagged source files: the script finds the values; you work out the **role** of each rule from its selector and context.

### 1b. Already aligned?

The inventory prints a **Structure** section with `Already aligned: yes/no` (four files, imports, `@theme inline`, closed namespaces, `data-theme`, reduced motion, prefixed utilities, no tokens outside `@theme`).

If it says **yes**, do not write a report or rewrite anything. Tell the user the style is already in the fixed structure.

If you noticed a value that departs from the usual pattern (e.g. a mobile size written as a literal in a utility instead of a token), do not call it "probably intentional". Open the file and look for the justification: a header or inline comment, or a rule the structure already allows (mobile steps for `display`, `h1`, `h2` live in the utilities, `typography.md` §3 and §5). Report each one in one line: where, what departs, and **the exact comment or rule that explains it, quoted**. If nothing explains it, say so and leave the decision to the user. Never change it on your own.

Then ask what they want:

- **nothing** → stop;
- **change the token prefix** (e.g. `sb` → `ps`) → prefix rename below.

If it says **no**, the failing checks are the S/P/M codes of the report: continue with the flow.

#### Prefix rename (aligned projects only)

Ask for the new prefix (same rules as the startup question). Then:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rename-prefix.mjs" --to <new>           # dry run, writes nothing
```

Show the table (files, replacements) and the identifiers that start with the old prefix but were not renamed (they are not part of the style; the user decides). **Stop and wait.** After confirmation:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rename-prefix.mjs" --to <new> --apply
```

It renames raw variables (`--sb-primary` → `--ps-primary`), the style's own utilities (`sb-h1` → `ps-h1`, also with variants) and the `Prefix` comments, in the four CSS files and in `.vue`/`.ts`/`.js`/`.html`/`.md` under the source dir. Then verify: rerun the inventory (still aligned, new prefix), `contrast.mjs --prefix <new>`, and the project build. This is the only case where the skill touches files outside the four CSS files, and only for the prefix.

### 2. Existing contrast

If the project already has color variables, measure the current contrast. If the names match the roles: `node "${CLAUDE_SKILL_DIR}/scripts/contrast.mjs" <file> --prefix <current prefix>`. Otherwise write a `pairs.json` with the real pairs (text/background, border/surface) and use `--pairs`. Single pair: `--pair "#fff" "#3b82f6"`.

### 3. Report

Write the report in the format of "Report format". Every item has a code from `references/issues.md`. Before each part, read its reference:

- `references/typography.md` → Typography;
- `references/fonts.md` → Fonts;
- `references/method.md` → Color and theme, Shapes and breakpoints;
- `references/motion.md` → Motion.

### 4. Confirmation

**Stop and wait.** Do not write anything until the user has confirmed the report and answered the "To decide" items. If they change something, update only that part.

### 5. Writing

1. Install the missing modules and update `nuxt.config.ts` as in `references/example/nuxt.config.ts`: `css` contains **only** `~/assets/css/main.css`; `fonts.families` lists the families with the weights in use.
2. Write `theme.css`, `typography.css`, `animation.css`, `main.css` following **the structure of `references/example/` file by file**: same sections, same order, same resets.
   - the structure, naming, utilities, breakpoints and reduced-motion block: identical to the example, with the project's prefix (plus the `hero` role if any);
   - the values (palette, shadows, sizes, line heights, weights, tracking, radii, durations): the project's, or `DESIGN.md`'s, as approved in the report.
3. Old global files are not deleted: they are unlinked from `nuxt.config` and listed in the summary. Global `<style>` blocks in `.vue` files are moved only if the user approved it (P8).

### 6. Verification

1. `node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs" --file <srcDir>/assets/css/main.css`: every size with offset 0, no media query outside the breakpoints, no literal color outside `theme.css`, closed namespaces: `color, font, text, shadow, radius, font-weight, inset-shadow, drop-shadow, text-shadow, ease, animate, breakpoint`.
2. `node "${CLAUDE_SKILL_DIR}/scripts/contrast.mjs" <srcDir>/assets/css/theme.css --prefix {p}`: the result must match what was approved in the report. A pair the user chose to keep below the minimum stays flagged in the summary; it is never silently corrected.
3. Project build (`npm run build`, `pnpm build`, … or `npx nuxi build`): no CSS errors.

If a check fails because of a mistake by the skill, fix it and repeat before delivering.

### 7. Final summary

Short: what changed per area, values taken from `DESIGN.md` vs kept from the project, **provisional** values to refine, contrast kept below the minimum by choice, old files to remove. If the impact analysis was requested, the table of classes to replace.

State what was **not verified visually** (rendered contrast, dark theme, heading wrapping, overflow): the scripts check structure and numbers, not appearance. Recommend Impeccable as the next step: `/impeccable document` to record the aligned system when there is no `DESIGN.md`, then `/impeccable critique` and `/impeccable polish`. If it is not installed, the install lines are `/plugin marketplace add https://github.com/pbakaus/impeccable.git` and `/plugin install impeccable@impeccable`, as a suggestion only.

Remind the user that components were not modified, and that `/sb-context-nuxt:style-migrate` handles template migration.

## Fixed rules (structure)

- **Context**: Tailwind 4 + Nuxt 4, global state only, only the four files in `assets/css`.
- **Closed system**: no default Tailwind palette, family, weight, text size, shadow, radius, easing or animation. Namespaces are reset as in the example; only static utilities remain (`transparent`, `current`, `inherit`, `rounded-none`, `rounded-full`, `shadow-none`). Everything the project uses is defined by the theme.
- **Type roles** (`references/typography.md`): the set of roles, token shape and utilities are fixed; sizes and weights are the project's (or `DESIGN.md`'s). Two family roles, `display` and `body` (plus `mono` only if the project shows code). Guard rails: running text 1rem floor, inputs never below 16px, prose 45–75ch, `display` at most 6rem, tracking not below −0.04em, adjacent roles visibly distinct. `overline` is for badges, tags, counters, table headers and metadata, never a kicker above a heading.
- **Standard breakpoints**: only `sm` 640, `md` 768, `lg` 1024, `xl` 1280, declared in `theme.css`. Every media query on other widths moves to the nearest breakpoint. Text changes **in steps** at `lg`, only `display`, `h1`, `h2`.
- **`clamp()` only above `display`**: text larger than `display` becomes the `hero` role, with a `clamp()` built with the formula in `typography.md` §4. Any other `clamp()` on text becomes a stepped role.
- **Literal colors only in `theme.css`**, in the `:root, [data-theme="light"]` and `[data-theme="dark"]` blocks. Both themes exist.
- **Reduced motion** always handled, by zeroing `--{p}-motion-distance`, not the durations (`references/motion.md` §3).

## Values: how the skill treats them

**Color.** The palette belongs to the project (or `DESIGN.md`). The skill:

- **maps** existing colors onto the roles (`references/method.md` §1) where the meaning matches, and **keeps** project colors without a matching role, with an agreed semantic name;
- **does not change** existing values on its own initiative: every change to an existing color is a "To decide" proposal;
- **derives** missing roles minimally, marked **provisional**;
- **measures** contrast (4.5:1 text, 3:1 large text, controls, focus) and reports it. Pairs below the minimum come with a lightness-only correction proposal; the choice is the user's.

The lightness table in `method.md` is an *example*, never a rule.

**Radii, shadows, motion.** Closed sets with the project's values (or `DESIGN.md`'s), merged into the fixed number of steps.

**Fonts** (`references/fonts.md`). The skill only normalizes declaration and loading: two family roles (`--font-display`, `--font-body`, optional `--font-mono`), loaded through `@nuxt/fonts` with only the weights in use. It does not judge the pairing or propose alternatives. With more than two families in use it asks which roles they play; if the pairing looks unintentional it says so and points to `/impeccable typeset`.

## Specific cases

- **Value equidistant between two steps**: the element's role decides (`typography.md` §6); the report says which and why.
- **Recurring off-scale value**: aligned like the others. The report groups it so the user sees the effect, but it does not become a new role.
- **Several different sizes above `display`**: a single `hero` role, with the most used maximum; the report lists the absorbed values.
- **No dark theme**: propose a minimal derivation, every value marked **provisional**, to be approved.
- **Dark theme on `.dark` or only on `prefers-color-scheme`**: migrate it to `data-theme` (C11). `color-mode` already covers the system preference.
- **Fonts from `@font-face` or a Google `@import`**: they move to `@nuxt/fonts` (T7). Local fonts: `@nuxt/fonts` serves them from the `public/` folder, and the report says so.
- **Global variables that are not style** (z-index, layout widths…): they stay outside the four files; the report mentions them without touching them.

## Report format

Write the report in the user's language; the structure is this:

```markdown
# Global style — report

**Project**: Nuxt x · Tailwind x · color-mode ✓/✗ · fonts ✓/✗ · prefix `{p}` · DESIGN.md ✓/✗ · component impact: yes/no
**Sources analyzed**: list

## Blocking
- [P1] … (if any, the report stops here)

## DESIGN.md conflicts (only if it exists)
| Code | Item | Current CSS | DESIGN.md |

## Structure (applied as follows)
| Code | Where | Now | Change |

## Fonts
Detected families and their role; more than two: question on roles.

## Typography
| Code | Where | Now | Role | Reason |
Optional `hero` role with the computed clamp.

## Breakpoints (applied as follows)
| Code | Where | Now | Breakpoint |

## Color and theme
Palette: for each color, light value, dark value, role or name, origin (existing / DESIGN.md / derived, provisional).
Contrast below the minimum: pair, ratio, proposal.

## Shapes and shadows
## Motion

## Provisional values
List of everything derived, with the Impeccable command that refines it.

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
| `references/example/*` | before writing the files: it is the structure to replicate (values are the `sb` template's) |
| `scripts/inventory.mjs` | global style inventory (+ impact with `--classes`) |
| `scripts/contrast.mjs` | contrast and OKLCH lightness, light and dark |
| `scripts/rename-prefix.mjs` | prefix rename on an aligned project (dry run, then `--apply`) |
