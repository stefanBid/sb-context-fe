# Design source — Sample Brand

> Written by `/sb-design:extract-style`. This file belongs to the sb-context-fe plugins: it is the bridge between a Claude design (the artifact stays the source of truth) and the project. `/sb-design:align` reads it for the **values**, `/sb-design:extract-ui` for the component index. It is **not** a `DESIGN.md` (that file is Impeccable's and is never read or written here). Do not edit by hand: re-extract. It can be committed with the project.
>
> How to read it: the sections below are the human view; the last section, **Machine data**, holds the same information complete and normalized (aliases resolved, both themes, mobile sizes, component index without the README texts, which are only in the Components section). When a table and the machine block disagree, the machine block wins.

## Provenance

| Field | Value |
| --- | --- |
| Design system | https://claude.ai/artifact/x |
| Artifact version | 3 |
| Pointed from | the design system itself |
| Extracted on | <today> |
| tokens.json sha256 | 4162c32c0eeac028… |
| Suggested prefix | `sb` (a proposal: /sb-design:align always asks, the answer wins) |
| Themes | light, dark |

## Colors

20 roles. Light / dark; "role" says whether the name is in the plugin's fixed set.

| Role | light | dark | In fixed set | Usage |
| --- | --- | --- | --- | --- |
| `bg` | `#f8faf9` | `#0d0f0e` | yes | Page background. |
| `surface` | `#ffffff` | `#161918` | yes | Cards, panels. |
| `surface-2` | `#f1f5f3` | `#1f2522` | yes | Nested surfaces, inputs. |
| `border` | `#d4e4dc` | `#2d3733` | yes | Dividers. |
| `border-strong` | `#7a8f84` | `#5f7268` | yes | Input borders. |
| `ink` | `#1a1a1a` | `#f0f5f2` | yes | Body text. |
| `ink-muted` | `#5a6c62` | `#94a89e` | yes | Secondary text. |
| `primary` | `#00804a` | `#00c975` | yes | Actions and links. |
| `primary-hover` | `#007041` | `#00e085` | yes | — |
| `on-primary` | `#ffffff` | `#0d0f0e` | yes | — |
| `primary-soft` | `#e9f6ef` | `#0f2b1e` | yes | — |
| `success` | `#166534` | `#4ade80` | yes | — |
| `success-soft` | `#d1fae5` | `#14532d` | yes | — |
| `warning` | `#b45309` | `#fdba74` | yes | — |
| `warning-soft` | `#fef3c7` | `#78350f` | yes | — |
| `error` | `#b91c1c` | `#fca5a5` | yes | — |
| `error-soft` | `#fee2e2` | `#7f1d1d` | yes | — |
| `info` | `#1d4ed8` | `#93c5fd` | yes | — |
| `info-soft` | `#dbeafe` | `#1e3a8a` | yes | — |
| `focus-ring` | `#1a1a1a` (= ink) | `#f0f5f2` (= ink) | yes | Keyboard focus ring. |

## Typography

- Display family: `"Poppins", ui-sans-serif, system-ui, sans-serif`
- Body family: `"Inter", ui-sans-serif, system-ui, sans-serif`
- Mono family: `ui-monospace, SFMono-Regular, Menlo, monospace`
- Weights used: 400, 600, 700
- Font files: Poppins, Inter

11 styles. Mobile values come from the design's usage text when it gives them.

| Role | Family | Size / line | Weight | Tracking | Mobile | In fixed set | Usage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `display` | display | 56px / 60px | 700 | -0.02em | 36px / 40px | yes | Hero only. |
| `h1` | display | 40px / 46px | 700 | -0.015em | 30px / 36px | yes | Page title. |
| `h2` | display | 30px / 36px | 700 | -0.01em | 24px / 30px | yes | Section title. |
| `h3` | display | 22px / 28px | 600 | — | — | yes | — |
| `h4` | display | 18px / 24px | 600 | — | — | yes | — |
| `lead` | body | 19px / 30px | 400 | — | — | yes | — |
| `body` | body | 16px / 26px | 400 | — | — | yes | — |
| `body-strong` | body | 16px / 26px | 600 | — | — | yes | — |
| `label` | body | 14px / 20px | 600 | — | — | yes | — |
| `small` | body | 14px / 20px | 400 | — | — | yes | — |
| `overline` | body | 12px / 16px | 700 | 0.08em | — | yes | Above titles. |

## Spacing

| Token | Value | Usage |
| --- | --- | --- |
| `space-4` | 16px | — |

## Radii

| Token | Value | Static utility | Usage |
| --- | --- | --- | --- |
| `sm` | 10px | no | — |
| `md` | 14px | no | — |
| `lg` | 22px | no | — |
| `full` | 9999px | yes (not a token) | — |

## Shadows

| Token | light | dark | Usage |
| --- | --- | --- | --- |
| `sm` | `0 1px 2px rgba(26, 26, 26, 0.06), 0 1px 1px rgba(26, 26, 26, 0.04)` | `0 1px 2px rgba(0, 0, 0, 0.4)` | — |
| `md` | `0 6px 16px -4px rgba(26, 26, 26, 0.1), 0 2px 4px rgba(26, 26, 26, 0.05)` | `0 8px 20px -6px rgba(0, 0, 0, 0.55)` | — |
| `lg` | `0 18px 40px -12px rgba(26, 26, 26, 0.18)` | `0 20px 44px -12px rgba(0, 0, 0, 0.7)` | — |

## Breakpoints

The plugin fixes sm 640 / md 768 / lg 1024 / xl 1280; the design's own values are shown for reference.

| Name | Design | Plugin | Usage |
| --- | --- | --- | --- |
| `sm` | 640px | 640px | — |
| `md` | 760px | 768px | — |
| `2xl` | 1536px | not used | — |

## Motion

None in the design. `/sb-design:align` applies its defaults (provisional).

## Brand guide

The design's own README, with the eyebrow wording removed (see Overrides).

### Sample Brand

Calm and precise. Headings use Poppins, text uses Inter.

#### Voice

Use sparingly.

## Components

2 documented components. `/sb-design:extract-ui` matches the requested name against this list, then reads the markup in `project/components/<Name>/preview.html` from the artifact. Styles are in `project/bundle.css`.

| Component | Group | Summary | Classes in the preview |
| --- | --- | --- | --- |
| `Button` | Actions | Primary and secondary actions. | `sb-btn` `sb-btn--primary` |
| `Card` | — | — | `sb-card` |

### Button

_Buttons for actions_

Primary and secondary actions.

#### Rules

One primary button per view.

### Card

_No README._

## Overrides applied during extraction

- color ink: "Body text and eyebrows." → "Body text."
- type overline: "Eyebrows and kickers above titles." → "Above titles."
- breakpoint md: design says 760px, the plugin fixes 768px
- breakpoint 2xl (1536px): only sm, md, lg, xl exist
- README: "Use eyebrows and kickers sparingly." → "Use sparingly."

## Gaps to resolve in /sb-design:align

- Motion: the design system has no motion family. Defaults from `/sb-design:align` references/motion.md apply, marked provisional.
- Component `Card` has no README: usage rules unknown, read its preview.
- Token group `zIndex` (1) is not part of the fixed style: kept in the machine data under `extra`, not applied. Decide in /sb-design:align where it belongs (a token, a component constant) or drop it.

## Machine data

```json design-source
{
  "schema": "design-source/1",
  "name": "Sample Brand",
  "suggestedPrefix": "sb",
  "source": {
    "kind": "design-system",
    "designSystem": "https://claude.ai/artifact/x",
    "version": "3",
    "pointedFrom": null,
    "extractedAt": "<today>",
    "tokensSha256": "4162c32c0eeac0284412032f938575a781c75152eec91cc75ea6e90e73bd7a10"
  },
  "themes": [
    "light",
    "dark"
  ],
  "colors": {
    "bg": {
      "light": "#f8faf9",
      "dark": "#0d0f0e",
      "usage": "Page background.",
      "inFixedSet": true
    },
    "surface": {
      "light": "#ffffff",
      "dark": "#161918",
      "usage": "Cards, panels.",
      "inFixedSet": true
    },
    "surface-2": {
      "light": "#f1f5f3",
      "dark": "#1f2522",
      "usage": "Nested surfaces, inputs.",
      "inFixedSet": true
    },
    "border": {
      "light": "#d4e4dc",
      "dark": "#2d3733",
      "usage": "Dividers.",
      "inFixedSet": true
    },
    "border-strong": {
      "light": "#7a8f84",
      "dark": "#5f7268",
      "usage": "Input borders.",
      "inFixedSet": true
    },
    "ink": {
      "light": "#1a1a1a",
      "dark": "#f0f5f2",
      "usage": "Body text.",
      "inFixedSet": true
    },
    "ink-muted": {
      "light": "#5a6c62",
      "dark": "#94a89e",
      "usage": "Secondary text.",
      "inFixedSet": true
    },
    "primary": {
      "light": "#00804a",
      "dark": "#00c975",
      "usage": "Actions and links.",
      "inFixedSet": true
    },
    "primary-hover": {
      "light": "#007041",
      "dark": "#00e085",
      "usage": "",
      "inFixedSet": true
    },
    "on-primary": {
      "light": "#ffffff",
      "dark": "#0d0f0e",
      "usage": "",
      "inFixedSet": true
    },
    "primary-soft": {
      "light": "#e9f6ef",
      "dark": "#0f2b1e",
      "usage": "",
      "inFixedSet": true
    },
    "success": {
      "light": "#166534",
      "dark": "#4ade80",
      "usage": "",
      "inFixedSet": true
    },
    "success-soft": {
      "light": "#d1fae5",
      "dark": "#14532d",
      "usage": "",
      "inFixedSet": true
    },
    "warning": {
      "light": "#b45309",
      "dark": "#fdba74",
      "usage": "",
      "inFixedSet": true
    },
    "warning-soft": {
      "light": "#fef3c7",
      "dark": "#78350f",
      "usage": "",
      "inFixedSet": true
    },
    "error": {
      "light": "#b91c1c",
      "dark": "#fca5a5",
      "usage": "",
      "inFixedSet": true
    },
    "error-soft": {
      "light": "#fee2e2",
      "dark": "#7f1d1d",
      "usage": "",
      "inFixedSet": true
    },
    "info": {
      "light": "#1d4ed8",
      "dark": "#93c5fd",
      "usage": "",
      "inFixedSet": true
    },
    "info-soft": {
      "light": "#dbeafe",
      "dark": "#1e3a8a",
      "usage": "",
      "inFixedSet": true
    },
    "focus-ring": {
      "light": "#1a1a1a",
      "dark": "#f0f5f2",
      "alias": {
        "light": "ink",
        "dark": "ink"
      },
      "usage": "Keyboard focus ring.",
      "inFixedSet": true
    }
  },
  "fonts": {
    "display": "\"Poppins\", ui-sans-serif, system-ui, sans-serif",
    "body": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
    "mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
    "files": [
      "Poppins",
      "Inter"
    ]
  },
  "weights": [
    400,
    600,
    700
  ],
  "type": {
    "display": {
      "group": "Headings",
      "familyRole": "display",
      "family": "\"Poppins\", ui-sans-serif, system-ui, sans-serif",
      "size": "56px",
      "lineHeight": "60px",
      "weight": 700,
      "letterSpacing": "-0.02em",
      "mobile": {
        "size": "36px",
        "lineHeight": "40px"
      },
      "sample": null,
      "usage": "Hero only.",
      "inFixedSet": true
    },
    "h1": {
      "group": "Headings",
      "familyRole": "display",
      "family": "\"Poppins\", ui-sans-serif, system-ui, sans-serif",
      "size": "40px",
      "lineHeight": "46px",
      "weight": 700,
      "letterSpacing": "-0.015em",
      "mobile": {
        "size": "30px",
        "lineHeight": "36px"
      },
      "sample": null,
      "usage": "Page title.",
      "inFixedSet": true
    },
    "h2": {
      "group": "Headings",
      "familyRole": "display",
      "family": "\"Poppins\", ui-sans-serif, system-ui, sans-serif",
      "size": "30px",
      "lineHeight": "36px",
      "weight": 700,
      "letterSpacing": "-0.01em",
      "mobile": {
        "size": "24px",
        "lineHeight": "30px"
      },
      "sample": null,
      "usage": "Section title.",
      "inFixedSet": true
    },
    "h3": {
      "group": "Headings",
      "familyRole": "display",
      "family": "\"Poppins\", ui-sans-serif, system-ui, sans-serif",
      "size": "22px",
      "lineHeight": "28px",
      "weight": 600,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "h4": {
      "group": "Headings",
      "familyRole": "display",
      "family": "\"Poppins\", ui-sans-serif, system-ui, sans-serif",
      "size": "18px",
      "lineHeight": "24px",
      "weight": 600,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "lead": {
      "group": "Text",
      "familyRole": "body",
      "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
      "size": "19px",
      "lineHeight": "30px",
      "weight": 400,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "body": {
      "group": "Text",
      "familyRole": "body",
      "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
      "size": "16px",
      "lineHeight": "26px",
      "weight": 400,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "body-strong": {
      "group": "Text",
      "familyRole": "body",
      "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
      "size": "16px",
      "lineHeight": "26px",
      "weight": 600,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "label": {
      "group": "Text",
      "familyRole": "body",
      "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
      "size": "14px",
      "lineHeight": "20px",
      "weight": 600,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "small": {
      "group": "Text",
      "familyRole": "body",
      "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
      "size": "14px",
      "lineHeight": "20px",
      "weight": 400,
      "sample": null,
      "usage": "",
      "inFixedSet": true
    },
    "overline": {
      "group": "Text",
      "familyRole": "body",
      "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
      "size": "12px",
      "lineHeight": "16px",
      "weight": 700,
      "letterSpacing": "0.08em",
      "sample": null,
      "usage": "Above titles.",
      "inFixedSet": true
    }
  },
  "spacing": {
    "space-4": {
      "value": "16px",
      "usage": ""
    }
  },
  "radius": {
    "sm": {
      "value": "10px",
      "usage": "",
      "static": false
    },
    "md": {
      "value": "14px",
      "usage": "",
      "static": false
    },
    "lg": {
      "value": "22px",
      "usage": "",
      "static": false
    },
    "full": {
      "value": "9999px",
      "usage": "",
      "static": true
    }
  },
  "shadows": {
    "sm": {
      "values": {
        "light": "0 1px 2px rgba(26, 26, 26, 0.06), 0 1px 1px rgba(26, 26, 26, 0.04)",
        "dark": "0 1px 2px rgba(0, 0, 0, 0.4)"
      },
      "usage": ""
    },
    "md": {
      "values": {
        "light": "0 6px 16px -4px rgba(26, 26, 26, 0.1), 0 2px 4px rgba(26, 26, 26, 0.05)",
        "dark": "0 8px 20px -6px rgba(0, 0, 0, 0.55)"
      },
      "usage": ""
    },
    "lg": {
      "values": {
        "light": "0 18px 40px -12px rgba(26, 26, 26, 0.18)",
        "dark": "0 20px 44px -12px rgba(0, 0, 0, 0.7)"
      },
      "usage": ""
    }
  },
  "breakpoints": {
    "design": {
      "sm": {
        "value": "640px",
        "usage": ""
      },
      "md": {
        "value": "760px",
        "usage": ""
      },
      "2xl": {
        "value": "1536px",
        "usage": ""
      }
    },
    "fixed": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px"
    }
  },
  "motion": null,
  "roleMap": {
    "status": "identity",
    "colors": {
      "bg": {
        "role": "bg",
        "suggested": null
      },
      "surface": {
        "role": "surface",
        "suggested": null
      },
      "surface-2": {
        "role": "surface-2",
        "suggested": null
      },
      "border": {
        "role": "border",
        "suggested": null
      },
      "border-strong": {
        "role": "border-strong",
        "suggested": null
      },
      "ink": {
        "role": "ink",
        "suggested": null
      },
      "ink-muted": {
        "role": "ink-muted",
        "suggested": null
      },
      "primary": {
        "role": "primary",
        "suggested": null
      },
      "primary-hover": {
        "role": "primary-hover",
        "suggested": null
      },
      "on-primary": {
        "role": "on-primary",
        "suggested": null
      },
      "primary-soft": {
        "role": "primary-soft",
        "suggested": null
      },
      "success": {
        "role": "success",
        "suggested": null
      },
      "success-soft": {
        "role": "success-soft",
        "suggested": null
      },
      "warning": {
        "role": "warning",
        "suggested": null
      },
      "warning-soft": {
        "role": "warning-soft",
        "suggested": null
      },
      "error": {
        "role": "error",
        "suggested": null
      },
      "error-soft": {
        "role": "error-soft",
        "suggested": null
      },
      "info": {
        "role": "info",
        "suggested": null
      },
      "info-soft": {
        "role": "info-soft",
        "suggested": null
      },
      "focus-ring": {
        "role": "focus-ring",
        "suggested": null
      }
    },
    "type": {
      "display": {
        "role": "display",
        "suggested": null
      },
      "h1": {
        "role": "h1",
        "suggested": null
      },
      "h2": {
        "role": "h2",
        "suggested": null
      },
      "h3": {
        "role": "h3",
        "suggested": null
      },
      "h4": {
        "role": "h4",
        "suggested": null
      },
      "lead": {
        "role": "lead",
        "suggested": null
      },
      "body": {
        "role": "body",
        "suggested": null
      },
      "body-strong": {
        "role": "body-strong",
        "suggested": null
      },
      "label": {
        "role": "label",
        "suggested": null
      },
      "small": {
        "role": "small",
        "suggested": null
      },
      "overline": {
        "role": "overline",
        "suggested": null
      }
    }
  },
  "extra": {
    "zIndex": {
      "tokens": [
        {
          "name": "z-modal",
          "value": "50"
        }
      ]
    }
  },
  "components": [
    {
      "name": "Button",
      "group": "Actions",
      "subtitle": "Buttons for actions",
      "summary": "Primary and secondary actions.",
      "files": {
        "readme": "project/components/Button/README.md",
        "preview": "project/components/Button/preview.html"
      },
      "classes": [
        "sb-btn",
        "sb-btn--primary"
      ]
    },
    {
      "name": "Card",
      "group": null,
      "subtitle": null,
      "summary": "",
      "files": {
        "readme": null,
        "preview": "project/components/Card/preview.html"
      },
      "classes": [
        "sb-card"
      ]
    }
  ],
  "overrides": [
    "color ink: \"Body text and eyebrows.\" → \"Body text.\"",
    "type overline: \"Eyebrows and kickers above titles.\" → \"Above titles.\"",
    "breakpoint md: design says 760px, the plugin fixes 768px",
    "breakpoint 2xl (1536px): only sm, md, lg, xl exist",
    "README: \"Use eyebrows and kickers sparingly.\" → \"Use sparingly.\""
  ],
  "gaps": [
    "Motion: the design system has no motion family. Defaults from `/sb-design:align` references/motion.md apply, marked provisional.",
    "Component `Card` has no README: usage rules unknown, read its preview.",
    "Token group `zIndex` (1) is not part of the fixed style: kept in the machine data under `extra`, not applied. Decide in /sb-design:align where it belongs (a token, a component constant) or drop it."
  ]
}
```
