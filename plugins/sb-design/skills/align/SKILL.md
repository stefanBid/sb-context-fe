---
name: align
description: Normalizes any global style setup of an app (today Nuxt 4 + Tailwind 4) into the fixed four-file structure (main.css, theme.css, typography.css, animation.css in the project's style folder), keeping the project's own values; renames the token prefix; syncs the values with a Claude design snapshot. Use it when asked to align, normalize, unify or reorganize an app's global theme, palette, type scale, dark mode or global CSS.
---

# Align the global style

Normalizes any global style setup of an app into the fixed four-file structure, keeping the project's own values.

The skill fixes the **structure**. It does not judge or improve the design: values come from `.sb-context/design-source.md` when it exists (the plugin's own snapshot of a Claude design, written by `/sb-design:extract-style`) and otherwise from the project itself. Improving the design is the job of Impeccable (`impeccable@impeccable`), a separate plugin the user may install. The two plugins are not connected: this skill never reads or writes Impeccable's `DESIGN.md`, and only recommends Impeccable as the next step.

**Language**: this file and its references are in English, but talk to the user in their language: questions, report and summary.

## The three layers

What this skill enforces is written in three places. Read them before the report, and follow them when writing:

| Layer | File | What it says |
| --- | --- | --- |
| **standard** | `${CLAUDE_SKILL_DIR}/../../standard/README.md` (and the files it lists) | structure vs values and their precedence, the scope, the four files, the prefix, the fixed rules, how values are treated, specific cases |
| **engine** | `${CLAUDE_SKILL_DIR}/../../engines/tailwind4/README.md`, `example/` | how all of it is written with Tailwind 4: resets, `@theme` / `@theme inline`, utilities, the dark variant, the example files to replicate |
| **framework** | `${CLAUDE_SKILL_DIR}/../../frameworks/nuxt.md`, sections **Requirements**, **Where things are**, **align** | where the style lives, what this skill may change in the framework's config, color mode, fonts, modules to install, build |

The engine is the profile's `styling.engine.name` and the framework the profile's `adapter`. Today only `tailwind4` and `nuxt` exist: any other value means the project is out of scope (say which layer is missing and stop).

## Requirements (blocking)

- **An app on a stack sb-design has an adapter for** (today Nuxt): `node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" get` must show `adapter: "nuxt"` and `kind: "app"`. A library, or a Vue + Vite app, is out of scope for now: say so and stop (the scripts refuse it too). Format: `${CLAUDE_SKILL_DIR}/../../core/references/profile.md`.
- The engine's and the framework's **Requirements**: an unsupported version stops the skill (P1, P2, P5). No adaptation.
- What the framework file says is required (color mode, fonts) is installed by this skill during the write phase if missing, with the project's package manager (`packageManager` of the profile).

## Questions at startup

Run the inventory first (Flow step 1: it is read only). If the project is **already aligned** (step 1b), skip these questions. Otherwise, before the report, ask these two questions together (with the question tool if available, otherwise in text).

### 1. Prefix (required)

Read it first: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" get style.prefix`. If the project settings already have it, **use it and do not ask again** (the user changes it only by asking, through the prefix rename). If the project is already aligned and the settings are empty, detect it from `theme.css` (`node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" detect --need style` → `facts.style.prefix`), confirm it with the user and save it. Otherwise ask.

Ask. Propose a default: the `suggestedPrefix` of `design-source.md` when it has one (initials of the design's name, e.g. `PraticaSicura` → `ps`), otherwise one derived from the project name. It is only a proposal: **whatever the user answers is the prefix** (`pippo` → `pippo`, within the rules below). Never fall back to a fixed prefix, and `sb` in the engine's `example/` is just the example's. The prefix becomes:

- the prefix of the raw variables: `--{p}-bg`, `--{p}-primary`, `--{p}-duration-state`;
- the prefix of the skill's utilities: `{p}-h1`, `{p}-body`, `{p}-overline`, `{p}-transition`.

The engine's own tokens keep the role name (with Tailwind 4: `--color-primary` → `bg-primary`, `--text-h1` → `text-h1`): those are the engine's utilities, not the skill's. Show the user an example when you ask for the prefix.

Rules: the standard's (2–4 lowercase letters, starting with a letter, no hyphens) and the engine's (with Tailwind 4, never one of its utility roots: the list is in the engine file). If the user picks a forbidden one, explain the conflict and ask for another.

### 2. Component impact analysis (optional)

Ask whether they want to know which component classes will stop working once the theme is closed (default palette, text sizes, radii, shadows). Explain that it reads every file in the project and therefore costs more. **Default: no.** If yes, run the inventory with `--classes` and add the "Component impact" section to the report.

## Flow

### 0. Values source

If `.sb-context/design-source.md` exists, **read it first** and take palette, families, type values, radii, shadows and motion from it. It is written by `/sb-design:extract-style` and has a fixed shape (`${CLAUDE_SKILL_DIR}/../extract-style/references/design-source.md`): readable tables for each area and, at the end, a complete `json design-source` block; **the JSON block is the one to read**, and it has both themes, resolved aliases, mobile sizes, shadows per theme and the design's suggested prefix. Say which snapshot is being applied (design name, `source.version`, extraction date) and that **this skill does not read Claude**: it applies what is on disk. Add one line in the user's language: the design may have changed since then; if it might have, re-run `/sb-design:extract-style`, which re-reads the design and shows what changed. No artifact check here. Its "Gaps" list becomes the **provisional** items of the report. Report any conflict between `design-source.md` and the current CSS (P10); `design-source.md` wins, except for the eyebrow, breakpoint and 16px rules.

**Role names are checked before anything else.** If the snapshot's `roleMap.status` is `needs-confirmation` (the design's names do not clearly match the plugin's roles: e.g. its `surface` is the page background, the plugin's `bg`), show the user a table: design name, usage text, suggested role, same-name role if any. Agree each one (a design name may map to **no** role: it stays design-only) and save it:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --map colors.surface=bg colors.surface-raised=surface type.heading=h2 colors.line=null
```

The mapping is stored in `.sb-context/design-map.json` and survives re-extractions. Without it, `sync-values.mjs` exits 4 and compares nothing: a wrong mapping would overwrite the wrong color. Use the same mapping to pick values when writing the files from the snapshot. Extra themes (a third theme the structure has no place for) and token groups under `extra` are listed in the report as **To decide**, never applied silently.

A `DESIGN.md` at the project root belongs to Impeccable: do not read it as a source, do not write it. If it exists, mention it once in the report as "not used".

No `design-source.md` but the user has a design made in Claude (an artifact link or a name)? Run `/sb-design:extract-style` first. No design at all? Continue below: the skill works on any project.

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

If the inventory reports a blocking issue (P1, P2, P5: the framework or the engine below the supported version, or a global style in SCSS), **stop here** and report it.

Then read the flagged source files: the script finds the values; you work out the **role** of each rule from its selector and context.

### 1b. Already aligned?

The inventory prints a **Structure** section with `Already aligned: yes/no` (four files, imports, `@theme inline`, closed namespaces, `data-theme`, reduced motion, prefixed utilities, no tokens outside `@theme`).

If it says **yes**, do not rewrite the structure. Tell the user the style is already in the fixed structure, then **check the values against the design**: if `.sb-context/design-source.md` exists, run

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --check
```

Exit 0 → values aligned with the design, nothing to do. Exit 10 → the design changed (or the style never got its values): go to **Sync values with the design** below. Exit 4 → the role mapping is missing or inconsistent: agree it first (step 0), then repeat. The design is the source of truth for values: a project whose style disagrees with its design snapshot is never reported as "done".

If you noticed a value that departs from the usual pattern (e.g. a mobile size written as a literal in a utility instead of a token), do not call it "probably intentional". Open the file and look for the justification: a header or inline comment, or a rule the structure already allows (mobile steps for `display`, `h1`, `h2` live in the utilities, `typography.md` §3 and §5). Report each one in one line: where, what departs, and **the exact comment or rule that explains it, quoted**. If nothing explains it, say so and leave the decision to the user. Never change it on your own.

Then ask what they want:

- **nothing** → stop (only if the values are aligned or the user declines the sync);
- **sync the values with the design** → below (proposed first whenever `--check` found differences);
- **change the token prefix** (e.g. `sb` → `ps`) → prefix rename below.

If it says **no**, the failing checks are the S/P/M codes of the report: continue with the flow.

#### Sync values with the design (aligned projects, snapshot present)

Runs when the design changed in Claude and `/sb-design:extract-style` re-extracted it, or whenever `--check` reports differences. It changes **values only**; structure, names, prefix and files stay as they are.

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs"            # table of differences, writes nothing
```

It compares the snapshot with the project's `theme.css` and `typography.css`: colors per theme, shadows, radii, type sizes / line heights / weights / tracking, mobile sizes of `display`, `h1`, `h2`, and the families. Then:

1. Show the table (token, theme, project now, design) and, for changed colors, the contrast of the new pairs (`contrast.mjs theme.css --prefix {p}`; a pair below the minimum comes with the lightness-only correction proposal, the choice is the user's).
2. Show **Needs a decision**, which the script never applies: a role new in the design (e.g. `accent`: add it to `theme.css`, both `@theme inline` and the contrast check), a role the design dropped (kept, the user decides), a changed family (stack in `typography.css` **and** the framework's font configuration: the framework file says where), the `hero` clamp when `display` changed. Resolve each with the user and write it by hand following the engine's `example/`.
3. **Stop and wait** for confirmation. Then `sync-values.mjs --apply` writes the changed values, refreshes the px comments and records the applied version in `.sb-context/design-applied.json`.
4. Verify as in step 6 (inventory still aligned, contrast, build), then run `sync-values.mjs --check` again: it must exit 0.
5. Say what was **not** verified visually, and that components using changed tokens follow automatically; components using removed ones need `/sb-design:migrate`.

#### Prefix rename (aligned projects only)

Ask for the new prefix (same rules as the startup question). Then:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rename-prefix.mjs" --to <new>           # dry run, writes nothing
```

Show the table (files, replacements) and the identifiers that start with the old prefix but were not renamed (they are not part of the style; the user decides). **Stop and wait.** After confirmation:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/rename-prefix.mjs" --to <new> --apply
```

After it succeeds, save the new prefix: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" set style.prefix '"<new>"'`.

It renames raw variables (`--sb-primary` → `--ps-primary`), the style's own utilities (`sb-h1` → `ps-h1`, also with variants) and the `Prefix` comments, in the four CSS files and in `.vue`/`.ts`/`.js`/`.html`/`.md` under the source dir. Then verify: rerun the inventory (still aligned, new prefix), `contrast.mjs --prefix <new>`, and the project build. This is the only case where the skill touches files outside the four CSS files, and only for the prefix.

### 2. Existing contrast

If the project already has color variables, measure the current contrast. If the names match the roles: `node "${CLAUDE_SKILL_DIR}/scripts/contrast.mjs" <file> --prefix <current prefix>`. Otherwise write a `pairs.json` with the real pairs (text/background, border/surface) and use `--pairs`. Single pair: `--pair "#fff" "#3b82f6"`.

### 3. Report

Write the report in the format of "Report format". Every item has a code from `${CLAUDE_SKILL_DIR}/../../standard/issues.md`; for a code of layer `engine` or `framework`, the correction is the one of that layer's file. Before each part, read its standard file (and the engine's section for the same area):

- `standard/typography.md` → Typography;
- `standard/fonts.md` → Fonts;
- `standard/roles.md` → Color and theme, Shapes and breakpoints;
- `standard/motion.md` → Motion.

### 4. Confirmation

**Stop and wait.** Do not write anything until the user has confirmed the report and answered the "To decide" items. If they change something, update only that part.

### 5. Writing

1. Install what the framework file requires and register the style as its **align** section says (with Nuxt: the modules, `css` with only `main.css`, `colorMode`, `fonts.families` with the weights in use, as in `frameworks/nuxt.config.ts`). Nothing else of the framework's config changes.
2. Write `theme.css`, `typography.css`, `animation.css`, `main.css` in the style folder (`paths.styles` of the profile) following **the structure of the engine's `example/` file by file**: same sections, same order, same resets.
   - the structure, naming, utilities, breakpoints and reduced-motion block: identical to the example, with the project's prefix (plus the `hero` role if any);
   - the values (palette, shadows, sizes, line heights, weights, tracking, radii, durations): the project's, or `design-source.md`'s, as approved in the report.
3. Save the prefix in the project settings: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" set style.prefix '"{p}"'`. If a snapshot was used, record it: `node "${CLAUDE_SKILL_DIR}/scripts/sync-values.mjs" --record` (writes `.sb-context/design-applied.json`: artifact version, prefix, css dir).
4. Old global files are not deleted: they are unregistered (with Nuxt: removed from `css`) and listed in the summary. Global `<style>` blocks in `.vue` files are moved only if the user approved it (P8).

### 6. Verification

1. `node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs" --file <styles>/main.css`: the checks of the engine's **Verification** section (every size with offset 0, no media query outside the breakpoints, no literal color outside `theme.css`, the closed namespaces).
2. `node "${CLAUDE_SKILL_DIR}/scripts/contrast.mjs" <styles>/theme.css --prefix {p}`: the result must match what was approved in the report. A pair the user chose to keep below the minimum stays flagged in the summary; it is never silently corrected.
3. Project build, as the framework file says: no CSS errors.

If a check fails because of a mistake by the skill, fix it and repeat before delivering.

### 7. Final summary

Short: the snapshot applied (version, date) and, if one was used, the reminder that `/sb-design:extract-style` re-checks the design; what changed per area, values taken from `design-source.md` vs kept from the project, **provisional** values to refine, contrast kept below the minimum by choice, old files to remove. If the impact analysis was requested, the table of classes to replace.

State what was **not verified visually** (rendered contrast, dark theme, heading wrapping, overflow): the scripts check structure and numbers, not appearance. Recommend Impeccable as the next step: `/impeccable document` to record the aligned system when the project has no `DESIGN.md`, then `/impeccable critique` and `/impeccable polish`. If it is not installed, the install lines are `/plugin marketplace add https://github.com/pbakaus/impeccable.git` and `/plugin install impeccable@impeccable`, as a suggestion only.

Remind the user that components were not modified, and that `/sb-design:migrate` handles template migration.

## Rules and values

The fixed rules (closed system, type roles and guard rails, breakpoints, `clamp()`, literal colors, reduced motion), how values are treated (color, radii, shadows, motion, fonts) and the specific cases (equidistant values, recurring off-scale values, several sizes above `display`, no dark theme, `.dark` themes, `@font-face` fonts, non-style variables) are in `${CLAUDE_SKILL_DIR}/../../standard/README.md`. They apply to every item of the report and of the writing.

## Report format

Write the report in the user's language; the structure is this:

```markdown
# Global style — report

**Project**: framework x (adapter) · engine x · color mode ✓/✗ · fonts ✓/✗ · prefix `{p}` · design-source.md ✓/✗ · component impact: yes/no
**Sources analyzed**: list

## Blocking
- [P1] … (if any, the report stops here)

## design-source.md conflicts (only if it exists)
| Code | Item | Current CSS | design-source.md |

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
Palette: for each color, light value, dark value, role or name, origin (existing / design-source.md / derived, provisional).
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
| `${CLAUDE_SKILL_DIR}/../../standard/README.md` | before the report: precedence, scope, fixed rules, values, specific cases |
| `${CLAUDE_SKILL_DIR}/../../standard/typography.md` | before the Typography part and before writing `typography.css` |
| `${CLAUDE_SKILL_DIR}/../../standard/fonts.md` | before the Fonts part |
| `${CLAUDE_SKILL_DIR}/../../standard/roles.md` | before the Color, Shapes and Breakpoints parts |
| `${CLAUDE_SKILL_DIR}/../../standard/motion.md` | before the Motion part |
| `${CLAUDE_SKILL_DIR}/../../standard/issues.md` | for the code, severity and layer of each item |
| `${CLAUDE_SKILL_DIR}/../../engines/tailwind4/README.md` | how each part is written with Tailwind 4, the engine's corrections and verification |
| `${CLAUDE_SKILL_DIR}/../../engines/tailwind4/example/` | before writing the files: the structure to replicate (values are the `sb` template's) |
| `${CLAUDE_SKILL_DIR}/../../frameworks/nuxt.md` | requirements, where the style lives, what may change in `nuxt.config.ts`, color mode, fonts, build; the framework's corrections |
| `${CLAUDE_SKILL_DIR}/../../frameworks/nuxt.config.ts` | the framework settings the style needs |
| `${CLAUDE_SKILL_DIR}/../../core/references/stack-docs.md` | maintainers' guides for Tailwind theme, `@nuxt/fonts`, `@nuxtjs/color-mode`, `nuxt.config.ts`; open them when module options or Tailwind v4 behavior are in doubt |
| `scripts/inventory.mjs` | global style inventory (+ impact with `--classes`) |
| `scripts/contrast.mjs` | contrast and OKLCH lightness, light and dark |
| `scripts/sync-values.mjs` | values of the project vs the design snapshot: `--check`, table, `--apply`, `--record` |
| `scripts/rename-prefix.mjs` | prefix rename on an aligned project (dry run, then `--apply`) |
