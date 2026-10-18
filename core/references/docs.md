# Project docs

Which official docs the skills open for **this** project, at the versions it uses: chosen once with `/sb-core:context`, stored in `.sb-context/docs.json` (it can be committed), and pointed to from a lean block of the project's `CLAUDE.md`.

Shared by the skills of every plugin. Skills reach it with `${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs`; the logic is in `core/lib/docs.mjs`, the catalog in `core/lib/docs-catalog.mjs`.

## How a skill uses the docs

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" get --for <plugin:skill>
```

It prints the links that skill opens (`--for sb-design:extract-ui`):

- `source: "project"`: the project's own choice, from `docs.json`. An empty list is a choice too (the user dropped those links): do not fall back to the catalog;
- `source: "catalog"`: the project has no `docs.json` yet, so these are the catalog's links for its stack. Use them, and mention once that `/sb-core:context` lets the user choose.

The links are the source of truth for how each framework and library is meant to be used, as written by its maintainers. Open them (WebFetch) before writing code you are not certain about, and whenever your own knowledge may be insufficient or out of date (a new major, module options, anything that changed across versions). Skip them only for plain markup and utilities you are certain about, and say in the report what was **not verified** against the docs.

## docs.json

```json
{
  "schema": 1,
  "updatedAt": "2026-10-17",
  "links": [
    {
      "url": "https://floating-ui.com/docs/vue",
      "title": "Vue: useFloating",
      "topic": "vue",
      "package": "@floating-ui/vue",
      "version": "1",
      "summary": "useFloating, middleware and autoUpdate in Vue; refs for the reference and floating elements",
      "source": "proposed",
      "usedBy": [],
      "verifiedAt": "2026-10-17"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `url` | the page (http or https); the key of the link |
| `title` | the text of the link in `CLAUDE.md` |
| `topic` | what the page is about, a short slug (`pages`, `library-mode`); the catalog's id is `<package>:<topic>` |
| `package` | the package it documents; `null` for a page about no package (the links are then grouped as **Other**) |
| `version` | the version the page documents (`"4"`, `"1.x"`), not the installed one |
| `summary` | one line on what it covers, written after reading it ("covers X, Y, Z; version N") |
| `source` | `proposed` (catalog, or found by Claude) or `user` (a link the user gave) |
| `usedBy` | the skills that open it first, `plugin:skill` |
| `verifiedAt` | the day the page was opened and found right, or `null` |

## The catalog

`core/lib/docs-catalog.mjs` lists the official docs the plugins know, one entry per package (Nuxt, Vue, Vite, Tailwind CSS, Vue Router, the i18n libraries, the Nuxt modules, VueUse, Pinia, Vitest, Fontsource, Unhead, Iconify, Floating UI…): the links, the **major** they document (the latest when the entry was written), the skills that use each, and when a link applies (`when: { kind: 'library' }`). `detect` matches it with the project's profile and dependencies.

- **status** of a package: `current` (the project uses the major the docs document), `behind` (the project is on an older major: ask which version to follow; `older` is where the docs of the project's major live, when known), `ahead` (the project is newer than the catalog: the catalog is out of date, open the docs of the project's major instead), `unknown` (not installed and no range to read).
- The catalog is the seed and the fallback, never the project's choice: once `docs.json` exists, only its links count.

## The CLAUDE.md block

`docs.mjs render` writes a lean block between two markers:

```markdown
<!-- sb-context:docs:start -->
<!-- Written by /sb-core:context from .sb-context/docs.json: change the links there (or run the skill again), not here. -->
## Project docs

Vue 3.5 library in TypeScript, built with Vite 7 (lib mode), wrapping Floating UI.

These links are the source of truth for this stack, at the versions the project uses. Open them (WebFetch) when unsure or when your own knowledge may be out of date, and say what was not verified against them.

- **Vue 3**: [`<script setup>`](https://vuejs.org/api/sfc-script-setup.html) · [Reactivity fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- **Vite 7**: [Library mode](https://v7.vite.dev/guide/build.html#library-mode)
- **Floating UI 1**: [Vue: useFloating](https://floating-ui.com/docs/vue) · [Middleware](https://floating-ui.com/docs/middleware)
<!-- sb-context:docs:end -->
```

- One line of context from the profile, the rule, the links grouped by package. Summaries, dates and `usedBy` stay in `docs.json`: `CLAUDE.md` is loaded in every session and must stay short.
- **Only the text between the markers changes.** Without markers the block is appended at the end; without `CLAUDE.md` (and without `.claude/CLAUDE.md`) the file is created, and only after the user saw its content. Markers that do not pair up stop the write.
- No links saved: the block is removed, the rest of the file stays.
