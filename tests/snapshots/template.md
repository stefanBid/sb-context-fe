# Template analysis — theme: app/assets/css/main.css · prefix: sb

## app/pages/index.vue

| Line | Tag | Class | Status | Proposal | Note |
| --- | --- | --- | --- | --- | --- |
| 3 | `<h1>` | `text-4xl` | broken | `(remove)` | The <h1> tag already gets the h1 style from the base layer. |
| 3 | `<h1>` | `font-medium` | broken | `font-normal or font-semibold` | Weight 500 is equidistant: the intended emphasis decides. |
| 3 | `<h1>` | `text-gray-700` | broken | `text-ink-muted | text-ink | text-primary` | Nearby theme colors, ordered by the role that suits the property: choose by role, not by similarity. |
| 4 | `<p>` | `rounded-xl` | broken | `rounded-sm` | 12px → sm (10px). |
| 4 | `<p>` | `shadow` | broken | `shadow-sm` |  |

Total changes flagged: 5 in 1 of 1 files.
