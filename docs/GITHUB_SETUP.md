# GitHub Setup

Repository: `wrongstory/hangul-ai-editor`

## Current Status

- Local remote `origin` is connected to `https://github.com/wrongstory/hangul-ai-editor.git`.
- `main` has been pushed.
- `dev` has been pushed.
- Local `dev` tracks `origin/dev`.
- GitHub repository default branch is still `main`.

## Required Manual Repository Settings

Change the default branch to `dev`:

1. Open `https://github.com/wrongstory/hangul-ai-editor/settings/branches`.
2. Under Default branch, change `main` to `dev`.
3. Keep `main` as the release branch.

Recommended branch protection after default branch change:

- Protect `dev`.
- Require CI checks before merge.
- Require pull request before merging.
- Protect `main`.
- Allow updates to `main` only from verified release PRs.

## Issue Creation Note

The GitHub connector could read repository metadata and Git push worked, but GitHub Issue creation failed with:

```text
GitHub API error 403: Resource not accessible by integration
```

Until issue-write permission is available, use the issue drafts in `docs/ISSUE_DRAFTS.md`.

