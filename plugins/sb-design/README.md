# sb-design

The global style of an app (Nuxt 4 + Tailwind 4 today). It normalizes the style into a fixed four-file structure, keeping the project's own values or taking them from a design made in Claude; it never chooses values itself. Part of the [sb-context-fe](../../README.md) marketplace; installs `sb-core` with it. Not meant for libraries.

| Skill | What it does |
| --- | --- |
| `/sb-design:align` | Normalizes the global style into `main.css`, `theme.css`, `typography.css`, `animation.css`; renames the token prefix; syncs the values with the design snapshot |
| `/sb-design:migrate` | Migrates the templates after the global style changed (command only) |
| `/sb-design:extract-style` | Saves the values of a Claude design into `.sb-context/design-source.md` |
| `/sb-design:extract-ui` | Builds a component, section, layout, page or whole design from Claude as code with the project's style |
| `/sb-design:check` | Read-only: is the style aligned, and still in sync with the design snapshot? |

```
/plugin install sb-design@sb-context-fe --scope local
```

Full guide: [README of the marketplace](../../README.md#skill-reference-sb-design).
