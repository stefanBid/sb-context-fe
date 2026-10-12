# DESIGN.md format (written by `design-import`, read by `style-align`)

A markdown file at the project root.

## Header

```yaml
---
name: PraticaSicura          # the design system's name
source: <artifact link>
sourceVersion: <artifact version>
importedAt: 2026-10-12
suggestedPrefix: ps          # a proposal; style-align always asks
---
```

## Sections

| Section | Content |
| --- | --- |
| Rules that override this document | no eyebrows, fixed breakpoints, 16px floor |
| Tokens | a fenced block ` ```json tokens ` with the normalized values (below). Machine-read: not hand-edited |
| Overrides applied during import | every change the importer made to the design's own text or values |
| Gaps to resolve in style-align | what the design does not give; each becomes a **provisional** value |
| Brand book | the design's README prose (tone, usage), minus eyebrow wording |

## The `tokens` block

```json
{
  "themes": ["light", "dark"],
  "colors": { "<role>": { "light": "#…", "dark": "#…", "usage": "…" } },
  "fonts": { "display": "\"Face\", fallbacks", "body": "…", "mono": null, "files": [] },
  "weights": [400, 600, 700],
  "type": { "<role>": { "family": "display", "size": "56px", "lineHeight": "60px", "weight": 700,
                        "letterSpacing": "-0.02em", "mobile": { "size": "36px", "lineHeight": "40px" }, "usage": "…" } },
  "radius": { "sm": "6px" },
  "shadow": { "sm": { "light": "…", "dark": "…" } },
  "spacing": { "space-1": "4px" },
  "breakpoints": { "sm": "640px" },
  "motion": null
}
```

- Color values may be an alias (`"{primary}"`): write it as `var(--{p}-primary)`.
- `mobile` is present only when the design gives it (the Design System type puts it in the `usage` prose; the importer extracts it).
- `motion: null` means the design has none: `style-align` applies its defaults, provisional.
- Roles outside the fixed set are kept under their own name and reported.

## How `style-align` uses it

Values come from the block, structure from `style-align`. For each token: the value from here; the name, the namespace and the file from the plugin's structure; the prefix from the user's answer. A conflict between this file and the project's current CSS is reported and **this file wins**, except the rules listed under "Rules that override this document".
