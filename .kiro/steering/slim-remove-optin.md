# Slim Distribution: Remove Opt-in Plugin Logic

## Design Intention

### Problem

`aws-rum-slim` inherits the `telemetries` opt-in system from the full distribution. This system lets users select plugin groups at runtime via string keys:

```ts
config: {
    telemetries: ['errors', 'performance', 'http'];
}
```

The Orchestration maps these strings to plugin constructors through a `telemetryFunctor()` lookup table. This is wrong for slim:

1. **Slim should be minimal by default** — the only essential runtime logic is session management and page views. Everything else (error tracking, performance, HTTP, interaction) should be explicitly opted into by the consumer via `eventPluginsToLoad`.
2. **The functor forces all plugins into the CDN bundle** — even if a user configures `telemetries: ['errors']`, webpack can't tree-shake the other plugin constructors because they're referenced in the functor map. This defeats the purpose of a slim distribution.
3. **Redundant with `eventPluginsToLoad`** — consumers can already pass plugins directly. The string-based telemetry system is a second, less flexible way to do the same thing.
4. **Config surface area** — `telemetries`, `TelemetryEnum`, and `TelemetriesFunctor` are concepts that don't belong in a minimal distribution.

### Decision

Remove the entire `telemetries` opt-in system from `aws-rum-slim`. The slim Orchestration will:

-   Load only `PageViewPlugin` by default (controlled by `disableAutoPageView`)
-   Load any plugins the user passes via `eventPluginsToLoad`
-   Support runtime `addPlugin()` for late additions
-   **Not** import any event plugins (errors, performance, http, interaction) in Orchestration — they are only available as re-exports from `index.ts` for NPM consumers

This means the CDN bundle (`cwr-slim.js`) will **not include** `NavigationPlugin`, `ResourcePlugin`, `WebVitalsPlugin`, `XhrPlugin`, `FetchPlugin`, `DomEventPlugin`, `JsErrorPlugin`, `ua-parser-js`, `web-vitals`, or `shimmer` unless the consumer explicitly imports them.

### What stays

-   `eventPluginsToLoad` config — pass plugins at init time
-   `addPlugin()` method — runtime plugin addition
-   `disableAutoPageView` — controls whether `PageViewPlugin` auto-loads
-   All plugin re-exports from `index.ts` — NPM consumers can still `import { FetchPlugin } from 'aws-rum-slim'`
-   `PageViewPlugin` — the only built-in plugin loaded by default

### What's removed

-   `telemetries` config field
-   `TelemetryEnum` enum and export
-   `Telemetry` type export
-   `TelemetriesFunctor` interface
-   `constructBuiltinPlugins()` method
-   `telemetryFunctor()` method
-   All plugin imports from slim Orchestration (NavigationPlugin, ResourcePlugin, WebVitalsPlugin, XhrPlugin, FetchPlugin, DomEventPlugin, JsErrorPlugin)

### Scope

Only `packages/aws-rum-slim/` is modified. Core and `aws-rum-web` are untouched.

### Estimated bundle impact

Removing the plugin imports from Orchestration means webpack won't bundle them in `cwr-slim.js`:

| Module                | Size in current slim |
| --------------------- | -------------------- |
| `ua-parser-js`        | 19.3 KB              |
| `web-vitals`          | 11.5 KB              |
| `NavigationPlugin`    | 4.9 KB               |
| `XhrPlugin`           | 4.7 KB               |
| `http-utils`          | 3.8 KB               |
| `WebVitalsPlugin`     | 3.2 KB               |
| `FetchPlugin`         | 2.9 KB               |
| `DomEventPlugin`      | 2.3 KB               |
| `ResourcePlugin`      | 1.3 KB               |
| `JsErrorPlugin`       | 1.2 KB               |
| `shimmer`             | 1.4 KB               |
| Functor/enum overhead | ~1 KB                |
| **Total removable**   | **~57 KB raw**       |

Expected slim CDN bundle after: ~54 KB raw / ~15-17 KB gzip (down from 111 KB / 32 KB).

NPM consumers who `import { FetchPlugin } from 'aws-rum-slim'` still get tree-shakeable access to all plugins — their bundler pulls in only what they use.

---

## Execution Plan

### Task S1 — Strip plugin imports and telemetry logic from slim Orchestration

Files changed:

-   **Modified**: `packages/aws-rum-slim/src/orchestration/Orchestration.ts`
    -   Remove imports: `NavigationPlugin`, `ResourcePlugin`, `WebVitalsPlugin`, `XhrPlugin`, `FetchPlugin`, `DomEventPlugin`, `JsErrorPlugin` (and their constants like `DOM_EVENT_PLUGIN_ID`, `JS_ERROR_EVENT_PLUGIN_ID`)
    -   Remove `TelemetriesFunctor` interface
    -   Remove `TelemetryEnum` enum
    -   Remove `constructBuiltinPlugins()` method
    -   Remove `telemetryFunctor()` method
    -   Remove `telemetries` from `defaultConfig`
    -   Simplify `initPluginManager()`: load only `PageViewPlugin` (if enabled) + `eventPluginsToLoad`

### Task S2 — Clean up slim public API exports

Files changed:

-   **Modified**: `packages/aws-rum-slim/src/orchestration/Orchestration.ts` — remove `TelemetryEnum` from exports
-   **Modified**: `packages/aws-rum-slim/src/index.ts` — remove `Telemetry` type and `TelemetryEnum` exports

### Task S3 — Validate

```bash
npm test                    # All existing tests pass
npm run build               # Both bundles build
npm run stats               # Slim bundle dramatically smaller
```

Validation checklist:

-   [ ] All existing tests pass (618)
-   [ ] `cwr-slim.js` builds — expected ~54 KB raw / ~15-17 KB gzip
-   [ ] `cwr.js` unchanged
-   [ ] `PageViewPlugin` still loads by default in slim
-   [ ] `ua-parser-js`, `web-vitals`, `shimmer` absent from slim CDN bundle
-   [ ] NPM entry still re-exports all plugins
-   [ ] `npm run lint` — no new errors

---

## Dependency

```
S1 → S2 → S3
```

All changes are in `packages/aws-rum-slim/` only. No risk to core or full distribution.

---

## Follow-up: Make ua-parser-js optional in core

`ua-parser-js` (19.3 KB / 27% of slim) is imported by `SessionManager` for browser/OS detection. It's always bundled because `SessionManager` is essential infrastructure.

**Approach**: Same DI pattern as Phase 2b auth extraction. Core's `SessionManager` accepts an optional `UserAgentParser` factory. Distribution packages inject (or don't inject) it.

-   `aws-rum-web` injects `ua-parser-js` — full browser/OS metadata in session events
-   `aws-rum-slim` injects nothing — session events omit browser/OS fields (or use `navigator.userAgent` raw string)

**Estimated savings**: −19.3 KB raw / ~−6-8 KB gzip from slim CDN bundle → ~51 KB raw / ~14-16 KB gzip.

Also investigate:

-   `shimmer` (1.4 KB) — imported by `MonkeyPatched` base class, used by `FetchPlugin`/`XhrPlugin`. Not needed if those plugins aren't loaded, but `MonkeyPatched` is imported by `PluginManager`. May need conditional import.
-   `@smithy/protocol-http` (3.2 KB) — imported by `FetchHttpHandler`/`DataPlaneClient`. Could be replaced with plain `Request`/`Response` types for unsigned-only usage.
