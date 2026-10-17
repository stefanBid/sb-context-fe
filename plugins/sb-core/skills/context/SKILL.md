---
name: context
description: Chooses with the user the official documentation of this project's stack (Nuxt, Vue, Vite, Tailwind, the libraries it uses or wraps), at the versions the project uses — proposes the maintainers' links from the project profile and dependencies, asks which version to follow when the project is behind, reads and summarizes the links the user gives, saves them in .sb-context/docs.json and points CLAUDE.md to them with a short managed block. Every skill then opens these links before writing code it is not sure about. Trigger phrases (English or Italian) — "set up the project docs", "which docs should Claude follow?", "add this link to the project docs", "imposta la documentazione del progetto", "aggiungi questo link alla documentazione".
---

# Project docs

Which official docs the skills open for **this** project, at the versions it uses. The plugins carry a catalog of the maintainers' guides for the stacks they know; this skill turns it, with the user, into the project's own list, adds the links the user trusts, and writes:

- `.sb-context/docs.json`: the links, with a summary, the version they document, which skill opens them, when they were verified (it can be committed);
- a **lean block** in the project's `CLAUDE.md`, between `<!-- sb-context:docs:start -->` and `<!-- sb-context:docs:end -->`: one line on what the project is, the rule, the links grouped by package. Nothing outside the markers is touched.

Both writes are shown before they happen. Run it again any time: it starts from what is saved, and proposes only what changed.

Format and rules: `${CLAUDE_SKILL_DIR}/../../core/references/docs.md`.

**Language**: this file is in English, but talk to the user in their language. Link titles stay as the docs write them.

## 1. What the project is

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" detect
```

It prints, as JSON:

- `profile` (`saved: false` means `/sb-core:setup` never confirmed it: say so, recommend running it, and go on with the detected profile) and `context`, the line the `CLAUDE.md` block will open with;
- `packages`: the packages of the catalog the project uses, with the major it uses (`installed`), the major the docs document (`docsMajor`) and `status`;
- `proposals`: the catalog's links that fit the project (id `<package>:<topic>`, title, url, `usedBy`, `saved`);
- `uncatalogued`: the runtime dependencies and peers the catalog does not know, with their `homepage`;
- `saved`: how many links the project has, and `review`, the saved links that may no longer fit (a package removed, docs of another major).

Show the context line and a table of `packages` (package, project's major, docs' major, status). A library: say which packages it wraps (its peers) and that those are the docs that matter most, with the framework's.

## 2. Which version to follow

Only for the packages that are not `current`, in one go (question tool if available):

- **`behind`** (the project is on an older major than the docs): ask whether to follow the docs of the project's major (**recommended**: they match the code as it is) or the latest (useful only while planning the upgrade, `/sb-health:deps`). For the project's major, open `older` when it is there (WebFetch), otherwise find the versioned docs from the package's site; never propose a page you have not opened.
- **`ahead`** (the project is newer than the catalog): the catalog is out of date for that package. Open the docs of the project's major and propose those pages instead, saying so.
- **`unknown`** (not installed, no version in the range): propose the latest docs and say the version was not checked.

The latest docs are the default for everything else.

## 3. The proposals

Show the proposals grouped by package, as a table: title, what it is for (`usedBy`: the skills that open it first, or "general"), already saved. Recommend keeping them all; a library rarely needs the app-only pages, and the catalog already leaves out what does not fit the profile.

For the `uncatalogued` packages that matter (the libraries a library wraps, the UI or data libraries an app builds on — not tooling or types), propose their docs too: start from `homepage`, **open it** (WebFetch), and propose only pages you read, with a one-line summary.

Ask in one go:

- which links to **drop** (default: none);
- whether the user has **links of their own** to add (internal guides, a design system's docs, a specific page).

For every link the user gives: open it (WebFetch) and summarize it in one line — "covers X, Y, Z; version N" — then ask whether to keep it. A page that does not load, or that is about something else than the user said, is reported, not saved. Ask which skill should open it first when it is clear (a component library's docs → `sb-design:extract-ui`), otherwise leave `usedBy` empty.

On a run with `saved.count > 0`: show `review` first and ask, for each, whether to drop it, keep it, or replace it with the docs of the project's major.

## 4. Save

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" add --catalog <id,…>
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" add '<json link or list>'
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" remove <url|id> …
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" set <url|id> <field> '<json>'
```

- Kept catalog links → `add --catalog` with their ids (`nuxt:pages,vue:*`: `<package>:*` is every link of a package that fits the project).
- Links you found or the user gave, and catalog pages replaced by another version → `add` with a JSON list: `[{ "url": …, "title": …, "topic": …, "package": …, "version": "7", "summary": "covers …", "source": "user", "usedBy": ["sb-design:extract-ui"], "verifiedAt": "today" }]`. `source` is `user` for the user's links, `proposed` for the ones you found; `verifiedAt` is `"today"` for every page you opened.
- Dropped saved links → `remove`. A summary or a `usedBy` to change → `set` (`set nuxt:pages usedBy '["sb-design:extract-ui"]'`).

These commands write only `.sb-context/docs.json`.

## 5. The CLAUDE.md block

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" render
```

It prints the action and the block. Show both to the user:

- `CLAUDE.md` does not exist → it would be **created** with only the block: show the whole content and ask before creating it;
- no block yet → it would be appended at the end; a block → it would be replaced; the rest of the file is never touched;
- already up to date → say so, nothing to write.

On a yes:

```bash
node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" render --write
```

The block is rewritten from `docs.json` every time: an edit inside the markers is lost, so changes go through this skill. Markers that do not pair up stop the write: show the user where they are and let them fix the file.

## 6. Report

One table: links saved (by package), added, dropped, versions followed (latest or the project's), pages that could not be verified, and the `CLAUDE.md` action. Then say how it is used: the skills read these links (`docs.mjs get --for <plugin:skill>`), and every session sees the block in `CLAUDE.md`. If the project changes stack or major, run this skill again.
