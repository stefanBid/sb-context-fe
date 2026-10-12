---
name: global-style-refactor
description: Reads Vue templates line by line, tag by tag, and proposes (then applies, after confirmation) the refactor of component classes and styles after a change to the global style of a Nuxt 4 + Tailwind 4 project. Command only.
disable-model-invocation: true
argument-hint: "[files or folders to analyze]"
---

# Template refactor after a global style change

A command to run **after** the global style has been reorganized (usually with the `global-style-nuxt` skill). It reads templates line by line: for each tag it looks at the classes, the dynamic classes, the inline style and the component's `<style>`. It works out what no longer works or does not follow the theme, and proposes the refactor. It applies changes only after confirmation.

The reference is **the project's current global style**, not a fixed list: a class is broken if the project's theme no longer generates it. The script checks this by compiling with Tailwind.

**Language**: this file and its references are in English, but talk to the user in their language: questions, proposals and summary.

## Requirements

- Nuxt 4 and Tailwind 4 with `@tailwindcss/vite` (the script uses the project's `@tailwindcss/node`, `vue/compiler-sfc` and `postcss`). Otherwise stop and say so.
- A global style with its tokens in `@theme` (the entry point is the first `css` entry in `nuxt.config`, or `--css`).
- The prefix of the typographic utilities is detected automatically (`{p}-h1`, `{p}-body`). If the script says "not detected", ask the user before proposing typographic classes.

## Flow

### 1. Scope

Arguments received: $ARGUMENTS

- If there are arguments, they are the files or folders to analyze.
- If there are none, run **only** the summary, which is cheap:

  ```bash
  node <skill folder>/scripts/template.mjs --summary
  ```

  Show the user the files with the most changes and ask which ones to analyze in detail. Do not run the detailed analysis of the whole project unless the user asked for it.

### 2. Line-by-line analysis

```bash
node <skill folder>/scripts/template.mjs <files or folders> --out /tmp/template-refactor.json
```

For each flagged line the script gives: tag, class, status (`broken`, `arbitrary value`, `redundant`, `unknown`, `inline style`), a proposal and a note. It also reports issues in the component's `<style>` and the heading structure (more than one `h1` in the same page, skipped levels).

Then **read each file**: the script sees the classes, you see the meaning. For each flagged line look at the tag, its content, its siblings and its parent, and decide the replacement with `references/mapping.md`. Also look for what the script cannot see:

- classes built in `<script>` (strings in `computed`, variant maps, `cva`/`tv`): read the strings and treat them as classes;
- props that end up as classes (`color="gray"`, `size="sm"` passed to a component that turns them into classes): follow the component;
- classes on an element that become redundant with the role utility (`font-*`, `leading-*`, `tracking-*`, `uppercase`).

### 3. Proposal

For each file:

```markdown
## app/pages/index.vue

| Line | Tag | Before | After | Reason |
| --- | --- | --- | --- | --- |
| 9 | `<div>` | `text-xl font-semibold` | `ps-h4` | card title: h4 role, the role carries the weight |

**`<style>`**: lines, before → after.

**To decide**
1. Line 4: second `<h1>` in the page → `<h2 class="ps-display">`? (changes the structure)
```

These always go under "To decide": tag or heading level changes, `unknown` classes, default animations without an equivalent, dynamic `:style`, and any case where two roles are equally plausible.

### 3b. Design review

A refactor that only swaps classes can leave a page consistent and still weak. Before asking for confirmation, read `../global-style-nuxt/references/design-critique.md` and check the affected pages against it: are the loudest roles used where they were designed to be, are sections repeated without variation, do demos show misleading states, is status ever colour alone. Add the findings as a short "Design review" block after the file tables. They are **proposals under "To decide"**, never applied without approval, and the project's `DESIGN.md` / `CLAUDE.md` win over any outside rule (state the conflict in one line).

### 4. Confirmation

**Stop and wait.** The user can approve everything, file by file, or exclude single lines.

### 5. Applying

- Change only what was approved, with minimal edits: tokens inside `class`, strings inside `:class`, the `style` attribute, declarations in the component's `<style>`.
- Keep the order and formatting of the classes; do not touch logic, props, events or text.
- If you use `@apply` with theme utilities in the component's `<style>`, add `@reference "~/assets/css/main.css";` (or the real path of the global style) at the top of the block.
- Do not modify the global style. If something is needed that the theme does not have (for example the `hero` role), note it in the summary for the `global-style-nuxt` skill.

### 6. Verification

Rerun the script on the modified files: only the lines the user chose not to change should remain. If the user asks, also run the build.

The script checks classes, not appearance. If no browser tool is available, say in the summary that the rendered result (both themes, mobile, long translated headings) was **not verified**.

### 7. Summary

Short: files modified, number of replacements by type, lines left as they were by choice, any requests for the global style.

## References

| File | When |
| --- | --- |
| `references/mapping.md` | before writing the proposal: how to choose the right role |
| `../global-style-nuxt/references/design-critique.md` | before step 4: critical design review of the affected pages |
| `scripts/template.mjs` | summary (`--summary`) and line-by-line analysis |
