# aws-rum-web Monorepo Conversion Plan (Revised)

## Problem Statement

[Issue #507](https://github.com/aws-observability/aws-rum-web/issues/507): When using the RUM client with a proxy endpoint (`signing: false`, no `identityPoolId`/`guestRoleArn`), the AWS auth/signing dependencies (`@smithy/signature-v4`, `@aws-crypto/sha256-js`, Cognito/STS clients) are dead weight. A [proof-of-concept](https://github.com/aws-observability/aws-rum-web/commit/f5a8437) showed removing auth code cuts the bundle by more than half.

**Goal**: Create `aws-rum-slim` distribution (~18-22KB gzipped) without auth dependencies, while maintaining backward compatibility for existing `aws-rum-web` users.

## Strategy

**Two-phase approach:**

1. **Phase 1**: Restructure into monorepo (file moves only, zero code changes)
2. **Phase 2**: Extract slim distribution (surgical feature removal)

This avoids premature abstraction and allows independent validation of each step.

## Rejected Solutions

### Using `@aws-sdk/client-rum`

-   Bundle size: 115KB / 37.6KB gzipped (just transport layer)
-   Includes signing that can't be tree-shaken
-   Would make slim build larger than current full build

### Refactoring Before Restructuring (Original Plan)

The original plan created an HttpHandler abstraction seam, migrated files to local types, and extracted signing — all before moving files into a monorepo. This was abandoned because:

1. Refactors code twice (once for abstraction, again for monorepo moves)
2. Harder to validate incrementally — code changes and structural changes interleaved
3. Premature abstraction: we don't know the exact seam until we see what slim needs

**Better approach**: Move files first (pure structural change, easy to validate), then extract features.

### Keeping `@smithy/protocol-http` in Core

-   Core users would need to install Smithy packages even without auth
-   Defeats the purpose of a slim distribution
-   Drift risk is LOW (stable HTTP primitives), but dependency graph would be misleading

## Current State

```
aws-rum-web/                    (single package, single repo)
├── src/
│   ├── index.ts                 NPM entry (AwsRum class)
│   ├── index-browser.ts         CDN entry (CommandQueue)
│   ├── CommandQueue.ts          CDN command interface
│   ├── orchestration/           Orchestration (wires everything)
│   ├── dispatch/                Transport layer
│   │   ├── Dispatch.ts          Dispatch orchestrator
│   │   ├── DataPlaneClient.ts   HTTP + SigV4 signing ← HEAVY
│   │   ├── Authentication.ts    Auth interface
│   │   ├── BasicAuthentication.ts   Cognito basic flow ← HEAVY
│   │   ├── EnhancedAuthentication.ts Cognito enhanced flow ← HEAVY
│   │   ├── CognitoIdentityClient.ts ← HEAVY
│   │   ├── StsClient.ts         ← HEAVY
│   │   ├── FetchHttpHandler.ts  Fetch transport
│   │   ├── BeaconHttpHandler.ts Beacon API (no signing)
│   │   └── compression.ts       Gzip compression
│   ├── event-cache/             Event batching + caching
│   ├── sessions/                Session + page management
│   ├── plugins/                 Plugin system + built-in plugins
│   ├── events/                  Event type definitions
│   ├── utils/                   Shared utilities
│   └── loader/                  CDN loader scripts
├── webpack/                     Webpack configs (dev/prod)
└── package.json                 Single package
```

Bundle: `cwr.js` = 157KB (44KB gzipped)

Note: Some files from an earlier refactoring approach exist (`src/dispatch/types.ts`, `src/dispatch/buildQueryString.ts`, and local type migrations in `BeaconHttpHandler.ts` and `RetryHttpHandler.ts`). These are carried forward as-is into core — they don't affect the restructure.

## Phase 1: Monorepo Restructure (File Moves Only)

### Target Structure

```
aws-rum-web/                         (monorepo root)
├── packages/
│   ├── core/                        @aws-rum-web/core (internal)
│   │   ├── src/                     All current src/ files (unchanged)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── aws-rum-web/                 aws-rum-web (existing package)
│       ├── src/
│       │   ├── index.ts             Re-exports from @aws-rum-web/core
│       │   └── index-browser.ts     Re-exports from @aws-rum-web/core
│       ├── webpack/                 Moved from root
│       ├── package.json             deps: @aws-rum-web/core
│       └── tsconfig.json
│
├── package.json                     Workspace root (private: true)
├── lerna.json                       Fixed versioning
├── tsconfig.json                    Shared base config
└── jest.config.js                   Shared test config
```

### Key Points

-   **Zero code changes**: All source files move to `packages/core/src/` unchanged
-   **Core is internal**: `@aws-rum-web/core` is not published initially — just a workspace package
-   **Testing without publishing**: npm workspaces auto-link packages locally via symlinks
-   **Validation**: Bundle size must be identical, all tests must pass

## Phase 2: Extract Slim Distribution (TBD)

### Target Structure

```
packages/
├── core/                            @aws-rum-web/core
│   └── src/                         Unchanged from Phase 1
│
├── slim/                            aws-rum-slim (new)
│   ├── src/
│   │   ├── index.ts                 Re-exports core, no auth
│   │   └── index-browser.ts         CDN entry
│   ├── webpack/
│   └── package.json                 deps: @aws-rum-web/core
│
└── aws-rum-web/                     aws-rum-web (refactored)
    ├── src/
    │   ├── index.ts                 Re-exports slim + adds auth
    │   └── index-browser.ts         CDN entry
    └── package.json                 deps: aws-rum-slim
```

### Dependency Graph

```
aws-rum-web → aws-rum-slim → @aws-rum-web/core
```

### Approach (Decided in Phase 2)

Options for making auth optional:

1. Separate `@aws-rum-web/auth` package — slim doesn't import it
2. Feature flag in core — slim hardcodes `signing: false`
3. Stub implementations — slim provides no-op auth classes

Decision deferred until Phase 1 is stable.

## Expected Bundle Sizes

| Distribution                 | Contents    | Est. Size (gzip)      |
| ---------------------------- | ----------- | --------------------- |
| `aws-rum-web` (cwr.js)       | core + auth | ~44KB (same as today) |
| `aws-rum-slim` (cwr-slim.js) | core only   | ~18-22KB              |

## Workspace Tooling

| Tool           | Purpose                                      |
| -------------- | -------------------------------------------- |
| npm workspaces | Package linking + hoisted deps               |
| Lerna          | Fixed versioning, publish orchestration      |
| Webpack        | CDN bundle builds (per distribution package) |
| tsc            | NPM builds (ESM + CJS) + type declarations   |

## Versioning

Fixed versioning via Lerna — all packages share one version number. Simplifies compatibility.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Breaking existing imports | `aws-rum-web` re-exports everything, public API unchanged |
| CDN users on `cwr.js` | `cwr.js` continues to be built from `aws-rum-web` |
| Workspace linking issues | Validate with `npm ls` after restructure |
| Test infrastructure complexity | Shared jest config at root with `projects` |
| Version drift between packages | Fixed versioning via Lerna |
