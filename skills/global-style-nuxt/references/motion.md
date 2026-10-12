# Motion

PraticaSicura does not define motion. These rules add it in the same spirit: restrained, short, never decorative. Motion is there to show what changed, not to draw attention.

## 1. Closed set

| Token | Value | Use |
| --- | --- | --- |
| `--{p}-duration-fast` | 120ms | hover, focus, toggles, chips, color changes |
| `--{p}-duration-base` | 200ms | dropdowns, accordions, messages and callouts appearing |
| `--{p}-duration-slow` | 320ms | side panels, toasts, step changes |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | in-place state changes |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | things coming in: decelerate |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | things going out: accelerate |

Durations are raw variables with the prefix (Tailwind 4 has no namespace for durations); easings and animations are Tailwind tokens with `--ease-*: initial` and `--animate-*: initial`.

Defined animations: `fade-in`, `fade-out`, `rise-in` (rises by 8px), `slide-in-right` (24px), `spin` (loading indicators only). Others are added only if the project really uses them, with the same durations and easings.

The `{p}-transition` utility: explicit properties (color, background, border, outline, shadow, opacity, transform), `fast` duration, `standard` easing. It is the default transition for controls.

## 2. Rules

- Only `opacity` and `transform` are animated (plus colors in transitions). Never `width`, `height`, `top`, `left`, `margin`: they force layout recalculation.
- Never `transition: all`: list the properties.
- No duration above 400ms in the global style. Scattered durations (150ms, 250ms, 300ms…) move to the nearest token.
- Entering is slower than exiting: what leaves should not keep people waiting.
- No bounces, pulses or infinite animations except the loading `spin`.
- `prefers-reduced-motion: reduce` is **required**: it zeroes durations and iterations in the `@layer base` of `animation.css`.
- Duplicate keyframes, or different names for the same movement, are merged.
