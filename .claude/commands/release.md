---
description: Prepare a chore(release) commit + tag for the monorepo using lerna version
argument-hint: '[major|minor|patch|<exact-version>]  (empty = conventional-commits auto-bump)'
---

# /release — monorepo release preparation

Prepare a release commit and tag for `packages/core`, `packages/slim`, and `packages/web` using `lerna version`. This does **not** push — pushing is a separate, explicit step gated by the user's git policy.

`$ARGUMENTS` controls the bump:

-   empty → `lerna version --conventional-commits` decides the bump from commit messages
-   `major` / `minor` / `patch` → force that bump
-   a literal version like `3.1.0` → pin that exact version

## Steps

### 1. Preflight checks

Run these in parallel and abort if any fails:

-   `git status --porcelain` must be empty (clean working tree)
-   Current branch must be `main`: `git rev-parse --abbrev-ref HEAD`
-   Local `main` must be in sync with `origin/main`: `git fetch origin main && git merge-base --is-ancestor $(git rev-parse origin/main) HEAD`
-   No in-flight release tag for HEAD: `git tag --points-at HEAD | grep '^v' && fail`

If any check fails, report which one and stop. Do not attempt to auto-fix.

### 2. Dry run

Run `npx lerna version $ARGUMENTS --conventional-commits --no-push --no-git-tag-version --yes` against a scratch worktree (or with `--dry-run` if supported in the installed lerna version) and surface:

-   Computed new version
-   Which packages will bump
-   A diff preview of `CHANGELOG.md` and `packages/*/CHANGELOG.md`

### 3. Confirm with the user

Show the dry-run summary and ask: "Proceed with the real run?"

Do not proceed without an explicit yes.

### 4. Real run

Run the appropriate script from `package.json`:

-   `npm run version` (auto)
-   `npm run version:major`
-   `npm run version:minor`
-   `npm run version:patch`
-   For a literal version: `npx lerna version $ARGUMENTS --conventional-commits --no-push`

Lerna will:

-   Bump every package in `packages/*` to the new version (forcePublish: "\*")
-   Update interdependency ranges to the exact new version
-   Update root `package.json` version
-   Regenerate `CHANGELOG.md` and each `packages/*/CHANGELOG.md`
-   Create one commit: `chore(release): vX.Y.Z`
-   Create one tag: `vX.Y.Z`

### 5. Report

Show:

-   `git show --stat HEAD` (the release commit)
-   `git tag --points-at HEAD` (the new tag)
-   Reminder that `git push origin main` and `git push origin vX.Y.Z` are required to trigger the CD workflow — but do **not** run them. Per user git policy, pushes require an explicit, separate request.

## Notes

-   Config lives in `lerna.json` under `command.version`. Script-site flags duplicate the intent so the behavior is visible from `package.json`.
-   `allowBranch: ["main"]` in `lerna.json` is a second guard against releasing from a feature branch.
-   If the release needs to be abandoned before pushing, `git reset --hard HEAD~1 && git tag -d vX.Y.Z` will undo it locally — but confirm with the user first (destructive-op policy).
