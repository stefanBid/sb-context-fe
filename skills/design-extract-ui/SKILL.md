---
name: component-adapt
description: Rewrites a Vue component that comes from elsewhere (another project, a design export, a pasted snippet) so it uses this project's global style — theme colors, typography roles, radii, shadows, motion — while keeping its structure and behavior. Use it when asked to integrate, adapt or align a component or .vue file to the project's style.
argument-hint: "[path to a .vue file, or paste the component]"
---

# Adapt a component to the project's style

Takes a `.vue` component written against another style (other class names, default Tailwind palette, hard-coded colors, a UI library) and rewrites it with **this project's** tokens and utilities. Typical uses: a button copied from another project, components extracted from a design.

It changes **one component at a time**, never the global style. If the component needs something the theme does not have, it says so and does not invent it.

**Language**: this file is in English; talk to the user in their language.

## Requirements

- Nuxt 4 + Tailwind 4 with `@tailwindcss/vite`, and a global style already aligned (`/sb-context-nuxt:style-align`). The script reads the tokens in `@theme` and the `{p}-<role>` utilities of the project; without them it stops and says so.
- Works with any package manager: the script resolves its modules from the project root, then from `@tailwindcss/vite` and `nuxt`.

## Flow

### 1. Input

Arguments received: $ARGUMENTS

- A path to a `.vue` file → use it.
- Pasted code → ask where it should live (`app/components/…`), then write it there **unchanged** first, so the analysis runs on a real file; if the user does not want a file yet, write it to a scratch file outside the project and analyze that.
- Several files (a design export): handle them one at a time, in the order the user gives.

### 2. Understand the project's conventions

Before rewriting, look at 2–3 existing components close to this one (same kind: buttons, cards, forms): component naming, how props become classes, `<script setup lang="ts">` style, i18n use for text, existing base components (`BaseButton`, `UiCard`…). **If an equivalent component already exists, propose using it instead of adapting the foreign one** (To decide).

### 3. Analyze

```bash
node "${CLAUDE_SKILL_DIR}/../style-migrate/scripts/template.mjs" <file> --out /tmp/component-adapt.json
```

For every class it says: `ok` (the theme generates it), `broken` (default Tailwind, not in this theme), `arbitrary value`, `redundant`, `unknown` (not Tailwind and not defined here: another project's custom class, or a UI library), plus inline styles, the component's `<style>`, and the heading structure.

The script only sees classes. Read the file yourself for what it cannot see:

- classes built in `<script>` (maps, `computed`, `cva`/`tv` variants);
- props that become classes, and foreign UI components (`UButton`, `v-btn`, shadcn imports): decide whether to replace them with native elements and project classes or with the project's own base components;
- hard-coded text that should go through i18n, if the project uses it;
- `<style>` blocks with literal colors, sizes or fonts.

### 4. Proposal

Choose each replacement with `${CLAUDE_SKILL_DIR}/../style-migrate/references/mapping.md` (role before similarity; the tag gives structure, the class gives look). Show the result as a unified diff of the file, followed by a table of the non-obvious choices:

| Line | Before | After | Reason |
| --- | --- | --- | --- |

Under **To decide**: heading levels, replacing a foreign component with a project component, `unknown` classes, anything where two roles are equally plausible.

Under **Missing from the theme**: every value the component needs that the theme cannot express (a color with no matching role, a size above the largest role, an easing or animation that does not exist). Do not invent a token and do not hard-code a literal value to cover it: list it, with the closest existing token as the stand-in, for `/sb-context-nuxt:style-align`.

### 5. Confirmation

**Stop and wait.** The user can approve all, part, or ask for another approach. Nothing is written before that.

### 6. Applying

- Minimal edits: classes, `:class` strings, `style` attributes, declarations in `<style>`. Keep logic, props, events, slots and emitted names as they are.
- If you use `@apply` with theme utilities in `<style>`, add `@reference "~/assets/css/main.css";` (or the real path) at the top of the block.
- Keep the component's own file name and location unless the user asked to rename or move it.

### 7. Verification

Rerun the script on the file: only the lines the user chose to keep should remain. Report the result in one short block: what was replaced, what was kept on purpose, what is missing from the theme.

The script checks classes, not appearance: say that the rendered result (both themes, mobile, long text) is **not verified**, and recommend `/impeccable critique` on the page that uses the component (Impeccable is a separate, optional plugin).
