---
name: build
description: Run the type check and production build of a Nuxt app, a Vue + Vite app or a Vue + Vite library, categorize any errors, and for a library check what the package ships (exports, types, peers left out of the bundle). Trigger phrases (English or Italian) — "check the build", "does the project build?", "does the library build?", "check del build".
---

# Build & type check

Read the project first: `node "${CLAUDE_SKILL_DIR}/../../core/scripts/profile.mjs" get` (format: `${CLAUDE_SKILL_DIR}/../../core/references/profile.md`). `adapter` says the stack (`nuxt`, `vue-vite`), `kind` whether it is an app or a library, `packageManager` which package manager to use (`npm` below stands for it), `features.typecheck` the type checker. The scripts come from `package.json`.

**Language**: this file is in English; talk to the user in their language.

1. **Type check**:
   - **Nuxt**: `npx nuxt typecheck` (needs `vue-tsc` and `typescript` as dev dependencies; never remove them).
   - **Vue + Vite** (app or library): the project's `typecheck` or `type-check` script; otherwise `npx vue-tsc --build` when `tsconfig.json` has `references` (the create-vue layout), else `npx vue-tsc --noEmit`. **Never `tsc` alone** on a Vue project: it does not read `.vue` files, so it reports a clean result it never checked. Without `vue-tsc` installed, say the type check was not run and why.

   Collect every error (file, line, code, description).
2. **Build**: the project's `build` script. Collect every error with its type, file and message. Types per stack:
   - Nuxt: TypeScript / Vite / Nitro / SSR / Module not found / Other.
   - Vue + Vite: TypeScript / Vite / Rollup (bundling, unresolved import) / Module not found / Other; for a library also the declaration plugin (`vite-plugin-dts`, `vue-tsc --declaration`).
3. **A library: what the package ships** (`kind: "library"`), only after a build that succeeded:

   ```bash
   npm pack --dry-run --json --ignore-scripts | node "${CLAUDE_SKILL_DIR}/../../scripts/lib-check.mjs" --pack -
   ```

   The dry run of `npm pack` lists the files the published package would contain without writing anything, and with scripts ignored no `prepack` build runs.
   If it fails (no `version` in `package.json`, a workspace), run the check alone, `node "${CLAUDE_SKILL_DIR}/../../scripts/lib-check.mjs"`: it reads the folder on disk and cannot see what `files` leaves out; say so.

   Exit 0: clean. Exit 10: findings, each with its code:

   | Code | What | Severity |
   | --- | --- | --- |
   | L1 | a path of `exports` / `main` / `module` / `types` / `bin` not in the package, or no `.d.ts` at all | error |
   | L2 | no `files` field: sources, tests and configs are published too | warning |
   | L3 | a subpath of `exports` with no `types` condition and no `.d.ts` next to its JavaScript: consumers get no types | error |
   | L4 | `types` not the first condition | warning |
   | L5 | `vue` in `dependencies` instead of `peerDependencies` | error |
   | L6 | a dependency that has `vue` as a peer (it belongs in `peerDependencies`), or a package that is both | warning |
   | L7 | a peer missing from `devDependencies` (warning), or a dev version outside the peer range (error) | |
   | L8 | a peer range without an upper bound (`*`, `>=3`) | warning |
   | L9 | a peer the source imports but the output does not: it was bundled, it must be in `build.rollupOptions.external` | error |
   | L10 | `"sideEffects": false` while the package ships CSS | warning |

   Exit 3: nothing built yet; build first. A library built by another tool than Vite still gets the check: the rules are about the package, not the bundler.
4. **Categorise**: **TypeScript errors** (may not block the build but hurt type safety), **Build errors** (blocking), **Package errors** of a library (blocking a release: the package would install but not work), **Warnings** (non-blocking, worth reviewing).
5. Report each category concisely. On failure suggest a fix direction without auto-applying it. A peer fix (L5, L6, L7) changes the library's public contract: say that its users install the peer themselves, and that moving a dependency to a peer is a major release of the library.

Guides to open when in doubt (Vite library mode, `vite-plugin-dts`): `node "${CLAUDE_SKILL_DIR}/../../core/scripts/docs.mjs" get --for sb-health:build` (rules: `${CLAUDE_SKILL_DIR}/../../core/references/docs.md`). Say what was not verified against them.
