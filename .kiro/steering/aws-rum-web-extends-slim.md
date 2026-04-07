# aws-rum-web extends slim Orchestration

## Problem

`aws-rum-web` and `@aws-rum-web/slim` have nearly identical Orchestration classes with duplicated logic. `userAgentProvider` is exposed on customer-facing config but shouldn't be — `ua-parser-js` is being removed from both distributions. The two packages should share a single base class.

## Decision

1. Remove `userAgentProvider` from `Config`. `SessionManager` calls `userAgentDataProvider()` directly. Remove `ua-parser-js` from `aws-rum-web`.
2. Slim's Orchestration becomes the base class (template method pattern). `aws-rum-web` extends it.
3. Slim supports opt-in auth via runtime methods (`setAwsCredentials`, `setSigningConfigFactory`). CDN slim bundle does NOT include auth deps.
4. `signing` config only exists in `aws-rum-web`. Slim defaults to unsigned; NPM consumers opt in via runtime methods.

## Architecture

```
slim Orchestration (base class)
├── protected: pluginManager, eventCache, dispatchManager, config, eventBus
├── constructor: config merge → initDispatch() → initPluginManager() → enable/disable
├── protected initDispatch(): creates unsigned Dispatch
├── protected initPluginManager(): PageViewPlugin + eventPluginsToLoad
├── public: shared methods + setAwsCredentials + setSigningConfigFactory
│
aws-rum-web Orchestration extends slim
├── overrides initDispatch(): super + signing + cognito injection
├── overrides initPluginManager(): super + telemetry functor plugins
├── private: telemetryFunctor(), constructBuiltinPlugins()
├── config: slim defaults + { signing: true }
├── keeps: remote-config (in CommandQueue)
```

## Execution Plan

### Task 1 — Remove `userAgentProvider` from Config and SessionManager

Remove the DI mechanism. `SessionManager.collectAttributes()` calls `userAgentDataProvider()` directly. Remove `ua-parser-js` from `aws-rum-web`.

Files changed:

-   **Modified**: `packages/core/src/orchestration/config.ts` — remove `userAgentProvider` from `Config`
-   **Modified**: `packages/core/src/sessions/SessionManager.ts` — import and call `userAgentDataProvider` directly
-   **Modified**: `packages/core/src/index.ts` — remove `UserAgentDetails` and `userAgentDataProvider` from public exports
-   **Modified**: `packages/aws-rum-web/src/orchestration/config.ts` — remove `uaParserProvider`, `ua-parser-js` import, `UserAgentDetails` re-export, `userAgentProvider` from `defaultConfig`
-   **Modified**: `packages/aws-rum-web/src/orchestration/Orchestration.ts` — remove `UserAgentDetails` re-export
-   **Modified**: `packages/aws-rum-slim/src/orchestration/Orchestration.ts` — remove `userAgentDataProvider` import, `userAgentProvider` from `defaultConfig`
-   **Modified**: `packages/aws-rum-web/package.json` — remove `ua-parser-js` dependency
-   **Modified**: `packages/core/src/sessions/__tests__/SessionManager.test.ts` — mock `userAgentDataProvider` instead of injecting via config

### Task 2 — Refactor slim Orchestration for extensibility

Change private → protected. Extract template methods.

Files changed:

-   **Modified**: `packages/aws-rum-slim/src/orchestration/Orchestration.ts`:
    -   `private` → `protected` for: `pluginManager`, `eventCache`, `dispatchManager`, `config`, `eventBus`
    -   Extract Dispatch creation into `protected initDispatch(region, applicationId): Dispatch`
    -   Make `initPluginManager` protected (currently private)
    -   Add `public setAwsCredentials()` → delegates to `this.dispatchManager.setAwsCredentials()`
    -   Add `public setSigningConfigFactory()` → delegates to `this.dispatchManager.setSigningConfigFactory()`

### Task 3 — Make `aws-rum-web` Orchestration extend slim

Files changed:

-   **Modified**: `packages/aws-rum-web/src/orchestration/Orchestration.ts` — rewrite as subclass of slim's Orchestration:
    -   Override `initDispatch()`: call super, inject signing config factory + cognito factory + credentials
    -   Override `initPluginManager()`: call super, add telemetry functor plugins
    -   Constructor: merge slim defaults with `signing: true`, call `super()`
    -   Keep `telemetryFunctor()`, `constructBuiltinPlugins()` as private
-   **Modified**: `packages/aws-rum-web/src/orchestration/config.ts` — remove `defaultConfig`. Keep `TelemetryEnum`, `PageIdFormatEnum`, type re-exports.
-   **Modified**: `packages/aws-rum-web/package.json` — add `@aws-rum-web/slim` as workspace dependency

### Task 4 — Make `aws-rum-web` CommandQueue extend slim's

Files changed:

-   **Modified**: `packages/aws-rum-slim/src/CommandQueue.ts` — `private` → `protected` for `orchestration`, `commandHandlerMap`, `initCwr`
-   **Modified**: `packages/aws-rum-web/src/CommandQueue.ts` — rewrite as subclass: adds `setAwsCredentials` handler, overrides `initCwr` for remote-config

### Task 5 — Update design docs

Files changed:

-   **Modified**: `docs/design-3.0.md` — remove `userAgentProvider` DI section, update DI table, update architecture
-   **Modified**: `.kiro/steering/slim-remove-ua-parser.md` — remove customer-overridable `userAgentProvider` references

### Task 6 — Validate

-   [ ] All existing tests pass
-   [ ] Both bundles build
-   [ ] `cwr.js` size decreases (ua-parser-js removed)
-   [ ] `cwr-slim.js` size unchanged
-   [ ] `ua-parser-js` absent from both bundles
-   [ ] Auth/signing in `cwr.js`, absent from `cwr-slim.js`
-   [ ] `npm run lint` — no new errors

## Dependency

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6
```
