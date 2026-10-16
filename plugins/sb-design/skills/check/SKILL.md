---
name: check
description: Read-only check of an app's global style — whether it is aligned to the fixed four-file Tailwind 4 structure and, when a Claude design snapshot exists, whether its values still match the design. Changes nothing. Used by /sb-core:setup and /sb-health:checkup, or directly. Trigger phrases (English or Italian) — "is the style aligned?", "check the design sync", "lo stile è allineato?", "controlla il design".
---

# Check the global style (read-only)

Answers two questions without changing any file: **is the global style in the plugin's structure?** and **does it still match the design snapshot?** It is the entry point other plugins use (`/sb-core:setup`, `/sb-health:checkup`), so they never reach into this plugin's scripts.

A fix is never made here: structure goes to `/sb-design:align`, values out of sync to its sync flow.

**Language**: this file is in English; talk to the user in their language.

## 1. Structure

```bash
node "${CLAUDE_SKILL_DIR}/../align/scripts/inventory.mjs"
```

Read-only. Report its last line, **Already aligned: yes/no** (with the prefix when yes) and, when no, the checks of the **Structure** section marked **NO**. If the four files (`main.css`, `theme.css`, `typography.css`, `animation.css`) do not exist yet, say the style was never aligned and stop here: there is nothing to compare.

## 2. Design sync (only if `.sb-context/design-source.md` exists)

```bash
node "${CLAUDE_SKILL_DIR}/../align/scripts/sync-values.mjs" --check
```

| Exit | Meaning | Report |
| --- | --- | --- |
| 0 | the style matches the snapshot | in sync, with the snapshot's design name and version |
| 10 | **drift** | the tokens that differ; next step: the sync flow of `/sb-design:align` |
| 3 | no snapshot, or no aligned style | which of the two is missing |
| 4 | the role mapping of the design is not confirmed | next step: the mapping step of `/sb-design:align` |

This compares with the snapshot **on disk**. Whether the design changed on Claude is not checked here: `/sb-design:extract-style` re-reads it.

## 3. Report

One short block: structure (aligned yes/no, prefix, failing checks), design sync (exit code and meaning, or "no snapshot"), and the next step if any. Nothing else is run.
