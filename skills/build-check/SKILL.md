---
name: build-check
description: Run the type check and production build of a Nuxt/Vue project and categorize any errors. Trigger phrases (English or Italian) — "check the build", "does the project build?", "check del build".
---

# Build & type check

Detect the package manager from the lockfile (`package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn) and the available scripts from `package.json`.

1. Type check: `npx nuxt typecheck` for Nuxt projects (needs `vue-tsc` + `typescript` as dev dependencies — never remove them); otherwise the project's `typecheck` script or `npx tsc --noEmit`. Collect every error (file, line, code, description).
2. Build: the project's `build` script. Collect every error (type: TypeScript / Vite / Nitro / Module not found / SSR / Other; file; message).
3. Categorise: **TypeScript errors** (may not block the build but hurt type safety), **Build errors** (blocking), **Build warnings** (non-blocking, worth reviewing).
4. Report each category concisely. On failure suggest a fix direction without auto-applying it.
