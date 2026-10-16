# Changelog

## 1.0.0 (2026-10-16)


### ⚠ BREAKING CHANGES

* skills are now `/plugin:skill` with shorter names (`/sb-design:align`, `/sb-health:deps`…), `.sb-context-nuxt/` becomes `.sb-context/` (`settings.json`, `github.json`), and the scripts refuse a project still on 0.x until `/sb-core:migration` runs.

### Features

* split sb-context-nuxt into the sb-context-fe marketplace ([#44](https://github.com/stefanBid/sb-context-fe/issues/44)) ([27c87b9](https://github.com/stefanBid/sb-context-fe/commit/27c87b90ae731059cde7332e180da9bf2dd39be0))
