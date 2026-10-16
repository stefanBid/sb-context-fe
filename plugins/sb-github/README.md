# sb-github

The GitHub side of a project, through the GitHub CLI (`gh`, logged in). Part of the [sb-context-fe](../../README.md) marketplace; installs `sb-core` with it.

| Skill | What it does |
| --- | --- |
| `/sb-github:admin` | Connects to the repo with a read-only audit, then settings, rulesets, security features, labels, pull requests into `main`, release-please checks. Every write to the remote asks first |
| `/sb-github:checks` | Adds the PR title lint that release-please depends on, through a branch and a PR, then makes it a required check |

```
/plugin install sb-github@sb-context-fe
```

Full guide: [README of the marketplace](../../README.md#skill-reference-sb-github).
