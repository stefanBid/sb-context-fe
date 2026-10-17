# Framework: Nuxt

How sb-design works in a **Nuxt 4** app: where the style lives, how it is registered, how color mode and fonts are loaded, how UI is written. Used when the project profile says `adapter: "nuxt"` and `kind: "app"`. The rules themselves are the standard's (`../standard/`); the CSS syntax is the engine's (`../engines/tailwind4/README.md`).

Each skill reads only its section, plus **Requirements** and **Where things are**.

## Requirements

- **Nuxt 4**. With Nuxt 3 the skill stops and says so (P1). No adaptation.
- Tailwind 4 plugged in through `@tailwindcss/vite` in `vite.plugins` of `nuxt.config.ts`.
- `@nuxtjs/color-mode` and `@nuxt/fonts` are required by `/sb-design:align`, which installs them if missing (P3).

## Where things are

- The global style: `<srcDir>/assets/css/` (`app/assets/css/` in Nuxt 4), always, never anywhere else. It is `paths.styles` of the profile.
- `nuxt.config.ts` is the only framework file sb-design changes, and only the keys below.
- Path aliases: `~/` and `@/` point to `srcDir` (`app/`), `~~/` and `@@/` to the project root.

## align

**What it may change in `nuxt.config.ts`**: only the `modules`, `css`, `colorMode`, `fonts` keys and, if missing, `vite.plugins` for `@tailwindcss/vite`. Every other key stays as it is. The reference: `nuxt.config.ts` next to this file.

- **Registering the style**: `css` contains **only** `~/assets/css/main.css` (P9). Old global files are unlinked from `css` and listed in the summary, never deleted.
- **Color mode**: `@nuxtjs/color-mode` with `dataValue: 'theme'` and `classSuffix: ''` writes `data-theme` on `<html>` before the first render, with `preference: 'system'` and `fallback: 'light'` (P4, C11).
- **Fonts**: `@nuxt/fonts`. Families are listed explicitly in `fonts.families` (names inside `@theme` are not always detected), each with **only the weights in use**. Local fonts: `@nuxt/fonts` serves them from `public/`, and the report says so (T7). The provider stays the project's.
- **Installing the modules** during the write phase: `npx nuxi module add color-mode`, `npx nuxi module add fonts`, with the project's package manager (`packageManager` of the profile).
- **Build** for the verification: the project's `build` script (`npm run build`, `pnpm build`, …) or `npx nuxi build`.
- A changed font family is changed in `typography.css` **and** in `fonts.families`.

## extract-ui

**Destinations**:

| The user asks for | Nuxt destination |
| --- | --- |
| a **component** | `app/components/…` |
| a **section** of a screen | a component (or several) in `app/components/…` |
| a **layout** | `app/layouts/<name>.vue` with `<slot />`; header, footer and navigation as components |
| a **page** | `app/pages/<route>.vue`, plus the components and the layout it needs |
| **everything** | one page per screen, one layout, the shared components |

**Naming**: from what exists (`Base*`, `App*`, `Ui*`, or none) and Nuxt's auto-import rule: the name comes from the path (`components/form/Field.vue` → `<FormField>`), PascalCase, multi-word. Pages: the route (`index` for the home, `[id]` for dynamic). Layouts: kebab-case (`default`, `marketing`). Look for existing pieces in `app/components/`, `layouts/`, `pages/`, also under a UI library's prefix (`UButton`).

**Assets**: `public/` for files referenced by URL, `app/assets/` for imported ones.

**Code**:

- `<script setup lang="ts">`; typed props with `defineProps<{…}>()` and defaults, `defineEmits`, `defineModel` for `v-model`.
- **Icons**: `<Icon name="lucide:…" />` from `@nuxt/icon` if the project has it; otherwise inline SVG as in the design and a note that the module is missing (do not install it without asking). **Images**: `<NuxtImg>` / `<NuxtPicture>` if `@nuxt/image` is there, with `alt`, width and height.
- **Text** through `@nuxtjs/i18n`: `$t` / `useI18n`; links with text inside a sentence use `<i18n-t>` interpolation; internal links use the localized helpers (`NuxtLinkLocale` / `useLocalePath`); numbers and dates `$n` / `$d`; plurals with the module's syntax. A language switcher goes in the layout when there is more than one locale. Without the module, and without the user's wish to install it, text goes into one typed content module (`app/content/<name>.ts`).
- **Dark mode**: a logo with a light and a dark variant is switched with the theme, through `@nuxtjs/color-mode`, not with duplicated markup.
- **Layout**: `<slot />` for the page, `NuxtLink` for internal links, landmarks kept from the design.
- **Page**: `definePageMeta({ layout })` when it is not `default`, and `useSeoMeta` (`title`, `description`, `ogTitle`, `ogDescription`) with values from `t()`.
- A component `<style>` that uses `@apply` starts with `@reference "~/assets/css/main.css";`.
- Confirm the route resolves: the file name and `definePageMeta` match the plan.

Guides to open (components and auto-imports, layouts and transitions, pages and routing, SEO and `useSeoMeta`, rendering and `routeRules`, `@nuxt/icon`, `@nuxt/image`, `@nuxtjs/i18n`): the project's links for extract-ui, `docs.mjs get --for sb-design:extract-ui` (`../core/references/docs.md`).

## migrate

- The global style the templates are checked against: the first `css` entry of `nuxt.config.ts` (or `--css`), with the aliases above resolved.
- Templates: the `.vue` files under `srcDir` (`app/pages`, `app/components`, `app/layouts`…).
- A component `<style>` that uses `@apply` starts with `@reference "~/assets/css/main.css";`.

## Issue corrections (framework codes)

| Code | In Nuxt |
| --- | --- |
| P1 | Nuxt < 4: stop |
| P3 | `@nuxtjs/color-mode` or `@nuxt/fonts` not installed or not in `modules`: `npx nuxi module add color-mode` / `npx nuxi module add fonts` |
| P4 | `colorMode` without `dataValue: 'theme'` or `classSuffix: ''`: the configuration of `nuxt.config.ts` next to this file |
| P9 | More than one entry in `css`: only `~/assets/css/main.css` |
| T7 | `@font-face` or a Google `@import`: `@nuxt/fonts` with `families` in `nuxt.config.ts` |
| C11 | Theme on `.dark` or only on `prefers-color-scheme`: `[data-theme="dark"]` written by `@nuxtjs/color-mode` |

## Docs

The maintainers' guides for Tailwind's theme, `@nuxt/fonts`, `@nuxtjs/color-mode` and `nuxt.config.ts`: the project's links for align, `docs.mjs get --for sb-design:align` (`../core/references/docs.md`). Open them when module options or Tailwind 4 behavior are in doubt, and say what was not verified.
