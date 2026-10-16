# Stack docs: source of truth

Shared by the skills of every plugin. Skills reach their plugin's copy with `${CLAUDE_SKILL_DIR}/../../core/references/stack-docs.md`.

These links are the source of truth for how each framework/library is meant to be used, as written by its maintainers. Consult these guides before working on related tasks, and open them (WebFetch) whenever your own knowledge may be insufficient or out of date (Nuxt 4, Tailwind v4, module options, anything that changed across versions). Skip them only for plain markup and utilities you're certain about, and say when something was not verified against the docs.

- [Adding pages, dynamic routes, or middleware](https://nuxt.com/docs/4.x/directory-structure/app/pages) · [Routing](https://nuxt.com/docs/4.x/getting-started/routing)
- [Working with components and auto-imports](https://nuxt.com/docs/4.x/directory-structure/app/components)
- [Writing composables, utils or plugins](https://nuxt.com/docs/4.x/directory-structure/app/composables) · [Utils](https://nuxt.com/docs/4.x/directory-structure/app/utils) · [Plugins](https://nuxt.com/docs/4.x/directory-structure/app/plugins)
- [Layouts](https://nuxt.com/docs/4.x/directory-structure/app/layouts) · [Page and layout transitions](https://nuxt.com/docs/4.x/getting-started/transitions)
- [SEO, meta tags and `useSeoMeta`](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [Rendering modes, prerender and `routeRules`](https://nuxt.com/docs/4.x/guide/concepts/rendering)
- [Shared state with `useState`](https://nuxt.com/docs/4.x/getting-started/state-management)
- [Images, fonts and static assets](https://nuxt.com/docs/4.x/getting-started/assets) · [`app/assets`](https://nuxt.com/docs/4.x/directory-structure/app/assets) · [`public/`](https://nuxt.com/docs/4.x/directory-structure/public)
- [Server routes (Nitro)](https://nuxt.com/docs/4.x/directory-structure/server)
- [Changing `nuxt.config.ts`](https://nuxt.com/docs/4.x/directory-structure/nuxt-config) · [Deploying to Netlify](https://nuxt.com/deploy/netlify)
- [Adding styles, tokens or utilities with Tailwind v4](https://tailwindcss.com/docs/theme) · [Tailwind docs](https://tailwindcss.com/docs)
- [Supporting languages and `$t`/`useI18n`](https://i18n.nuxtjs.org/docs/getting-started)
- Nuxt reference: [Directory structure](https://nuxt.com/docs/4.x/directory-structure) · [Guide](https://nuxt.com/docs/4.x/guide) · [API](https://nuxt.com/docs/4.x/api)
- Modules: [@nuxt/eslint](https://nuxt.com/modules/eslint) · [@nuxt/icon](https://nuxt.com/modules/icon) · [@nuxt/image](https://nuxt.com/modules/image) · [@vueuse/nuxt](https://nuxt.com/modules/vueuse) · [@nuxtjs/i18n](https://nuxt.com/modules/i18n) · [@nuxt/fonts](https://nuxt.com/modules/fonts) · [@nuxtjs/color-mode](https://nuxt.com/modules/color-mode) · [@nuxtjs/sitemap](https://nuxt.com/modules/sitemap)

## Which links for which skill

| Skill | Open first |
| --- | --- |
| `/sb-design:extract-ui` | components and auto-imports, layouts, pages and routing, SEO and `useSeoMeta`, Tailwind theme, `@nuxt/icon`, `@nuxt/image`, `@nuxtjs/i18n` (if the project has it) |
| `/sb-design:align` | Tailwind theme, `@nuxt/fonts`, `@nuxtjs/color-mode`, `nuxt.config.ts` |
| `/sb-health:seo` | SEO and `useSeoMeta`, rendering and `routeRules`, `@nuxtjs/sitemap` |
