# core

What every plugin of the marketplace shares: the project helpers (`lib/`), the scripts more than one plugin runs (`scripts/`) and the references they read (`references/`).

A plugin installed from the marketplace is copied alone into Claude Code's cache and cannot read files outside its own folder, so each plugin carries a copy of this folder as `plugins/<plugin>/core/`.

- **Edit only `core/`** at the repo root, then run `node scripts/sync-core.mjs`.
- The copies under `plugins/*/core/` are generated: never edit them by hand. The test suite fails when a copy differs from `core/`.
- A skill reaches the copy of its own plugin: `${CLAUDE_SKILL_DIR}/../../core/scripts/project-settings.mjs`.
