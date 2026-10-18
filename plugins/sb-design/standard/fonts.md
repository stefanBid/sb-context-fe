# Fonts: roles and procedure

Part of the **standard**: fixed for every engine and framework. How the families are declared is the engine's file (`../engines/tailwind4/README.md`); how they are loaded is the framework's (`../frameworks/<adapter>.md`: `nuxt.md`, `vue-vite.md`).

The skill does **not** judge font pairing and does not propose alternatives: choosing and pairing faces is Impeccable's `typeset`. It only normalizes how the families are declared and loaded.

## 1. Two family roles

- `--font-display`: headings (`display`, `h1`–`h4`, `hero`).
- `--font-body`: everything else.
- `--font-mono`: only if the project really shows code.

The two can be the same family. Each has a system fallback stack, and the body family is the default of the page.

## 2. Loading

- Families are loaded by the framework's font mechanism, each with **only the weights in use** by the roles.
- `@font-face` rules and Google `@import` in the CSS move to that mechanism (T7). Local fonts stay local; the report says where they are served from.
- The provider (Google, Bunny, Fontshare, Fontsource, local) stays whatever the project already uses.

## 3. Procedure

1. **Detect the families** from `font-family`, `@font-face`, Google `@import` and the framework's font configuration (the inventory lists them) and assign each the role it plays (where it appears).
2. **Two or fewer families**: map them to the two roles. One family can serve both.
3. **More than two families in use**: ask which roles they play. If the pairing looks unintentional (e.g. three similar sans), note it in the report and point to `/impeccable typeset`. Do not choose for the user.
4. **If `design-source.md` names the families**, it wins; report any conflict with the current CSS.

## 4. Effect on the files

- `typography.css`: `--font-display`, `--font-body` (and `--font-mono` if present). Scale and classes do not depend on which families these are.
- The framework's font configuration: the families with the weights in use.
