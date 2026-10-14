---
name: full-checkup
description: Run the full project health routine — dependencies, SEO, design sync, i18n, build, lint, docs — and aggregate the results. Trigger phrases (English or Italian) — "full checkup", "run a full checkup", "checkup completo".
disable-model-invocation: true
---

# Full project checkup

Orchestrates the skills below in order and aggregates results — it doesn't duplicate their logic:

1. `/sb-context-nuxt:dependency-check`: show the grouped list of available updates (Major / Minor / Patch, current → new), update minor/patch without asking, and do not start major migrations (list them as available; the user runs `/sb-context-nuxt:dependency-check` for those), and report the open dependency notes with what each one waits for
2. `/sb-context-nuxt:seo-check`
3. **Design sync** (only if `.sb-context-nuxt/design-source.md` exists): `node "${CLAUDE_SKILL_DIR}/../style-align/scripts/sync-values.mjs" --check`. Exit 0: the global style matches the design snapshot. Exit 10: **drift**, report the differences and propose `/sb-context-nuxt:style-align` (sync flow). Exit 4: the role mapping is not confirmed yet, report it. This only compares with the snapshot on disk; to see whether the design changed on Claude, `/sb-context-nuxt:design-extract-style` re-reads it.
4. **Inline text**: `node "${CLAUDE_SKILL_DIR}/../../scripts/check-i18n.mjs" <srcDir>/pages <srcDir>/components <srcDir>/layouts` (needs `@nuxtjs/i18n`; if `project-settings.json` says `i18n.enabled: false`, skip). Text still inline or a missing key in the default locale counts as a **warning**, listed with file and line.
5. `/sb-context-nuxt:build-check`
6. `/sb-context-nuxt:lint-check`
7. If there are blocking errors (build errors, or lint errors that can't be auto-fixed): **stop**, report each blocker (file, rule/error, description) and ask the user to fix them before re-running.
8. If no blockers: decide whether `README.md` needs updating (new/updated dependency, new component/page/composable/util, config change) and run `/sb-context-nuxt:docs-update` if so.
9. Final summary: dependencies, SEO, design sync, inline text, build, lint, docs status, overall result.
