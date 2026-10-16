# `design-source.md` format

Written by `scripts/tokens-to-source.mjs` to **`.sb-context/design-source.md`** in the project. It is the plugin's own snapshot of a Claude design: the bridge between the artifact (source of truth) and the project. Read by `/sb-design:align` (values) and `/sb-design:extract-ui` (component index).

It is **not** a `DESIGN.md`. That name belongs to Impeccable; this plugin never reads it as a source and never writes it. It lives in `.sb-context/` with the plugins' other files; the folder can be committed, and `design-source.prev.md` stays out of git through the folder's own `.gitignore`.

The file is free-form markdown, designed to lose nothing and to be read by an agent: tables for the human view, one complete JSON block for exactness.

## Layout

| Section | Content |
| --- | --- |
| `# Design source — <name>` + note | what the file is, how to read it |
| `## Provenance` | design system link, artifact version, the Design the user pointed to (if any), extraction date, `tokens.json` sha256, suggested prefix, themes |
| `## Colors` | every role: light, dark, whether the name is in the plugin's fixed set, usage |
| `## Typography` | families, weights, every style: family role, size / line, weight, tracking, mobile values, usage |
| `## Spacing`, `## Radii`, `## Shadows`, `## Breakpoints`, `## Motion` | the design's values; breakpoints show design vs plugin-fixed; radii mark `full`/`none` as static utilities; no motion → defaults provisional |
| `## Brand guide` | the design's README, verbatim except for the eyebrow wording; its headings are moved two levels down (its `#` becomes `###`), so they never look like this file's own sections |
| `## Components` | index table (name, group, summary, classes in the preview) and, per component (`### <Name>`), its README verbatim with its headings two levels down (`##` becomes `####`) |
| `## Overrides applied during extraction` | everything the plugin changed against the design (eyebrows removed, breakpoints fixed) |
| `## Gaps to resolve in /sb-design:align` | what the design does not give: derived later, provisional |
| `## Machine data` | the same information, complete and normalized, in a fenced block ` ```json design-source ` |

## Machine data

Schema `design-source/1`. **When a table and this block disagree, the block wins.**

```json
{
  "schema": "design-source/1",
  "name": "PraticaSicura",
  "suggestedPrefix": "ps",
  "source": { "kind": "design-system", "designSystem": "<artifact link>", "version": "<artifact version>", "pointedFrom": null, "extractedAt": "2026-10-13", "tokensSha256": "…" },
  "themes": ["light", "dark"],
  "colors": { "primary": { "light": "#14505F", "dark": "#6BBCCB", "usage": "…", "inFixedSet": true } },
  "fonts": { "display": "\"Face\", fallbacks", "body": "…", "mono": null, "files": [] },
  "weights": [400, 600, 700],
  "type": { "h1": { "group": "Titoli", "familyRole": "display", "family": "…", "size": "40px", "lineHeight": "46px", "weight": 700, "letterSpacing": "-0.015em", "mobile": { "size": "30px", "lineHeight": "36px" }, "sample": "…", "usage": "…", "inFixedSet": true } },
  "spacing": { "space-4": { "value": "16px", "usage": "…" } },
  "radius": { "md": { "value": "10px", "usage": "…", "static": false } },
  "shadows": { "sm": { "values": { "light": "…", "dark": "…" }, "usage": "…" } },
  "breakpoints": { "design": { "sm": { "value": "640px", "usage": "…" } }, "fixed": { "sm": "640px", "md": "768px", "lg": "1024px", "xl": "1280px" } },
  "motion": null,
  "roleMap": { "status": "identity | needs-confirmation", "colors": { "surface": { "role": "surface", "suggested": null, "suspicious": "bg" } }, "type": { "heading": { "role": null, "suggested": "h2" } } },
  "extra": { "size": { "tokens": [] } },
  "components": [ { "name": "Button", "group": "Azioni", "subtitle": "…", "summary": "…", "files": { "readme": "project/components/Button/README.md", "preview": "project/components/Button/preview.html" }, "classes": ["ps-btn", "ps-btn--primary"] } ],
  "overrides": [],
  "gaps": []
}
```

- Color aliases (`{primary}`) are resolved to the literal; the alias stays in an `alias` key.
- `inFixedSet` says whether a color or type name is one of the plugin's roles; the others are "to agree on" in `/sb-design:align`.
- `mobile` exists only when the design gives it (the Design System type puts it in the `usage` prose; the script extracts it).
- `components[].files` are paths **inside the artifact**: the markup is read from there, not copied here. The README texts are only in the `## Components` section.
- `motion: null` means the design has none.
- `roleMap` says which plugin role each design name stands for. `identity`: every name is a role of the plugin and nothing contradicts it. `needs-confirmation`: core roles are missing (`bg`, `surface`, `ink`, `primary`, `h1`, `body`) or a usage text says the name means something else (`suspicious`); `suggested` is only a hint from how the usage text begins. Nothing is compared or applied until the user confirms the mapping (`sync-values.mjs --map`, saved in `.sb-context/design-map.json`, which survives re-extraction).
- `extra` holds token groups the fixed style has no place for (`size`, `z-index`…): kept whole, listed under Gaps, never applied by themselves.
- More than two themes: all kept in `themes` and in the color values; the structure applies the first two (light, dark). A gap says so.

## Guarantees of the script

- **Coverage check**: the number of colors, type styles, spacing, radii, shadows, breakpoints and other token groups read from `tokens.json` must equal what is in the machine block. A mismatch exits with code 4 and says `MISMATCH`.
- **Deterministic**: same inputs, same file (except the extraction date).
- **Re-extraction**: the previous file is kept as `design-source.prev.md` and the script prints what changed (colors, types, spacing, radii, shadows, components added/removed/changed).
- **No invented values**: whatever the design does not give is listed under Gaps.
- **Overrides**: eyebrow wording removed from usage texts and README (each change listed); breakpoints other than sm 640 / md 768 / lg 1024 / xl 1280 are reported, not used.

## Where it lives

Always `<Nuxt project root>/.sb-context/design-source.md`. The root is found from wherever the script starts (the folder with `nuxt.config.*`). Beside it: `design-applied.json` (which version the style was last aligned to), `design-map.json` (confirmed role mapping), `settings.json`.

## How `/sb-design:align` uses it

Values from the machine block; structure, names, namespaces and files from the plugin; the prefix from the user's answer. A conflict with the project's current CSS is reported and **the snapshot wins**, except for the overriding rules (no eyebrows, fixed breakpoints, 16px floor). Without a snapshot `/sb-design:align` keeps the project's values and normalizes them: the file is an optional input, never a prerequisite.
