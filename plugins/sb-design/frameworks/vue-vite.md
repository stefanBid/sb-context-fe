# Framework: Vue + Vite

How sb-design works in a **Vue 3 + Vite** app (a single-page app with an `index.html`, not a library): where the style lives, how it is registered, how color mode and fonts are loaded, how UI is written. Used when the project profile says `adapter: "vue-vite"` and `kind: "app"`. The rules themselves are the standard's (`../standard/`); the CSS syntax is the engine's (`../engines/tailwind4/README.md`).

Each skill reads only its section, plus **Requirements** and **Where things are**.

## Requirements

- **Vue 3**. With Vue 2 the skill stops and says so (P1). No adaptation.
- **Vite 5.2 or later**, the range `@tailwindcss/vite` supports; an older Vite stops the skill too (P1).
- Tailwind 4 plugged in through `@tailwindcss/vite` in `plugins` of `vite.config.ts`.
- `@vueuse/core` (color mode) and the `@fontsource/*` packages of the families in use are required by `/sb-design:align`, which installs them if missing (P3).

## Where things are

- The global style: `src/assets/css/`, always, never anywhere else. It is `paths.styles` of the profile.
- The style is registered by an `import` in the app entry, `src/main.ts` (`entries.css` of the profile).
- The framework files sb-design changes, and only in the parts below: `src/main.ts`, `vite.config.ts`, `index.html`, and the theme composable `src/composables/useTheme.ts`.
- Path aliases: `@/` points to `src/` (the `resolve.alias` of `vite.config.ts`); `./` and `../` are relative to the importing file; `/…` is relative to the project root.

## align

**What it may change**: in `src/main.ts` only the style and font imports; in `vite.config.ts` only `plugins` (for `@tailwindcss/vite`) and the `@` alias if missing; in `index.html` only the inline theme script in `<head>`; plus the theme composable. Every other line stays as it is. The references: `vue-vite.main.ts`, `vue-vite.vite.config.ts`, `vue-vite.index.html` and `vue-vite.use-theme.ts` next to this file.

- **Registering the style**: `src/main.ts` imports **only** `./assets/css/main.css` among the project's own style files (P9). CSS of packages (Fontsource, a component library's stylesheet) is not the project's global style and stays. Old global files are unlinked (their `import` removed) and listed in the summary, never deleted.
- **Color mode**: `useColorMode` of `@vueuse/core` with `attribute: 'data-theme'` writes `data-theme` on `<html>`, wrapped in `src/composables/useTheme.ts` and called once in `App.vue`; `initialValue: 'auto'` follows the system until the user chooses (P4, C11). An app renders on the client, so the theme is applied only after the JavaScript runs: an **inline script in `index.html`** sets `data-theme` before the first paint, reading the **same `storageKey`** and the same values (`auto`, `light`, `dark`) as the composable (P4). A project with a strict Content-Security-Policy allows that script by its hash; say so in the summary when the project sets a CSP.
- **Fonts**: Fontsource. One `@fontsource/<family>` package per family, and in `src/main.ts` one import per weight in use (`import '@fontsource/inter/400.css'`), **only the weights in use**. Use the static packages, not `@fontsource-variable/*`, unless the project already does: the variable packages rename the family (`Inter Variable`), and the stack in `typography.css` must use that name. A family Fontsource does not have (a commercial or custom font) stays in local files with `@font-face` in `typography.css`, files in `src/assets/fonts/`, and the report says so (T7).
- **Installing the packages** during the write phase: `@vueuse/core` and the `@fontsource/<family>` packages as dependencies, `@tailwindcss/vite` as a dev dependency, with the project's package manager (`packageManager` of the profile).
- **Build** for the verification: the project's `build` script (`npm run build`, `pnpm build`, …) or `npx vite build`.
- A changed font family is changed in `typography.css` **and** in the `@fontsource` imports of `src/main.ts` (and its package installed, the old one removed only if nothing else imports it).

## extract-ui

**Destinations**:

| The user asks for | Vue + Vite destination |
| --- | --- |
| a **component** | `src/components/…` |
| a **section** of a screen | a component (or several) in `src/components/…` |
| a **layout** | `src/layouts/<Name>Layout.vue`, a component with `<RouterView />` (or `<slot />` when the router wraps pages in it); header, footer and navigation as components |
| a **page** | `src/views/<Name>View.vue` (or `src/pages/` if the project uses it), plus its route in the router (`src/router/index.ts`) with a lazy `import()`, and the components and layout it needs |
| **everything** | one view and one route per screen, one layout, the shared components |

**Naming**: from what exists (`Base*`, `App*`, `Ui*`, or none), PascalCase, multi-word, the file name equal to the component name. Views end in `View` and layouts in `Layout` when the project already does so. Routes: kebab-case paths, named routes when the project names them. Look for existing pieces in `src/components/`, `src/layouts/`, `src/views/`, also under a UI library's prefix.

**Imports**: components are imported explicitly in `<script setup>`, unless the project uses `unplugin-vue-components` (the profile's `features.autoImport`): then follow it and do not add imports it would generate.

**Assets**: `public/` for files referenced by URL, `src/assets/` for imported ones (`import logo from '@/assets/logo.svg'`).

**Code**:

- `<script setup lang="ts">`; typed props with `defineProps<{…}>()` and defaults, `defineEmits`, `defineModel` for `v-model`.
- **Icons**: `unplugin-icons` (`import IconMenu from '~icons/lucide/menu'`) or `@iconify/vue` (`<Icon icon="lucide:menu" />`), whichever the project has (`features.icons`); otherwise inline SVG as in the design and a note that no icon package is installed (do not install one without asking). **Images**: a plain `<img>` with `alt`, `width`, `height` and `loading="lazy"` below the fold.
- **Text** through `vue-i18n`: `useI18n()` and `t()` in `<script setup>`, `$t` in templates; links with text inside a sentence use the `<i18n-t>` component; numbers and dates `n()` / `d()`; plurals with its syntax. A language switcher goes in the layout when there is more than one locale. Without `vue-i18n`, and without the user's wish to install it, text goes into one typed content module (`src/content/<name>.ts`).
- **Dark mode**: a logo with a light and a dark variant is switched with the theme, through `useTheme` (the color mode above), not with duplicated markup.
- **Layout**: `<RouterView />` (or `<slot />`) for the page, `RouterLink` for internal links, landmarks kept from the design.
- **Page**: its route in the router, with the layout as the route's parent component when it is not the default one; meta with `useHead` / `useSeoMeta` of `@unhead/vue` when the project has it (`title`, `description`, `ogTitle`, `ogDescription`, with values from `t()`). A client-rendered app only sets them after the JavaScript runs: say so, crawlers that do not run JavaScript will not see them.
- A component `<style>` that uses `@apply` starts with `@reference "@/assets/css/main.css";`.
- Confirm the route resolves: the view file, the route entry and its name match the plan.

Guides to open (Vue components and `<script setup>`, Vue Router, `vue-i18n`, `@unhead/vue`, the icon package): the project's links for extract-ui, `docs.mjs get --for sb-design:extract-ui` (`../core/references/docs.md`).

## migrate

- The global style the templates are checked against: the style imported by `src/main.ts` (or `--css`), with the aliases above resolved.
- Templates: the `.vue` files under `src/` (`src/views`, `src/components`, `src/layouts`…).
- A component `<style>` that uses `@apply` starts with `@reference "@/assets/css/main.css";`.

## Issue corrections (framework codes)

| Code | In Vue + Vite |
| --- | --- |
| P1 | Vue < 3, or Vite older than 5.2: stop |
| P3 | `@vueuse/core` or the `@fontsource/<family>` packages not installed, or not imported: install them, the composable and the imports as in the files next to this file |
| P4 | `useColorMode` without `attribute: 'data-theme'`, no inline script in `index.html`, or the two on different keys: `vue-vite.use-theme.ts` and `vue-vite.index.html` next to this file |
| P9 | `src/main.ts` imports more than one of the project's own style files: only `./assets/css/main.css` |
| T7 | `@font-face` for a family Fontsource has, a Google `@import`, or a Google Fonts `<link>` in `index.html`: the `@fontsource/<family>` imports in `src/main.ts` with the weights in use |
| C11 | Theme on `.dark` or only on `prefers-color-scheme`: `[data-theme="dark"]` written by `useColorMode` and the inline script |

## Docs

The maintainers' guides for Tailwind's theme and its Vite plugin, `vite.config.ts`, VueUse `useColorMode` and Fontsource: the project's links for align, `docs.mjs get --for sb-design:align` (`../core/references/docs.md`). Open them when an option or Tailwind 4 behavior is in doubt, and say what was not verified.
