---
name: full-checkup
description: Run the full project health routine — dependencies, SEO, build, lint, docs — and aggregate the results. Trigger phrases (English or Italian) — "full checkup", "run a full checkup", "checkup completo".
disable-model-invocation: true
---

# Full project checkup

Orchestrates the skills below in order and aggregates results — it doesn't duplicate their logic:

1. `/sb-context-nuxt:dependency-check`
2. `/sb-context-nuxt:seo-check`
3. `/sb-context-nuxt:build-check`
4. `/sb-context-nuxt:lint-check`
5. If there are blocking errors (build errors, or lint errors that can't be auto-fixed): **stop**, report each blocker (file, rule/error, description) and ask the user to fix them before re-running.
6. If no blockers: decide whether `README.md` needs updating (new/updated dependency, new component/page/composable/util, config change) and run `/sb-context-nuxt:docs-update` if so.
7. Final summary: dependencies, SEO, build, lint, docs status, overall result.
