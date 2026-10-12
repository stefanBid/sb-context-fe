# DESIGN.md format (written by `design-import`, read by `style-align`)

The file follows the **DESIGN.md spec** (github.com/google-labs-code/design.md, version `alpha`), the same format Impeccable's `/impeccable document` records. It can be checked with the spec's own linter: `npx @google/design.md lint DESIGN.md` (0 errors, 0 warnings on an import of the PraticaSicura design system).

## Frontmatter (spec)

```yaml
---
version: alpha
name: "PraticaSicura"
omitted:
  - components
colors:
  primary: "#14505F"            # the first theme (light)
  focus-ring: "{colors.primary}"  # aliases use the spec's reference syntax
typography:
  h1:
    fontFamily: "Bricolage Grotesque"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 46px
    letterSpacing: -0.015em
rounded:
  sm: 6px
  full: 999px
spacing:
  space-4: 16px
---
```

Token names are the plugin's roles (`bg`, `surface`, `ink`, `primary`, `on-primary`…; type roles `display`, `h1`…`overline`). The spec accepts unknown token names.

## Body (spec order)

`# Name`, then `## Overview`, `## Colors` (role, light/dark values, usage), `## Typography`, `## Layout` (spacing and breakpoints), `## Elevation & Depth` (shadows), `## Shapes` (radii), `## Do's and Don'ts` (the plugin's overriding rules: no eyebrows, 16px floor, fixed breakpoints, contrast minimums). Then the design's own README sections, preserved as extra sections (the spec keeps unknown headings).

## `## style-align extension` (not in the spec)

What the spec cannot express, as a fenced block ` ```json style-align `:

```json
{
  "source": "<artifact link>", "sourceVersion": "<version>", "importedAt": "2026-10-12",
  "suggestedPrefix": "ps",
  "themes": ["light", "dark"],
  "colorsDark": { "<role>": "#…" },
  "fonts": { "display": "\"Face\", fallbacks", "body": "…", "mono": null, "files": [] },
  "weights": [400, 600, 700],
  "familyRole": { "h1": "display", "body": "body" },
  "mobile": { "display": { "size": "36px", "lineHeight": "40px" } },
  "shadows": { "sm": { "light": "…", "dark": "…" } },
  "breakpoints": { "sm": "640px" },
  "motion": null
}
```

then `### Overrides applied during import` and `### Gaps to resolve in style-align`.

- `suggestedPrefix` is only a proposal: `style-align` always asks and the answer wins.
- `mobile` appears only when the design gives it (the Design System type puts it in the `usage` prose; the importer extracts it).
- `motion: null` means the design has none: `style-align` applies its defaults, provisional.
- A DESIGN.md that was **not** written by `design-import` (for example by `/impeccable document`) has no extension: dark theme, mobile sizes, shadows and motion are then gaps, derived minimally and marked provisional.

## How `style-align` uses it

Values come from the frontmatter and the extension; structure, names, namespaces and files from the plugin; the prefix from the user's answer. A conflict between this file and the project's current CSS is reported and **this file wins**, except for the overriding rules (no eyebrows, fixed breakpoints, 16px floor).
