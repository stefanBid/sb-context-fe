# sb-health

Health checks for a project. Part of the [sb-context-fe](../../README.md) marketplace; installs `sb-core` with it.

| Skill | What it does |
| --- | --- |
| `/sb-health:checkup` | The whole routine in order, aggregated: dependencies, SEO, style (through `/sb-design:check` when sb-design is installed), inline text, build, lint, docs (command only) |
| `/sb-health:build` | Type check and production build, errors categorized |
| `/sb-health:lint` | ESLint auto-fix, then what is left |
| `/sb-health:deps` | Outdated and vulnerable dependencies: minor/patch updates, and major versions handled as a migration (changelog, plan, approval, notes for what has to wait) |
| `/sb-health:docs` | Brings `README.md` in line with the code |
| `/sb-health:seo` | robots, sitemap and per-page meta for Search Console |

```
/plugin install sb-health@sb-context-fe
```

Full guide: [README of the marketplace](../../README.md#skill-reference-sb-health).
