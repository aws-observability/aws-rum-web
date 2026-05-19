---
description: Prepare a chore(release) commit + tag for the monorepo using lerna version
argument-hint: '[major|minor|patch|<exact-version>]  (empty = conventional-commits auto-bump)'
---

# /release — monorepo release preparation

Prepare a release commit and tag for `packages/core`, `packages/slim`, and `packages/web` using `lerna version`. This does **not** push — pushing is a separate, explicit step gated by the user's git policy.

The output is a **single squashed commit** `chore(release): vX.Y.Z` with the tag `vX.Y.Z` pointing at it. Lerna alone is not enough — see step 4.

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

### 2. Determine the new version

Do **not** run `npx lerna version --no-git-tag-version` to preview — it mutates the working tree AND triggers the `version` npm script, which re-invokes lerna interactively. Avoid it.

Instead, derive the new version from `$ARGUMENTS` plus the current `lerna.json` version:

-   Read current version: `node -p "require('./lerna.json').version"`
-   `$ARGUMENTS` empty → run `npx conventional-recommended-bump -p angular` to predict, OR ask the user to pass an explicit bump
-   `major` / `minor` / `patch` → semver-bump from the current version
-   literal → use as-is

Show the predicted new version and ask: "Proceed with bumping to vX.Y.Z?"

Do not proceed without an explicit yes.

### 3. Run lerna version

Run the appropriate script from `package.json`:

-   `npm run version` (auto)
-   `npm run version:major`
-   `npm run version:minor`
-   `npm run version:patch`
-   For a literal version: `npx lerna version $ARGUMENTS --conventional-commits --no-push`

Lerna will:

-   Bump every package in `packages/*` to the new version (`forcePublish: "*"`)
-   Update interdependency ranges to the exact new version
-   Regenerate `CHANGELOG.md` (root) and each `packages/*/CHANGELOG.md`
-   Update `lerna.json` version
-   Create one commit: `chore(release): vX.Y.Z`
-   Create one tag: `vX.Y.Z`

**Lerna does NOT update:**

-   Root `package.json` version (the monorepo workspace root) — `forcePublish: "*"` only matches `packages/*`
-   `packages/core/src/utils/version.ts` — exports `WEB_CLIENT_VERSION` as a hardcoded string literal, emitted as `aws:clientVersion` on every RUM event
-   `packages/core/__tests__/utils/version.test.ts` — asserts the literal version string

These must be updated by hand in step 4 before squashing.

### 4. Add the missing bumps and squash into a single commit

After lerna's commit, the working tree will be clean but `WEB_CLIENT_VERSION`, root `package.json`, and the version test will still be at the **old** version. Without this step, the published bundle would emit the wrong `aws:clientVersion`.

1. Edit `package.json` (the monorepo root): set `"version"` to `vX.Y.Z`.
2. Edit `packages/core/src/utils/version.ts`: set `WEB_CLIENT_VERSION = 'X.Y.Z'`.
3. Edit `packages/core/__tests__/utils/version.test.ts`: update the `expect(WEB_CLIENT_VERSION).toEqual('X.Y.Z')` assertion to the new version.
4. Run the version + EventCache tests to confirm:
    ```
    npx jest -c jest.unit.config.js packages/core/__tests__/utils/version.test.ts packages/core/__tests__/event-cache/EventCache.test.ts --coverage=false
    ```
5. Squash everything into the existing release commit:
    ```
    git reset --soft HEAD~1     # un-commit lerna's release commit, keep changes staged
    git add package.json packages/core/src/utils/version.ts packages/core/__tests__/utils/version.test.ts
    git commit -m "chore(release): vX.Y.Z"
    git tag -f vX.Y.Z           # move tag to the new squashed commit
    ```

The result is a single commit containing all 11 release files (lerna bumps + 3 hand edits) and the tag pointing at it.

### 5. Verify

Run the full unit test suite to confirm the squashed commit is healthy:

```
npm test
```

All test suites should pass.

### 6. Report

Show:

-   `git show --stat HEAD` (the squashed release commit — should be 11 files)
-   `git show --no-patch --format="%H %s" vX.Y.Z` (tag points at the squashed commit)
-   Reminder that `git push origin main` and `git push origin vX.Y.Z` are required to trigger the CD workflow — but do **not** run them. Per user git policy, pushes require an explicit, separate request.

## Notes

-   Config lives in `lerna.json` under `command.version`. Script-site flags duplicate the intent so the behavior is visible from `package.json`.
-   `allowBranch: ["main"]` in `lerna.json` is a second guard against releasing from a feature branch.
-   If the release needs to be abandoned before pushing, `git reset --hard HEAD~1 && git tag -d vX.Y.Z` will undo it locally — but confirm with the user first (destructive-op policy).
-   **Long-term fix to remove step 4:** add a lerna `version` lifecycle script (or postversion hook) that derives `WEB_CLIENT_VERSION` and root `package.json` from the new package version automatically, and rewrite the version test to import from `packages/core/package.json` so it doesn't need hand-editing. Once that lands, this skill can drop step 4 entirely.
