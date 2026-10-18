---
name: checkup
description: Run the full project health routine — dependencies, SEO, design sync, i18n, build (with the package check of a library), lint, docs — and aggregate the results, for a Nuxt app, a Vue + Vite app or a Vue + Vite library. Trigger phrases (English or Italian) — "full checkup", "run a full checkup", "checkup completo".
disable-model-invocation: true
---

# Full project checkup

Orchestrates the skills below in order and aggregates results — it doesn't duplicate their logic.

First read the project: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" get` (`kind`, `rendering`, `paths`, `features.i18n`). A step that does not apply to this kind of project is listed in the summary as **skipped**, with the reason, not silently left out.

1. `/sb-health:deps`: show the grouped list of available updates (Major / Minor / Patch, current → new), update minor/patch without asking, and do not start major migrations (list them as available; the user runs `/sb-health:deps` for those), and report the open dependency notes with what each one waits for. For a library, a peer with a new major is listed with the peer-range decision it needs, never changed here.
2. `/sb-health:seo`: it decides itself whether it applies (it does not for a library or a client-rendered app).
3. **Global style and design sync** (apps only): `/sb-design:check` (read-only), only if it is among the available skills. It reports whether the style is aligned and whether it still matches the design snapshot (drift → propose the sync flow of `/sb-design:align`). If the sb-design plugin is not installed, say this step was skipped; do not look for its scripts. A library: skipped (sb-design does not apply).
4. **Inline text** (an app with i18n: `features.i18n` is `@nuxtjs/i18n` or `vue-i18n`; if `settings.json` says `i18n.enabled: false`, skip): `node "${CLAUDE_SKILL_DIR}/../../core/scripts/check-i18n.mjs" <folders>` with the folders of the profile that exist: `paths.pages` (`pages/` or `views/`), `paths.components`, `paths.layouts`. Text still inline or a missing key in the default locale counts as a **warning**, listed with file and line.
5. `/sb-health:build`: for a library it also checks what the package ships (exports, types, peers left out of the bundle); its package errors count as blocking.
6. `/sb-health:lint`
7. If there are blocking errors (build errors, package errors of a library, or lint errors that can't be auto-fixed): **stop**, report each blocker (file, rule/error, description) and ask the user to fix them before re-running.
8. If no blockers: decide whether `README.md` needs updating (new/updated dependency, new component/page/composable/util or export, config change) and run `/sb-health:docs` if so.
9. Final summary: dependencies, SEO, design sync, inline text, build (and package), lint, docs status, the steps skipped and why, overall result.
