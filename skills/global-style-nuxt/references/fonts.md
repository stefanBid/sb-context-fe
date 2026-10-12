# Fonts: flexible choice, harmonious pair

The families belong to the project. The skill does not replace them for taste: it checks that each one suits its role and that the two work together. If the pair is not harmonious, it proposes changing **only one**, and **the user chooses which one to keep**.

What stays rigid is the number of roles: `display` for headings and `body` for everything else (plus `mono` only if the project shows code). The two can also be the same family: a single-family system is valid, with contrast coming from size and weight.

## 1. The role of each family

**Display (headings from 18px up)**
- Can have character: this is where the project shows its personality.
- Must have weights 600 and 700 (or a variable axis covering them).
- Optical sizes (`opsz`) are a plus: the face adapts between `h4` and `display`.

**Body (text, labels, inputs, numbers)**
- Legible at 14–16px: open apertures, distinct shapes for `I l 1` and `O 0`.
- Weights 400, 600 and 700.
- Tabular figures (`tnum`): needed in forms, dates, amounts, codes.
- `latin-ext` coverage if the project shows names or text beyond basic Latin.
- Low personality: the text should disappear behind the content.

## 2. When a pair is harmonious

PraticaSicura uses Bricolage Grotesque and Figtree. The display face is a grotesque with character and optical sizes, warm without being playful; the body face is geometric and very legible, also on numbers and forms. The two contrast in personality but share similar proportions.

The principle: **contrast on one dimension, kinship on the others.**

| Signal | Harmonious | Not harmonious |
| --- | --- | --- |
| Personality | one family with character, the other neutral | two families with strong character (two display faces, two "decorative" ones) that compete |
| Similarity | clearly different (serif + sans, grotesque + geometric) or the same superfamily | almost identical but not quite (Inter + Roboto, Montserrat + Poppins, Open Sans + Lato): it looks like a mistake |
| Proportions | similar x-height (difference within about 10%) | very different x-heights: headings and text side by side look like two different sizes even when they are not |
| Width | comparable widths | a very condensed face next to a very wide one |
| Role | each does its job well (§1) | the body face is a display face (hard to read small) or the display face lacks the weights |

If you do not know a family well, check it on the provider's page (weights, variable axes, character set, tabular figures) before judging it.

## 3. Procedure

1. **Detect the families**: from `font-family`, `@font-face`, Google `@import` and `fonts.families` in `nuxt.config` (the inventory lists them). Assign each one the role it actually plays (where it appears).
2. **Evaluate** each family on its role (§1) and the pair (§2).
3. **Outcome in the report**, Fonts section:
   - *Harmonious*: one line saying why, and it is kept.
   - *Not harmonious*: two or three sentences on why, then a "To decide" item.
4. **To decide: which one to keep.** Ask the user which of the two families to keep (usually the one tied to the brand, but the user decides). **Never propose changing both.**
5. **Alternatives for the other**: once chosen, propose 2 or 3 families that pair well with the one kept. Each with one line of reasoning, the weights, and the `@nuxt/fonts` provider (Google, Bunny, Fontshare, Fontsource or local). The user chooses, or decides to keep the original pair anyway.
6. **More than two families**: ask which two to keep for `display` and `body` (plus `mono` if needed). The others leave the global style.
7. **A single family**: fine for both roles. You may offer a display family as an option, without insisting.

## 4. References for alternatives

Proven pairs, useful as a starting point:

| Display | Body | Character |
| --- | --- | --- |
| Bricolage Grotesque | Figtree | warm, contemporary (PraticaSicura) |
| Fraunces | Figtree or Inter | soft editorial |
| DM Serif Display | DM Sans | same superfamily, elegant |
| Instrument Serif | Instrument Sans | same superfamily, essential |
| Playfair Display | Source Sans 3 | classic, high contrast |
| Space Grotesk | IBM Plex Sans | technical |

Body faces well suited to forms and data: Inter, Figtree, Source Sans 3, IBM Plex Sans, DM Sans, Public Sans, Atkinson Hyperlegible (legibility for low-vision readers).

When the user keeps a family that is not in the table, reason with the criteria in §2, not with the table.

## 5. Effect on the files

- `typography.css`: only the values of `--font-display` and `--font-body` change (and `--font-mono` if present). Scale, weights and utilities stay identical.
- `nuxt.config.ts`: `fonts.families` lists the families with the weights the roles use (display 600–700, body 400–700).
