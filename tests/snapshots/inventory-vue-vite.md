# Global style inventory

## Project

- vue: ^3.5.0
- vite: ^7.0.0
- tailwindcss: ^4.1.0
- @tailwindcss/vite: ^4.1.0
- @vueuse/core: ^15.0.0
- @fontsource/inter: ^5.2.0
- @fontsource/poppins: ^5.2.0
- srcDir: src
- css imported by src/main.ts: ./assets/css/main.css
- package css imported by src/main.ts: @fontsource/poppins/600.css, @fontsource/poppins/700.css, @fontsource/inter/400.css, @fontsource/inter/600.css, @fontsource/inter/700.css
- colorMode: useColorMode in src/composables/useTheme.ts, attribute=data-theme, storageKey=color-mode · inline script in index.html: yes (key color-mode)
- fonts: @fontsource/poppins (600, 700), @fontsource/inter (400, 600, 700)

## Sources

- src/assets/css/main.css (css)
- src/assets/css/theme.css (css, imported by src/assets/css/main.css)
- src/assets/css/typography.css (css, imported by src/assets/css/main.css)
- src/assets/css/animation.css (css, imported by src/assets/css/main.css)

## Theme

- data-theme="dark": yes · .dark: no · prefers-color-scheme: no · color-scheme: yes · @custom-variant dark: yes
- prefers-reduced-motion: yes
- Tailwind namespaces already closed: color, font, text, shadow, radius, font-weight, inset-shadow, drop-shadow, text-shadow, ease, animate, breakpoint

## Structure

- ok [S1] four files present (all)
- ok [S1] main.css imports theme, typography, animation
- ok [P9] src/main.ts imports only src/assets/css/main.css
- ok [S2] @theme inline present
- ok [F3/C2/T15] all namespaces closed
- ok [C11/C12] data-theme dark, color-scheme, @custom-variant dark
- ok [M1] prefers-reduced-motion handled
- ok [S4] prefixed utilities detected (prefix "sb")
- ok [S3] no design tokens outside @theme
- ok [S4] raw variables all use --sb-

**Already aligned: yes (prefix "sb")**

## Text sizes

Scale source: **tokens** — steps: 12px (overline), 14px (label / small), 16px (body / body-strong), 18px (h4), 19px (lead), 22px (h3), 30px (h2), 40px (h1), 56px (display)

| Where | Selector / token | Size | px | Nearest step | Offset | Line height | Weight |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/assets/css/typography.css:90 (@variant lg) | `@utility sb-display` | var(--text-display) | 56 | 56 (display) | 0 | 1.071 | — |
| src/assets/css/typography.css:27 | `--text-display` | 3.5rem | 56 | 56 (display) | 0 | — | — |
| src/assets/css/typography.css:101 (@variant lg) | `@utility sb-h1` | var(--text-h1) | 40 | 40 (h1) | 0 | 1.15 | — |
| src/assets/css/typography.css:32 | `--text-h1` | 2.5rem | 40 | 40 (h1) | 0 | — | — |
| src/assets/css/typography.css:86 | `@utility sb-display` | 2.25rem | 36 | 40 (h1) | **-4** | 1.111 | — |
| src/assets/css/typography.css:97 | `@utility sb-h1` | 1.875rem | 30 | 30 (h2) | 0 | 1.2 | — |
| src/assets/css/typography.css:112 (@variant lg) | `@utility sb-h2` | var(--text-h2) | 30 | 30 (h2) | 0 | 1.2 | — |
| src/assets/css/typography.css:37 | `--text-h2` | 1.875rem | 30 | 30 (h2) | 0 | — | — |
| src/assets/css/typography.css:108 | `@utility sb-h2` | 1.5rem | 24 | 22 (h3) | **+2** | 1.25 | — |
| src/assets/css/typography.css:42 | `--text-h3` | 1.375rem | 22 | 22 (h3) | 0 | — | — |
| src/assets/css/typography.css:50 | `--text-lead` | 1.1875rem | 19 | 19 (lead) | 0 | — | — |
| src/assets/css/typography.css:46 | `--text-h4` | 1.125rem | 18 | 18 (h4) | 0 | — | — |
| src/assets/css/typography.css:147 | `input, select, textarea` | var(--text-body) | 16 | 16 (body / body-strong) | 0 | — | — |
| src/assets/css/typography.css:54 | `--text-body` | 1rem | 16 | 16 (body / body-strong) | 0 | — | — |
| src/assets/css/typography.css:58 | `--text-body-strong` | 1rem | 16 | 16 (body / body-strong) | 0 | — | — |
| src/assets/css/typography.css:62 | `--text-label` | 0.875rem | 14 | 14 (label / small) | 0 | — | — |
| src/assets/css/typography.css:66 | `--text-small` | 0.875rem | 14 | 14 (label / small) | 0 | — | — |
| src/assets/css/typography.css:70 | `--text-overline` | 0.75rem | 12 | 12 (overline) | 0 | — | — |

Families used: —
Weights used: —
@font-face: none

## Colors

Distinct colors: 44
Literal colors outside theme blocks: 0

## Radii, shadows, motion

Radii: —
Shadows: 0 declarations, 0 distinct values
Motion: transition-property: color, background-color, border-color, outline-color, box-shadow, opacity, transform · transition-duration: var(--sb-duration-feedback) · transition-timing-function: var(--ease-in-out) · transition: opacity var(--sb-duration-layout) var(--ease-out), transform var(--sb-duration-layout) var(--ease-out) · transition: opacity var(--sb-duration-feedback) var(--ease-in), transform var(--sb-duration-feedback) var(--ease-in) · transition: opacity var(--sb-duration-state) var(--ease-out), transform var(--sb-duration-state) var(--ease-out) · transition: opacity var(--sb-duration-layout) var(--ease-out) · transition: opacity var(--sb-duration-feedback) var(--ease-in)
Keyframes: fade-in, fade-out, rise-in, slide-in-right, spin

## clamp()

None.

## Breakpoints used

No width media queries.

## Component impact

Not analyzed (optional: rerun with --classes if the user asks for it).
