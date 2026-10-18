---
name: docs
description: Update README.md to match the current codebase of a Nuxt app, a Vue + Vite app or a Vue + Vite library (components, composables, pages, config; for a library its installation, peers and exports). Trigger phrases (English or Italian) — "update the documentation", "update the README", "aggiorna la documentazione".
---

# Update documentation

1. Read the project: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" get` (format: `${CLAUDE_SKILL_DIR}/../../core/references/profile.md`). It says the stack, whether it is an app or a library, and where things are: `paths` (source, components, composables, pages, layouts), `entries` (config, app entry, library entry), `features` (router, i18n).
2. Read in parallel: `README.md`, `package.json`, the framework's config file (`entries.config`: `nuxt.config.*` or `vite.config.*`), `CLAUDE.md`, and the folders of `paths`; for an app the default-locale i18n file too. Never assume a Nuxt layout (`app/`): take the folders from the profile.
3. What the README must cover depends on `kind`:
   - **app**: what it is, how to run it (install, dev, build, preview scripts), the structure (pages or views and their routes, layouts, components, composables), configuration and environment variables, conventions.
   - **library**: installation **with its peers** (`npm install <name> <every peerDependency>`, so users know what to install next to it), usage from what it really exports (the library entry, `entries.lib`, and the subpaths of `exports` in `package.json`: components, composables, types; never a name it does not export), the peer versions it supports (the `peerDependencies` ranges), how it is built (`build` script, output formats of the profile's `library.formats`), and how it is developed and tested.
4. Compare the README against the codebase: outdated sections, missing sections (new components/composables/pages/exports/conventions), wrong versions or commands, broken links. Report the differences briefly, then proceed without waiting for approval.
5. Edit **only the affected sections** of `README.md` (English), keeping its existing structure and tone — do not rewrite it wholesale unless asked. Don't invent information; mark unverifiable details as TBD.
6. Confirm what changed and list any TBD that needs user input.

If `CLAUDE.md` contains a documentation sync rule, follow it for when this must run proactively.
