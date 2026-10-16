# sb-core

The core of the [sb-context-fe](../../README.md) marketplace. The other plugins depend on it and install it for you.

| Skill | What it does |
| --- | --- |
| `/sb-core:setup` | Learns what the project is (the profile: Nuxt or Vue + Vite, app or library), turns on only the plugins it needs, asks the missing project settings in one go, reports what to run next |
| `/sb-core:onboard` | Joins a Nuxt project in progress: setup, then align, migrate, build and next steps through the other plugins (command only) |
| `/sb-core:migration` | Moves a project set up with sb-context-nuxt 0.x to 1.0: `.sb-context-nuxt/` → `.sb-context/`, renamed files, old commands in your docs |

```
/plugin install sb-core@sb-context-fe
```

Full guide: [README of the marketplace](../../README.md#skill-reference-sb-core).
