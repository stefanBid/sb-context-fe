# Motion

Part of the **standard**: fixed for every engine and framework. How the tokens are declared is the engine's file (`../engines/tailwind4/README.md`).

The skill fixes the **structure** of motion: which tokens exist, how animations and the standard transition are declared, how reduced motion works. Values and character come from `design-source.md` when it exists; the numbers below are defaults.

## 1. Tokens

Durations follow four bands, as raw variables with the prefix:

| Token | Default | Band | Use |
| --- | --- | --- | --- |
| `--{p}-duration-feedback` | 120ms | 100–150ms | hover, focus, toggles, color changes |
| `--{p}-duration-state` | 200ms | 150–300ms | dropdowns, accordions, messages appearing, state changes |
| `--{p}-duration-layout` | 400ms | 300–500ms | side panels, overlays, layout changes |
| `--{p}-duration-entrance` | 600ms | 500–800ms | authored entrances |

Easings are a closed set:

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | arrival: things coming in |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | exit: things going out |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | in-place state changes |

Animations are a closed set. Defined by default: `fade-in`, `fade-out`, `rise-in`, `slide-in-right`, `spin` (loading indicators). Others only if the project uses them, with the same durations and easings. The spatial keyframes translate by `var(--{p}-motion-distance)` (§3).

The `{p}-transition` utility (the example also has `{p}-focus`, `{p}-focus-within` and `{p}-no-focus`, kept when the project uses them): explicit properties (color, background, border, outline, shadow, opacity, transform), `feedback` duration, `ease-in-out` easing. It is the default transition for controls.

Vue `<Transition>` classes (`fade`, `slide-down`, `scale-fade`, `page` in the example) use the same tokens: arrival `ease-out` with the `layout` or `state` duration, exit `ease-in` with `feedback`, translate through `--{p}-motion-distance`.

## 2. Rules

- **Exit faster than entrance.** What leaves should not keep people waiting.
- **No bounce or elastic by reflex.** Arrival uses `ease-out`.
- **Avoid animating layout properties** (`width`, `height`, `top`, `left`, `margin`): they force layout. Prefer `opacity`, `transform`, color. Blur, `filter` and `clip-path` are allowed for a deliberate effect.
- **Never `transition: all`**: list the properties.
- Scattered durations (150ms, 250ms, 300ms…) move to the nearest band token.
- Duplicate keyframes, or different names for the same movement, are merged.
- Infinite animation only for loading indicators.

## 3. Reduced motion

`prefers-reduced-motion: reduce` is **required**. It removes or reduces **spatial movement** but keeps opacity, color and state transitions that carry meaning. Durations are **not** zeroed.

- Every keyframe that translates uses `var(--{p}-motion-distance)`, so one variable controls all movement.
- `--{p}-motion-distance` has a default value in `:root` and is set to `0` under `prefers-reduced-motion: reduce`.
- Under the same media query, `scroll-behavior: auto`.
