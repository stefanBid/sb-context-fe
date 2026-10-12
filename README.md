# sb-context-nuxt

Personal Claude Code plugin: agent context for Nuxt 4 + Tailwind 4 projects. Kept **outside** project repos — nothing here is ever committed to a project.

| Skill | Purpose |
|---|---|
| `global-style-nuxt` | Analyse/reorganise global style (theme, typography, motion) into `assets/css` |
| `global-style-refactor` | Migrate templates after a global-style change |
| `gh-repo-admin` | `gh` CLI: rulesets, repo settings, PRs, release checks |

Companion plugin (separate): `impeccable@impeccable` for design polish.

## Install

```
/plugin marketplace add stefanBid/sb-context-nuxt
/plugin install sb-context-nuxt@sb-context-nuxt
/plugin marketplace add https://github.com/pbakaus/impeccable.git
/plugin install impeccable@impeccable
```

Update: `/plugin marketplace update sb-context-nuxt`. Pin by keeping `version` in `.claude-plugin/plugin.json` unchanged until you want a release.
