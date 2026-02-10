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

## Phase 2b: Extract Slim Distribution

### Heavy Module Analysis

Bundle: 159KB raw / 44KB gzip (minified). All numbers below measured by stubbing deps and rebuilding with webpack production mode.

**Per-dependency cost (minified):**

| Module group | Pre-minified | Minified | Gzip | Pulled in by |
| --- | --- | --- | --- | --- |
| Auth + signing (deps) | ~126 KiB | 29 KB | 9.6 KB | `DataPlaneClient`, `Authentication` |
| ↳ `@smithy/signature-v4` | 65.5 KiB | — | — | `DataPlaneClient` (request signing) |
| ↳ `@aws-crypto/sha256-js` + tslib | 23.2 KiB | — | — | `DataPlaneClient` (SigV4 hashing) |
| ↳ `@smithy/fetch-http-handler` | 15.3 KiB | — | — | `Authentication` (Cognito HTTP calls) |
| ↳ `@smithy/protocol-http` | 7.2 KiB | — | — | `DataPlaneClient`, `FetchHttpHandler`, `BeaconHttpHandler` |
| ↳ `@smithy/other` + `@aws-sdk/*` | ~15 KiB | — | — | Various Smithy/SDK utilities |
| Auth + signing (app code) | 36.8 KiB | ~15 KB | ~5 KB | `Authentication.ts`, `BasicAuthentication.ts`, `EnhancedAuthentication.ts`, `CognitoIdentityClient.ts`, `StsClient.ts` |
| `ua-parser-js` | 53.7 KiB | 19 KB | 8.4 KB | `NavigationPlugin` (browser/OS detection) |
| `web-vitals` | 24.4 KiB | 10.4 KB | 3.3 KB | `WebVitalsPlugin`, `VisuallyReadySearch` |
| `uuid` | 22.4 KiB | 0.5 KB | 0.2 KB | `Dispatch` (batch IDs) |
| `shimmer` | 2.9 KiB | 1.1 KB | 0.4 KB | `FetchPlugin`, `XhrPlugin` (monkey-patching) |
| `rrweb` | 0 (tree-shaken) | 0 | 0 | `RRWebPlugin` — only in NPM barrel, not CDN entry |

Note: Auth app code (36.8 KiB pre-minified) is currently pulled in unconditionally because `Dispatch.ts` statically imports `BasicAuthentication`/`EnhancedAuthentication`. Phase 2b.1 severs these imports so the app code is also tree-shaken.

**Pre-minified app code by directory (231 KiB total → 98 KB minified / 22 KB gzip):**

| Directory | Pre-minified | Notes |
| --- | --- | --- |
| `dispatch/` | 81.8 KiB | 36.8 KiB is auth app code (removed in slim) |
| `plugins/event-plugins/` | 54.7 KiB | All 10 built-in plugins |
| `sessions/` | 25.3 KiB | SessionManager, PageManager, VirtualPageLoadTimer |
| `plugins/other` | 17.4 KiB | InternalPlugin, PluginManager, http-utils |
| `orchestration/` | 14.8 KiB | Orchestration + config |
| `event-cache/` | 11.5 KiB | EventCache |
| `utils/` | 11.3 KiB | Shared utilities |
| `root` | 9.5 KiB | CommandQueue, index-browser |
| `remote-config/` | 4.9 KiB | Remote config fetching |

### Bundle Size Scenarios

Assumes full decoupling of auth app code + third-party deps (Phase 2b complete):

| Scenario                               | Raw     | Gzip   | Savings vs full |
| -------------------------------------- | ------- | ------ | --------------- |
| Full (`cwr.js`) — current              | 159 KB  | 44 KB  | —               |
| No auth/signing (deps + app code)      | ~115 KB | ~30 KB | −14 KB gz       |
| No auth + no ua-parser                 | ~96 KB  | ~21 KB | −23 KB gz       |
| No auth + no ua-parser + no web-vitals | ~86 KB  | ~18 KB | −26 KB gz       |
| Bare minimum (app code + uuid only)    | ~84 KB  | ~17 KB | −27 KB gz       |

Note: `uuid` (0.2 KB gz) and `shimmer` (0.4 KB gz) are negligible after minification. `rrweb` is already tree-shaken from the CDN bundle.

Auth dependency chain:

```
Orchestration → Dispatch.setCognitoCredentials()
                  → BasicAuthentication → CognitoIdentityClient → @smithy/fetch-http-handler
                  → EnhancedAuthentication → StsClient → @smithy/fetch-http-handler
                → DataPlaneClient → SignatureV4, Sha256, @smithy/protocol-http
```

**Key problem**: `Dispatch.ts` statically imports `BasicAuthentication` and `EnhancedAuthentication`. Even when `signing: false`, webpack can't tree-shake them. Auth code is pulled in unconditionally.

### Decided Approach: Dependency Injection

**Strategy**: Make auth pluggable via dependency injection. Core's `Dispatch` accepts an optional auth provider instead of statically importing auth classes. Distribution packages inject (or don't inject) auth at the orchestration layer.

Specific changes:

1. **`Dispatch.ts`**: Remove static imports of `BasicAuthentication`/`EnhancedAuthentication`. Change `setCognitoCredentials()` to accept a credential provider factory function instead of constructing auth internally.

2. **`DataPlaneClient.ts`**: Split into two variants:

    - Core keeps a `DataPlaneClient` that does NOT import `SignatureV4`/`Sha256` — sends unsigned requests only
    - `aws-rum-web` provides a `SigningDataPlaneClient` (or wraps via `clientBuilder`) that adds signing

3. **`aws-rum-web` Orchestration**: Injects real `BasicAuthentication`/`EnhancedAuthentication` into Dispatch, provides signing `clientBuilder`

4. **`aws-rum-slim` Orchestration**: Never injects auth — those modules never get bundled. Uses unsigned `DataPlaneClient` only.

### Target Structure

```
packages/
├── core/                            @aws-rum-web/core
│   └── src/
│       └── dispatch/
│           ├── Dispatch.ts          Auth-agnostic (DI-based)
│           ├── DataPlaneClient.ts   Unsigned requests only
│           ├── FetchHttpHandler.ts  Kept (no signing deps)
│           ├── BeaconHttpHandler.ts Kept (no signing deps)
│           └── ...
│
├── aws-rum-web/                     aws-rum-web (full distribution)
│   └── src/
│       ├── orchestration/           Injects auth + signing clientBuilder
│       ├── auth/                    Re-exports core auth classes
│       └── signing/                 SigningDataPlaneClient wrapper
│
└── aws-rum-slim/                    aws-rum-slim (new, no auth)
    └── src/
        ├── orchestration/           No auth injection, signing: false
        ├── index.ts
        └── index-browser.ts         CDN entry → cwr-slim.js
```

### Dependency Graph

```
aws-rum-web  → @aws-rum-web/core (+ auth/signing modules from core)
aws-rum-slim → @aws-rum-web/core (no auth modules pulled in)
```

Both distribution packages depend on core independently. `aws-rum-web` does NOT depend on `aws-rum-slim` — this avoids unnecessary coupling and keeps each distribution's webpack tree-shaking independent.

### What Stays in Core vs. Moves

Auth files stay in `packages/core/src/dispatch/` but are NOT imported by core's `Dispatch.ts`:

-   `Authentication.ts`, `BasicAuthentication.ts`, `EnhancedAuthentication.ts`
-   `CognitoIdentityClient.ts`, `StsClient.ts`
-   `SignatureV4` / `Sha256` usage in `DataPlaneClient.ts` (extracted to signing variant)

This means they exist in core's source tree but are only pulled into the bundle when a distribution package explicitly imports them.

## Expected Bundle Sizes

Measured by stubbing heavy dependencies and rebuilding with webpack production mode:

| Distribution | Contents | Raw | Gzip |
| --- | --- | --- | --- |
| `aws-rum-web` (cwr.js) | core + auth + ua-parser | 159KB | 44KB |
| `aws-rum-slim` (cwr-slim.js) — auth only removed | core + ua-parser | ~115KB | ~30KB |
| `aws-rum-slim` (cwr-slim.js) — auth + ua-parser removed | core only | ~96KB | ~21KB |

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
