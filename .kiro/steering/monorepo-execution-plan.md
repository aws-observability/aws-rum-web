# Monorepo Conversion — Execution Plan (Revised)

Step-by-step tasks derived from the [monorepo plan](./monorepo-plan.md). Each task is a single commit.

---

## Phase 0: Close test coverage gaps (COMPLETED)

✅ Added FetchHttpHandler tests (68% → 98%) ✅ Added request-timeout tests (50% → 100%)

---

## Phase 1: Monorepo Restructure (File Moves Only)

**Goal**: Convert to monorepo with zero code changes to source files. Bundle size must remain identical.

**Pre-existing state**: Commits `75f4c91` through `04d27a4` added `src/dispatch/types.ts`, `src/dispatch/buildQueryString.ts`, and migrated `BeaconHttpHandler.ts` and `RetryHttpHandler.ts` to local types. These changes are carried forward as-is — they don't affect the restructure.

### Task 1.1 — Set up workspace root

Convert root `package.json` to monorepo workspace root. Create Lerna config.

Files changed:

-   **Modified**: `package.json` — add `"private": true`, `"workspaces": ["packages/*"]`; move non-root scripts/deps to packages
-   **New**: `lerna.json`
-   **Modified**: `tsconfig.json` — becomes shared base config, add `paths` for workspace packages

### Task 1.2 — Create packages/core

Move all source and test files into `packages/core/`. No code changes — just file moves.

```
packages/core/
├── src/           ← entire current src/ directory
├── package.json   ← name: "@aws-rum-web/core", all current runtime deps
└── tsconfig.json  ← extends root
```

Files changed:

-   **Moved**: `src/` → `packages/core/src/`
-   **New**: `packages/core/package.json`
-   **New**: `packages/core/tsconfig.json`
-   **New**: `packages/core/src/index.ts` — exports public API

### Task 1.3 — Create packages/aws-rum-web

Create thin wrapper that re-exports core. Move webpack configs here.

```
packages/aws-rum-web/
├── src/
│   ├── index.ts          ← re-exports from @aws-rum-web/core
│   └── index-browser.ts  ← re-exports CDN entry from @aws-rum-web/core
├── webpack/              ← moved from root
├── package.json          ← name: "aws-rum-web", deps: @aws-rum-web/core
└── tsconfig.json
```

Files changed:

-   **New**: `packages/aws-rum-web/src/index.ts`
-   **New**: `packages/aws-rum-web/src/index-browser.ts`
-   **New**: `packages/aws-rum-web/package.json`
-   **New**: `packages/aws-rum-web/tsconfig.json`
-   **Moved**: `webpack/` → `packages/aws-rum-web/webpack/`
-   **Modified**: webpack config entry points to reference local `src/index-browser.ts`

### Task 1.4 — Update test and build configuration

Configure Jest to work with workspace packages. Update ESLint, Prettier configs.

Files changed:

-   **Modified**: `jest.config.js` — add `moduleNameMapper` for `@aws-rum-web/core`
-   **Modified**: root `package.json` scripts — `"test": "lerna run test"`, `"build": "lerna run build"`

### Task 1.5 — Validate Phase 1

Run full validation:

```bash
npm install                    # Workspace linking
npm ls @aws-rum-web/core       # Verify symlink
npm test                       # All tests pass
npm run build                  # cwr.js produced
```

Validation checklist:

-   [ ] `npm install` succeeds
-   [ ] `npm ls @aws-rum-web/core` shows workspace symlink
-   [ ] All tests pass (same count as before restructure)
-   [ ] `cwr.js` builds successfully
-   [ ] Bundle size is ~157KB / ~44KB gzipped (identical to before)
-   [ ] `npm run lint` — no new errors

---

## Phase 2: Extract Slim Distribution (TBD)

Approach to be determined after Phase 1 is validated and stable.

### Possible tasks (not finalized):

-   Create `packages/slim/` with unsigned-only dispatch
-   Refactor auth to be optional in core (or extract to separate package)
-   Wire `aws-rum-web` to depend on slim + add auth
-   Build `cwr-slim.js` via webpack
-   Validate slim bundle is ~18-22KB gzipped with zero `@smithy/*` / `@aws-crypto/*` code

### Open decisions:

1. How to make auth optional: separate package, feature flag, or stub implementations?
2. Where does `signing.ts` live: in core (with optional import) or in a separate auth package?
3. Does `aws-rum-web` depend on slim, or do both depend on core independently?

---

## Phase 3: Publish and Document

### Task 3.1 — Documentation

-   Update `README.md` with monorepo structure
-   Create `packages/aws-rum-slim/README.md` — proxy-only usage guide
-   Update `docs/npm_installation.md` — add slim install option
-   Update `docs/cdn_installation.md` — add `cwr-slim.js` CDN option

### Task 3.2 — CI/CD

-   Update GitHub Actions to build all packages
-   Configure npm publish for all public packages
-   Lerna publish with fixed versioning

### Task 3.3 — Publish and close issue #507

---

## Dependency between tasks

```
Phase 0 (done) → Phase 1: 1.1 → 1.2 → 1.3 → 1.4 → 1.5
                 Phase 2: TBD (after Phase 1 validated)
                 Phase 3: 3.1 → 3.2 → 3.3 (after Phase 2)
```

## Risk checkpoints

| After task | Check |
| --- | --- |
| 1.2 | Core package has all source files, no files left in root `src/` |
| 1.3 | Webpack entry points resolve correctly through the re-export layer |
| 1.5 | Full regression. Bundle size identical. All tests pass. If anything broke, fix before Phase 2. |
