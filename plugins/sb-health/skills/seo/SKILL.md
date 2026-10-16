---
name: seo
description: Audit robots.txt, sitemap, and per-page meta tags of a Nuxt project for Google Search Console / SEO readiness. Trigger phrases (English or Italian) — "check SEO", "check GSC readiness", "verifica la SEO".
---

# GSC / SEO readiness check

0. Project settings (`${CLAUDE_SKILL_DIR}/../../core/references/project-settings.md`): `node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" detect --need i18n,seo`. Ask only what is `missing` (is the site multilingual, which locales, the production URL) and save it with `set`. `i18n.enabled` decides whether the hreflang, `x-default` and per-locale sitemap checks apply; `seo.siteUrl` is the reference for robots, sitemap and canonical links.
1. Read `nuxt.config.ts` for the production base URL (`i18n.baseUrl` / `runtimeConfig.public.siteUrl`), `routeRules`, `app.head`, and `i18n.locales` (codes + hreflang `iso`). Read `app/app.config.ts` (if present) for brand defaults (`site.*`, `social.*`) and check how the layout injects them in the head.
2. robots: find it (`server/routes/robots.txt.ts`, `public/robots.txt`, or a module). Production must `Allow: /` and include a `Sitemap:` directive on the production domain (not `localhost`); non-production (deploy previews) must `Disallow: /`.
3. Sitemap: `public/sitemap.xml` or the `@nuxtjs/sitemap` module config. Valid XML, `<loc>` on the production domain, `<xhtml:link>` alternates for every locale with correct `x-default`, hreflang matching `i18n.locales[].iso`, all indexable routes present.
4. Placeholders: flag leftovers (`yoursite.com`, `Your Site Name`, `Your Website`, `example.com`) in `nuxt.config.ts`, `app/app.config.ts`, `.env`, `.env.example`.
5. Scan `app/pages/**/*.vue` for `useHead`/`useSeoMeta`: each page needs `title`, `description`, `ogTitle`, `ogDescription`, `ogImage`, all via i18n (no hardcoded strings, no TODO placeholders). Flag pages with no head call.
5b. Inline meta: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/check-i18n.mjs" app/pages` (from `scripts/check-i18n.mjs`) lists literal titles/descriptions and readable text left inline. For a multilingual site every hit is a **warning** (the page is not translated).
6. Report per check (robots, sitemap, global meta, per-page table) and summarise blockers vs warnings vs OK.

Guides to open when in doubt (SEO and `useSeoMeta`, `routeRules`, `@nuxtjs/sitemap`): `${CLAUDE_SKILL_DIR}/../../core/references/stack-docs.md`. Say what was not verified against them.
