# Design critique

Shared by `global-style-nuxt` and `global-style-refactor`. The method (scale, breakpoints, closed namespaces) answers *"is the system consistent?"*. This file answers the question the method cannot: *"is the result actually good, and does it belong to this product?"* A system can pass every check and still be flat, generic or hostile to the people using it.

Read it **after** the report or proposal is drafted and **before** asking for confirmation. Findings go in the report under "Design review", never applied silently.

## Stance

- **Judge before you tidy.** Decide what the interface should feel like first (calm, dense, playful, editorial), then check that tokens serve it. Do not let "it matches the scale" stand in for "it works".
- **The project's own documents win.** `DESIGN.md`, `CLAUDE.md` and the existing palette are the brief. If an outside rule or habit contradicts them (for example a rule against eyebrow labels when `DESIGN.md` documents them), follow the project and **say so in one line**. Never override the brief to match taste.
- **Be specific.** Name the element, file and line, say what fails for whom, give the fix. "Hierarchy is weak" is not a finding; "`<h1>` at `index.vue:119` has no role class, so the `display` tier is unused where it was designed to be" is.
- **No flattery, no softening.** Rank findings P0 (blocks the task) to P3 (polish). A clean result is allowed; padding a report is not.

## What to check

### 1. Hierarchy and scale use
- Is every role of the type scale used where its documentation says? A tier that exists but appears nowhere (typically `display`) is a signal the page was built from the middle of the scale.
- Can primary, secondary and metadata text be told apart without reading? Adjacent roles that differ by one small step carry no information.
- Are headings long enough to break badly at the step size? Run the real copy, in every locale, at the largest role: translated strings are often 30% longer.
- Overloaded roles: if one utility (for example the 12px uppercase overline) labels eyebrows, group titles and badges, it has stopped meaning anything. Group titles over form controls need a semantic element (`fieldset`/`legend`), not just a look.

### 2. Rhythm and composition
- Repeated bands: the same eyebrow + heading + paragraph, same padding and divider, N times, read as a catalogue with no major or minor. Vary density, width and structure on purpose.
- Duplicated blocks (the same panel twice, the same decorative dots) are one component waiting to be extracted.
- Decoration that implies behaviour it does not have (fake device frames, fake window chrome) must be marked decorative and justified, or cut.
- Cards as page structure, nested cards, identical icon + title + text tiles: structure first, containers second.

### 3. Color and status
- One accent, used for action and selection, not decoration. Count where it appears.
- Status colour never alone: colour + icon + text. A delta line coloured green with no icon fails the project's own rule.
- Destructive actions must not look weaker than neutral ones at rest.
- Disabled and placeholder states: measure, do not assume. State that a pair is below minimum on purpose rather than hiding it.

### 4. States and edge cases
A showcase or template teaches by what it shows. Check it shows the states that break first in production:
- default, hover, focus-visible, disabled, loading, error, empty, long text, many items;
- **demo data must not mislead**: a field pre-seeded with an invalid value shows an error on first paint and teaches that the default is wrong. Drive error demos from a toggle or a dedicated states block.
- motion that starts on its own (carousels, autoplay) needs a pause control and must respect `prefers-reduced-motion`.

### 5. Information architecture
- Navigation matches the page: every section reachable, none orphaned. Count the visible choices at each decision point; above four, group.
- Primary call to action lands somewhere that makes sense for a newcomer (an overview, not the first item of a long list).

### 6. Accessibility the scripts cannot see
- Group labels programmatically tied to their controls; icon-only controls named; focus ring visible on every focusable element in both themes.
- Strings in `aria-*` attributes and `alt` follow the same i18n rule as visible text.
- Zoom to 200% and a 320px viewport: nothing clips, nothing overlaps.

### 7. Product fit
- Could an unrelated product ship this unchanged? If the only thing tying the page to the product is a hex value, say so, and name one composition-level idea that would. This is a question for the user, not a rewrite.

## Verification

Static checks (inventory, contrast, template scan) are a **floor**. After writing:

1. If a browser tool is available, look at the real page once in light and dark, at desktop and 375px. Do it as one batch, fix everything seen in one pass, confirm once, stop.
2. If no browser tool is available, **say so explicitly** in the summary and list what was not verified (rendered contrast, dark theme, wrapping of long headings, overflow). Never imply the visual result was checked.

## Report block

Add to the report, in the user's language:

```markdown
## Design review
**Brief used**: DESIGN.md / CLAUDE.md / none (and any conflict resolved in its favour)
| Sev | Where | Finding | Why it matters | Fix |
**Not verified**: (list, or "nothing: checked in browser, light + dark, desktop + mobile")
**Questions for the user**: 1–3, each with options tied to a finding
```
