---
name: docs
description: Update README.md to match the current codebase (components, composables, pages, config). Trigger phrases (English or Italian) — "update the documentation", "update the README", "aggiorna la documentazione".
---

# Update documentation

1. Read in parallel: `README.md`, `package.json`, `nuxt.config.ts`, `CLAUDE.md`, the `app/` directory (components, composables, pages, layouts), and the default-locale i18n file.
2. Compare the README against the codebase: outdated sections, missing sections (new components/composables/pages/conventions), wrong versions or commands, broken links. Report the differences briefly, then proceed without waiting for approval.
3. Edit **only the affected sections** of `README.md` (English), keeping its existing structure and tone — do not rewrite it wholesale unless asked. Don't invent information; mark unverifiable details as TBD.
4. Confirm what changed and list any TBD that needs user input.

If `CLAUDE.md` contains a documentation sync rule, follow it for when this must run proactively.
