---
name: seo
description: Audit robots.txt, sitemap, and per-page meta tags of a Nuxt app or a statically generated Vue + Vite app (vite-ssg) for Google Search Console / SEO readiness. Trigger phrases (English or Italian) — "check SEO", "check GSC readiness", "verifica la SEO".
---

# GSC / SEO readiness check

0. Does it apply? `node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" get`: a library (`kind: "library"`) has no pages to index, and a client-side app (`rendering: "csr"`) serves an empty HTML shell, so most checks below do not apply. Say so and stop, offering only the robots and static meta checks for a CSR app if the user wants them. What applies:
   - a **Nuxt app** (`adapter: "nuxt"`, `ssr` or `ssg`): every step below, as written;
   - a **Vue + Vite app generated at build time** (`adapter: "vue-vite"`, `rendering: "ssg"`, with `vite-ssg`): every step, reading the Vue column of the table below. Its meta come from `useHead` / `useSeoMeta` of `@unhead/vue` and are written into the HTML of each route by the generation, so they are checked in the output too (step 6c).

   | Where | Nuxt | Vue + Vite (vite-ssg) |
   | --- | --- | --- |
   | config | `nuxt.config.ts` (`i18n.baseUrl`, `runtimeConfig.public.siteUrl`, `routeRules`, `app.head`, `i18n.locales`) | `vite.config.ts` (`ssgOptions`: included routes, `formatting`), the router (`src/router/index.ts`), the `createI18n` setup |
   | brand defaults | `app/app.config.ts` | the root component's `useHead`, `index.html` `<head>` |
   | robots | `server/routes/robots.txt.ts`, `public/robots.txt`, a module | `public/robots.txt` |
   | sitemap | `public/sitemap.xml`, `@nuxtjs/sitemap` | `public/sitemap.xml`, a sitemap plugin of the build (`vite-ssg-sitemap`) |
   | pages | `app/pages/**/*.vue` | `paths.pages` of the profile (`src/views` or `src/pages`) |
   | built output | `.output/public` after `nuxt generate` | `dist/` after the build |

1. Project settings (`${CLAUDE_SKILL_DIR}/../../core/references/project-settings.md`): `node "${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs" detect --need i18n,seo`. Ask only what is `missing` (is the site multilingual, which locales, the production URL) and save it with `set`. `i18n.enabled` decides whether the hreflang, `x-default` and per-locale sitemap checks apply; `seo.siteUrl` is the reference for robots, sitemap and canonical links.
2. Read the config of the table for the production base URL, the route rules, the global head and the locales (codes + hreflang `iso`). Read the brand defaults (`site.*`, `social.*`) and check how the layout injects them in the head.
3. robots: find it (table). Production must `Allow: /` and include a `Sitemap:` directive on the production domain (not `localhost`); non-production (deploy previews) must `Disallow: /`.
4. Sitemap: the file or the module/plugin config (table). Valid XML, `<loc>` on the production domain, `<xhtml:link>` alternates for every locale with correct `x-default`, hreflang matching the locales' `iso`, all indexable routes present.
5. Placeholders: flag leftovers (`yoursite.com`, `Your Site Name`, `Your Website`, `example.com`) in the config, the brand defaults, `index.html`, `.env`, `.env.example`.
6. Scan the pages (table) for `useHead`/`useSeoMeta`: each page needs `title`, `description`, `ogTitle`, `ogDescription`, `ogImage`, all via i18n (no hardcoded strings, no TODO placeholders). Flag pages with no head call.
6b. Inline meta: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/check-i18n.mjs" <pages folder>` (the folder of the table) lists literal titles/descriptions and readable text left inline. For a multilingual site every hit is a **warning** (the page is not translated).
6c. Vue + Vite (vite-ssg): if a build output exists (`dist/`), open the generated HTML of a few routes and confirm each has its own `<title>`, `<meta name="description">` and `og:` tags in the file itself. Meta present only after JavaScript runs are a **blocker**: crawlers that do not run it see the shell. Without a build, say this was not verified.
7. Report per check (robots, sitemap, global meta, per-page table) and summarise blockers vs warnings vs OK.

Guides to open when in doubt (SEO and `useSeoMeta`, `routeRules`, `@nuxtjs/sitemap`, `@unhead/vue`): `node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" get --for sb-health:seo` prints the project's links (rules: `${CLAUDE_SKILL_DIR}/../../core/references/docs.md`). Say what was not verified against them.
