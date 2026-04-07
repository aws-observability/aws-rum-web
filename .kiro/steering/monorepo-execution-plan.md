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

## Phase 2a: Move Orchestration to aws-rum-web (COMPLETED)

**Goal**: Core becomes shared primitives only. Orchestration, config handling, and CDN entry move to `aws-rum-web`.

✅ Task 2a.1 — Extracted config types into `packages/core/src/orchestration/config.ts` ✅ Task 2a.2 — Moved Orchestration, CommandQueue, index-browser, remote-config to aws-rum-web ✅ Task 2a.3 — Validated: 618 tests pass, 39 suites, bundle 159KB / 44KB gzip, 0 lint errors

---

## Phase 2b: Extract Slim Distribution (COMPLETED)

**Goal**: Create `aws-rum-slim` — a distribution without auth/signing dependencies (~30KB gzip vs current 44KB, or ~21KB gzip if ua-parser also excluded).

**Approach**: Dependency injection. Remove static auth imports from `Dispatch.ts` and `DataPlaneClient.ts`. Distribution packages inject (or don't inject) auth at the orchestration layer.

**Auth dependency chain severed:**

```
Dispatch.ts ──static import──> BasicAuthentication, EnhancedAuthentication  ← REMOVED
DataPlaneClient.ts ──static import──> SignatureV4, Sha256                   ← EXTRACTED
```

✅ Task 2b.1 — Made Dispatch auth-agnostic via `CognitoCredentialProviderFactory` DI. Removed `BasicAuthentication`/`EnhancedAuthentication` static imports. `aws-rum-web` Orchestration injects the factory.

Files changed:

-   **Modified**: `packages/core/src/dispatch/Dispatch.ts` — removed auth imports; added `CognitoCredentialProviderFactory` and `SigningConfigFactory` types; `setCognitoCredentials()` delegates to injected factory
-   **Modified**: `packages/aws-rum-web/src/orchestration/Orchestration.ts` — injects cognito factory using `BasicAuthentication`/`EnhancedAuthentication`
-   **Modified**: `packages/core/src/dispatch/__tests__/Dispatch.test.ts` — replaced auth class mocks with `mockCognitoFactory`
-   **Modified**: `packages/aws-rum-web/src/orchestration/__tests__/Orchestration.test.ts` — added `setCognitoCredentialProviderFactory` and `setSigningConfigFactory` to Dispatch mock
-   **Modified**: `packages/core/src/index.ts` — exports `CognitoCredentialProviderFactory`, `SigningConfigFactory`, `SigningConfig`

✅ Task 2b.2 — Extracted signing from DataPlaneClient via `SigningConfig` DI. Core sends unsigned requests only. `aws-rum-web` provides signing via `createSigningConfig()`.

Files changed:

-   **Modified**: `packages/core/src/dispatch/DataPlaneClient.ts` — removed `SignatureV4`, `Sha256`, `@smithy/util-hex-encoding` imports; accepts optional `SigningConfig` via constructor
-   **New**: `packages/aws-rum-web/src/dispatch/signing.ts` — `createSigningConfig()` using `SignatureV4`/`Sha256`
-   **Modified**: `packages/aws-rum-web/src/orchestration/Orchestration.ts` — injects `createSigningConfig` via `dispatch.setSigningConfigFactory()`
-   **Modified**: `packages/core/src/dispatch/__tests__/DataPlaneClient.test.ts` — creates `SigningConfig` explicitly in tests
-   **Modified**: `packages/core/src/dispatch/__tests__/BeaconHttpHandler.test.ts` — passes `SigningConfig` to `DataPlaneClient`

✅ Task 2b.3 — Created `aws-rum-slim` package with no auth/signing injection.

Files created:

-   `packages/aws-rum-slim/package.json` — deps: `@aws-rum-web/core` only
-   `packages/aws-rum-slim/tsconfig.json`, `tsconfig.es.json`, `tsconfig.cjs.json`
-   `packages/aws-rum-slim/src/index.ts` — same public API minus `setAwsCredentials`
-   `packages/aws-rum-slim/src/index-browser.ts` — CDN entry → `cwr-slim.js`
-   `packages/aws-rum-slim/src/CommandQueue.ts` — no `setAwsCredentials`, forces `signing: false`
-   `packages/aws-rum-slim/src/orchestration/Orchestration.ts` — no auth/signing injection
-   `packages/aws-rum-slim/webpack/webpack.common.js`, `webpack.prod.js` — produces `cwr-slim.js`

✅ Task 2b.4 — Validated:

| Check | Result |
| --- | --- |
| `npm install` succeeds | ✅ |
| `npm ls @aws-rum-web/core` shows workspace symlinks | ✅ core, aws-rum-web, aws-rum-slim all linked |
| All existing tests pass | ✅ 618 tests, 39 suites |
| `cwr.js` bundle size | 157KB / 43KB gzip |
| `cwr-slim.js` bundle size | 113KB / 33KB gzip (−24% gzip) |
| Auth/signing strings in slim bundle | ✅ 0 matches |
| Auth/signing strings in full bundle | ✅ present |
| `npm run lint` | ✅ 0 errors (884 pre-existing warnings) |

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
                 Phase 2a (done): 2a.1 → 2a.2 → 2a.3
                 Phase 2b (done): 2b.1 → 2b.2 → 2b.3 → 2b.4
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
| 2b.1 | Dispatch.ts has zero imports from BasicAuthentication/EnhancedAuthentication. All tests pass. Bundle unchanged. |
| 2b.2 | Core DataPlaneClient has zero imports from @smithy/signature-v4 or @aws-crypto. Signing tests in aws-rum-web. |
| 2b.3 | `cwr-slim.js` builds. No auth/signing modules in slim bundle. |
| 2b.4 | Full regression. Both bundles correct size. All tests pass. |
