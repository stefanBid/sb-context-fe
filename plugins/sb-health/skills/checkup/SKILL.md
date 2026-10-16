---
name: checkup
description: Run the full project health routine — dependencies, SEO, design sync, i18n, build, lint, docs — and aggregate the results. Trigger phrases (English or Italian) — "full checkup", "run a full checkup", "checkup completo".
disable-model-invocation: true
---

# Full project checkup

Orchestrates the skills below in order and aggregates results — it doesn't duplicate their logic:

1. `/sb-health:deps`: show the grouped list of available updates (Major / Minor / Patch, current → new), update minor/patch without asking, and do not start major migrations (list them as available; the user runs `/sb-health:deps` for those), and report the open dependency notes with what each one waits for
2. `/sb-health:seo`
3. **Global style and design sync**: `/sb-design:check` (read-only), only if it is among the available skills. It reports whether the style is aligned and whether it still matches the design snapshot (drift → propose the sync flow of `/sb-design:align`). If the sb-design plugin is not installed, say this step was skipped; do not look for its scripts.
4. **Inline text**: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/check-i18n.mjs" <srcDir>/pages <srcDir>/components <srcDir>/layouts` (needs `@nuxtjs/i18n`; if `settings.json` says `i18n.enabled: false`, skip). Text still inline or a missing key in the default locale counts as a **warning**, listed with file and line.
5. `/sb-health:build`
6. `/sb-health:lint`
7. If there are blocking errors (build errors, or lint errors that can't be auto-fixed): **stop**, report each blocker (file, rule/error, description) and ask the user to fix them before re-running.
8. If no blockers: decide whether `README.md` needs updating (new/updated dependency, new component/page/composable/util, config change) and run `/sb-health:docs` if so.
9. Final summary: dependencies, SEO, design sync, inline text, build, lint, docs status, overall result.
