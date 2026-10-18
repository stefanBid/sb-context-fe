# sb-health

Health checks for a project: a Nuxt app, a Vue + Vite app or a Vue + Vite library. Part of the [sb-context-fe](../../README.md) marketplace; installs `sb-core` with it.

| Skill | What it does |
| --- | --- |
| `/sb-health:checkup` | The whole routine in order, aggregated: dependencies, SEO, style (through `/sb-design:check` when sb-design is installed), inline text, build, lint, docs (command only) |
| `/sb-health:build` | Type check (`nuxt typecheck` or `vue-tsc`) and production build, errors categorized; for a library, what the package ships (exports, types, peers left out of the bundle) |
| `/sb-health:lint` | ESLint auto-fix, then what is left |
| `/sb-health:deps` | Outdated and vulnerable dependencies: minor/patch updates, and major versions handled as a migration (changelog, plan, approval, notes for what has to wait); a library's peer ranges decided with you |
| `/sb-health:docs` | Brings `README.md` in line with the code (for a library: install with its peers, real exports) |
| `/sb-health:seo` | robots, sitemap and per-page meta for Search Console (Nuxt apps, Vue apps generated with vite-ssg) |

```
/plugin install sb-health@sb-context-fe
```

Full guide: [README of the marketplace](../../README.md#skill-reference-sb-health).
