# Project settings

How the user wants **this project** to be built, saved so it is asked once and never again. File: `.sb-context/settings.json` at the project root, with the plugins' other files (`design-source.md`, `dependency-notes.json`…). The folder can be committed, so the settings travel with the project; its own `.gitignore` keeps only `github.json` and `*.prev.md` out. To keep it all local, add `.sb-context/` to the project's `.gitignore`.

Scripts find the **project root** themselves (the folder with `nuxt.config.*`, or a `package.json` that depends on nuxt or vue, searching upward from where they start; outside one they refuse), so the file is always `<root>/.sb-context/settings.json`.

The settings hold **choices**. The facts about the project (framework, kind, paths, styling, libraries) are in the profile, `.sb-context/profile.json`: `profile.md` next to this file. A setting is never asked when the profile already answers it.

Skills that use it today: `/sb-core:setup` and `/sb-core:onboard` through it (ask everything missing in one go), `/sb-design:extract-ui`, `/sb-design:align` (prefix) and `/sb-health:seo` (i18n, site URL). Skills reach it with `${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs` (`detect`, `get`, `set`); `scripts/check-i18n.mjs` checks for inline text.

## How a skill uses it

1. **Detect first.** `node …/project-settings.mjs detect --need <topics>` prints what the project already shows (modules in `nuxt.config`/`package.json`, locales and locale files, component naming, layouts), the settings file, and a `missing` list: the keys the skill needs and nobody has answered yet, each with what was detected.
2. **Ask only what is missing**, and only when it matters for the task at hand. Put the detected value first as the recommended answer ("`@nuxtjs/i18n` is installed with `en` and `it`: confirm?"). Use the question tool, several related questions in one go. Never ask something already in the file.
3. **Save the answer**: `node …/project-settings.mjs set i18n.defaultLocale '"it"'`. The section is stamped with `source` (`user`, or `detected` when the user only confirmed) and the date.
4. **Change a setting only when the user asks** ("add German", "stop using the Base prefix"). Update the file; never re-ask on your own and never overwrite an answer silently.
5. If the project contradicts the file (the user removed the module, the locale folder moved), say so and ask which one is right; do not silently follow either.

Questions are about the **project**, not about taste: the design decides how things look, this file decides how the project is organized.

## Keys

| Key | Meaning | Detected from |
| --- | --- | --- |
| `i18n.enabled` | all user-visible text goes through i18n (default stance of the plugin: always) | `@nuxtjs/i18n` in modules/deps |
| `i18n.defaultLocale` | language of the design's text and of the default locale file | `defaultLocale` in `nuxt.config` |
| `i18n.locales` | supported locales (`["it","en"]`) | `locales` in `nuxt.config`, locale files |
| `i18n.otherLocales` | for locales other than the default: `"translate"` (the skill writes a translation, marked to review) or `"fallback"` (empty, falls back to the default) | not detectable: ask |
| `i18n.messagesDir` | where the locale files live | `i18n/locales`, `locales`, `langDir` |
| `i18n.keyStyle` | how message keys are organized, e.g. `"area.name.element"` (`pages.home.hero.title`, `components.button.loading`) | existing locale files |
| `i18n.untranslated` | words that stay as they are (brand names, proper nouns), also passed to `check-i18n.mjs --allow` | not detectable: ask when the design has them |
| `icons.module` | `"@nuxt/icon"` or `null` (inline SVG) | modules |
| `images.module` | `"@nuxt/image"` or `null` | modules |
| `style.prefix` | prefix of the global style tokens and utilities (`--{p}-bg`, `{p}-h1`): asked once by `/sb-design:align`, then reused | `--<p>-bg` in `theme.css` |
| `seo.siteUrl` | production URL for robots, sitemap, canonical | `siteUrl`/`baseUrl` in `nuxt.config` |
| `stack.packageManager` | only when there is no lockfile | lockfile |
| `naming.componentPrefix` | prefix of shared/base components: `"Base"`, `"App"`, `"Ui"`, `"none"` | most common prefix in `components/` |

Keys are added as skills need them: a missing key means "unknown", not "no".

## The i18n stance

The plugin **never leaves user-visible text inline**. Text belongs in locale files, read through `$t` / `useI18n`; templates, `alt`, `aria-label`, `placeholder`, `title` and SEO meta included. What the project has decides how:

- `@nuxtjs/i18n` installed → use it, with the saved locales and key style.
- Not installed → ask to set it up (default locale, other locales, messages folder). Installing a module and creating `i18n/locales/*.json` are writes: show the exact command and files and wait for the go-ahead. If the user declines, save `i18n.enabled: false`; text then still stays **out of the templates**, in one typed content module (`app/content/<name>.ts`) read by the component, so it can be moved into i18n later without touching markup.
- Example data in a design (names, dates in a preview) is not copy: it becomes props, slots or sample data, not message keys.
- Checked by `scripts/check-i18n.mjs`.
