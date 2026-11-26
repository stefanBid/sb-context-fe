# sb-github

The GitHub side of a project, through the GitHub CLI (`gh`, logged in). Part of the [sb-context-fe](../../README.md) marketplace; installs `sb-core` with it.

| Skill | What it does |
| --- | --- |
| `/sb-github:admin` | Connects to the repo with a read-only audit, then settings, rulesets, security features, labels, pull requests into `main`, release-please checks. Every write to the remote asks first |
| `/sb-github:checks` | Aligns the CI to the standard three workflows (`build-check.yml`, `commitlint.yml`, `release-please.yml`) on any stack, through a branch and a PR, then makes `build` and `commitlint` required checks |

```
/plugin install sb-github@sb-context-fe
```

Full guide: [README of the marketplace](../../README.md#skill-reference-sb-github).
