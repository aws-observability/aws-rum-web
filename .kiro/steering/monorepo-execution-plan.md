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

## Phase 2a: Move Orchestration to aws-rum-web

**Goal**: Core becomes shared primitives only. Orchestration, config handling, and CDN entry move to `aws-rum-web`.

**Problem**: `Orchestration.ts` defines both the orchestrator class AND shared types (`Config`, `PartialConfig`, `CookieAttributes`, `CompressionStrategy`, `PageIdFormatEnum`, `TelemetryEnum`). These types are imported by 15+ files across dispatch, event-cache, sessions, plugins, and utils. The class can move; the types must stay in core.

### Task 2a.1 — Extract config types from Orchestration.ts

Extract shared types into `packages/core/src/orchestration/config.ts`. Update all internal imports. `Orchestration.ts` re-exports from `config.ts` for backward compat.

New file `packages/core/src/orchestration/config.ts` gets:
- `Config`, `PartialConfig` interfaces
- `CookieAttributes`, `PartialCookieAttributes` types
- `CompressionStrategy` type
- `TelemetryEnum`, `PageIdFormatEnum` enums
- `Telemetry`, `PageIdFormat` type aliases
- `defaultConfig()`, `defaultCookieAttributes()` functions
- `INSTALL_MODULE` constant usage (or import)

Files importing `Config` etc. from `../orchestration/Orchestration` update to `../orchestration/config`:
- `dispatch/Authentication.ts`, `BasicAuthentication.ts`, `EnhancedAuthentication.ts`, `Dispatch.ts`, `DataPlaneClient.ts`, `CognitoIdentityClient.ts`
- `event-cache/EventCache.ts`
- `sessions/SessionManager.ts`, `PageManager.ts`, `VirtualPageLoadTimer.ts`
- `plugins/types.ts`, `plugins/event-plugins/PageViewPlugin.ts`
- `utils/cookies-utils.ts`
- `test-utils/test-utils.ts`, `test-utils/mock-remote-config.ts`
- All corresponding test files

### Task 2a.2 — Move orchestration + CDN entry to aws-rum-web

Move these files from `packages/core/src/` → `packages/aws-rum-web/src/`:
- `orchestration/Orchestration.ts` + `orchestration/__tests__/`
- `CommandQueue.ts` + `__tests__/CommandQueue.test.ts`
- `index-browser.ts`
- `remote-config/` (depends on CommandQueue types)

Rewrite imports in moved files to use `@aws-rum-web/core/...` deep paths.

Update core's `index.ts` barrel: remove Orchestration re-exports, export config types + primitives.
Update `aws-rum-web`'s `index.ts`: export Orchestration as `AwsRum`, config types, plus re-export core primitives.

Update webpack entry: point to local `src/index-browser.ts` (now in aws-rum-web).
Update jest config: test both `packages/core/src/**/__tests__/**` and `packages/aws-rum-web/src/**/__tests__/**`.
Update tsconfig.webpack.json: include aws-rum-web's `index-browser.ts`.

### Task 2a.3 — Validate Phase 2a

```bash
npm install
npm test                       # All 618 tests pass
npm run build                  # cwr.js produced
```

Validation checklist:
- [ ] All tests pass (same count)
- [ ] Bundle size unchanged (~159KB / ~44KB gzip)
- [ ] `npm run lint` — no new errors
- [ ] Core has no orchestration/CommandQueue/index-browser files
- [ ] aws-rum-web owns orchestration, CDN entry, remote-config

---

## Phase 2b: Extract Slim Distribution

**Goal**: Create `aws-rum-slim` — a distribution without auth/signing heavy dependencies.

Approach to be determined after Phase 2a is validated. Requires analysis of heavy modules (auth, ua-parser, rrweb, Smithy/crypto deps) and surgical removal.

### Open decisions:

1. Which heavy modules to exclude from slim (auth, ua-parser-js, rrweb, @smithy/*, @aws-crypto/*?)
2. How to make auth optional: separate package, feature flag, or stub implementations?
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
Phase 0 (done) → Phase 1 (done): 1.1 → 1.2 → 1.3 → 1.4 → 1.5
                 Phase 2a: 2a.1 → 2a.2 → 2a.3
                 Phase 2b: TBD (after Phase 2a validated)
                 Phase 3: 3.1 → 3.2 → 3.3 (after Phase 2b)
```

## Risk checkpoints

| After task | Check |
| --- | --- |
| 1.2 | Core package has all source files, no files left in root `src/` |
| 1.3 | Webpack entry points resolve correctly through the re-export layer |
| 1.5 | Full regression. Bundle size identical. All tests pass. If anything broke, fix before Phase 2. |
| 2a.1 | All tests pass. No file imports from `orchestration/Orchestration` for types — only from `orchestration/config`. |
| 2a.2 | Core has no Orchestration class, CommandQueue, index-browser, or remote-config. aws-rum-web owns them. |
| 2a.3 | Full regression. Bundle size unchanged. All tests pass. |
