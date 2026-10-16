# Project profile

What the project **is**: framework, kind, rendering, where its files are, how it is styled, which libraries it uses. Detected from the project's files, confirmed by the user once, and read by every skill and script instead of assuming a Nuxt layout. File: `.sb-context/profile.json` at the project root, with the plugins' other files.

Profile and settings are different files on purpose: the **profile** holds facts about the project (`profile.json`), the **settings** hold how the user wants it built (`settings.json`, see `project-settings.md`). A fact can be re-detected at any time; a choice is asked once.

Skills reach it with `${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs` (`detect`, `get`, `set`, `write`); scripts read it through `core/lib/profile.mjs` (`loadProfile`, `srcDirOf`, `cssDirOf`).

## How it works

1. **Always re-detected.** Every read detects the profile again from the files: a moved folder or a new dependency shows up without anyone updating the file.
2. **Confirmed values win.** `profile.mjs set <key> '<json>'` saves a value the user confirmed or corrected and lists its key in `confirmed`. A new detection never overwrites a confirmed key.
3. **Drift is asked, not followed.** When the files contradict a confirmed value, `detect` lists it in `drift` with `confirmed: true`: ask the user which one is right. Drift on a key nobody confirmed only means the saved file is stale; `write` refreshes it.
4. **`null` means unknown or absent**, never "no". `detect` lists in `unknown` the keys that matter and that the files cannot settle.
5. **The type of project is always confirmed** by `/sb-core:setup` the first time, even when detected, because it decides which plugins and skills apply.

## Keys

| Key | Meaning | Values today |
| --- | --- | --- |
| `schema` | format version of the file | `1` |
| `detectedAt` | date of the detection | `2026-10-17` |
| `confirmed` | dotted keys the user confirmed or corrected | `["kind"]` |
| `adapter` | which adapter of a plugin applies (from framework + bundler; not settable) | `nuxt`, `vue-vite`, `null` |
| `framework` | `{ name, major }` | `nuxt`, `vue` |
| `bundler` | `{ name, major }` | `vite`, `webpack`, `null` |
| `kind` | what the project ships | `app`, `library` |
| `rendering` | how an app's pages are produced; `null` for a library | `ssr`, `ssg`, `csr` |
| `language` | `ts` or `js` | |
| `packageManager` | from the lockfile, else `packageManager` of `package.json` | `pnpm`, `npm`, `yarn`, `bun` |
| `templates` | the template language, for the scripts that read markup | `vue-sfc` |
| `paths.src` | the source folder | `app`, `src`, `.` |
| `paths.styles` | the folder of the global style | `app/assets/css`, `src/assets/css` |
| `paths.components`, `paths.composables` | | |
| `paths.pages`, `paths.layouts` | `null` when the project has none (a library) | |
| `paths.public` | static files served as they are | `public` |
| `entries.config` | the framework's config file | `nuxt.config.ts`, `vite.config.ts` |
| `entries.app` | the app entry | `app/app.vue`, `src/main.ts` |
| `entries.lib` | the library entry | `src/index.ts` |
| `entries.css` | where the global stylesheet is registered | `nuxt.config.ts` (`css: []`), `src/main.ts` (`import`) |
| `styling.engine` | `{ name, via }` | `tailwind4` (via `@tailwindcss/vite` or `@tailwindcss/postcss`), `tailwind3`, `scss`, `null` |
| `styling.colorMode` | how light and dark are switched | `@nuxtjs/color-mode`, `@vueuse/core` |
| `styling.fonts` | how fonts are loaded | `@nuxt/fonts`, `@fontsource` |
| `features.router` | | `nuxt`, `vue-router`, `unplugin-vue-router` |
| `features.autoImport` | components and composables imported automatically | `true` (Nuxt), `false` |
| `features.i18n`, `.icons`, `.images`, `.state`, `.test`, `.lint`, `.typecheck` | the library used for each, or `null` | `@nuxtjs/i18n`, `vue-i18n`, `@nuxt/icon`, `unplugin-icons`, `pinia`, `vitest`, `@nuxt/eslint`, `vue-tsc`… |
| `library` | for a library: `{ name, formats, types, peers }`; `null` for an app | |

## Who reads what

| Reader | Uses |
| --- | --- |
| every script | the project root (a folder a detector recognizes), `paths.src`, `paths.styles` |
| `/sb-core:setup` | the whole profile: it confirms the type, recommends plugins and skills for it |
| `sb-design` scripts | `adapter` and `kind`: they refuse a stack without an adapter (today only `nuxt`) and libraries |

## Adding a stack

A framework is recognized by a detector in `core/lib/frameworks/<name>.mjs` (`isRoot`, `srcDirOf`, `detect`), listed in `FRAMEWORKS` of `core/lib/profile.mjs`. A plugin that needs to know the stack (sb-design) adds its own adapter for it. A stack with another template language (Angular, JSX, Svelte) also needs a parser for its templates in the scripts that read markup; `templates` tells them which one.
