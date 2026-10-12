# Fonts: declaration and loading

The skill does **not** judge font pairing and does not propose alternatives: choosing and pairing faces is Impeccable's `typeset`. It only normalizes how the families are declared and loaded.

## 1. Two family roles

- `--font-display`: headings (`display`, `h1`–`h4`, `hero`).
- `--font-body`: everything else.
- `--font-mono`: only if the project really shows code.

The two can be the same family. Declared in `@theme` of `typography.css`, with `--font-*: initial` first, each with a system fallback stack, and `--default-font-family: var(--font-body)`.

## 2. Loading with `@nuxt/fonts`

- Families are listed explicitly in `fonts.families` of `nuxt.config.ts` (names inside `@theme` are not always detected), each with **only the weights in use** by the roles.
- `@font-face` rules and Google `@import` in the CSS move to `@nuxt/fonts` (T7). Local fonts: `@nuxt/fonts` serves them from `public/`; the report says so.
- The provider (Google, Bunny, Fontshare, Fontsource, local) stays whatever the project already uses.

## 3. Procedure

1. **Detect the families** from `font-family`, `@font-face`, Google `@import` and `fonts.families` (the inventory lists them) and assign each the role it plays (where it appears).
2. **Two or fewer families**: map them to the two roles. One family can serve both.
3. **More than two families in use**: ask which roles they play. If the pairing looks unintentional (e.g. three similar sans), note it in the report and point to `/impeccable typeset`. Do not choose for the user.
4. **If `DESIGN.md` names the families**, it wins; report any conflict with the current CSS.

## 4. Effect on the files

- `typography.css`: `--font-display`, `--font-body` (and `--font-mono` if present). Scale and utilities do not depend on which families these are.
- `nuxt.config.ts`: `fonts.families` with the weights in use.
