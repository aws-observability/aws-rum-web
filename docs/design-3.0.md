# RUM Web Client 3.0: Slim Distribution

---

# Part 1: Overview

## What We Did

We built a lightweight version of the CloudWatch RUM web client called `@aws-rum-web/slim`. It's 71% smaller than the current client — just 12 KB over the wire, down from 42 KB.

The existing `aws-rum-web` package continues to work exactly as before. Nothing breaks for current customers. This is a new option for customers who don't need the full feature set.

## Why It Matters

Every kilobyte of JavaScript a customer adds to their page costs them load time. Our RUM client is supposed to measure performance — it shouldn't hurt it.

Many customers use a proxy endpoint to send RUM data. They don't need Cognito authentication or request signing. But today, those features are baked in and can't be removed. Customers pay the download cost whether they use them or not.

This has been one of the most requested changes on our GitHub repo:

-   [#305](https://github.com/aws-observability/aws-rum-web/issues/305) asked why RUM requires Cognito auth at all — it should be fire-and-forget. The slim distribution answers this.
-   [#507](https://github.com/aws-observability/aws-rum-web/issues/507) requested a slim build without auth dependencies for proxy-endpoint users. This drove the monorepo + slim distribution work.
-   [#294](https://github.com/aws-observability/aws-rum-web/issues/294) called out `ua-parser-js` (~6 KB gzip) as too heavy for embedding RUM in a library with a strict performance budget.
-   [#546](https://github.com/aws-observability/aws-rum-web/issues/546) reported deprecated `@aws-sdk/*` dependencies. The 3.0 monorepo migrates to `@smithy/*`, and slim doesn't ship them at all.

## The Numbers

### Package Size: Slim is 71% smaller than 2.0

|                         | Download size (gzip) | Parse size (raw JS) |
| ----------------------- | -------------------- | ------------------- |
| `aws-rum-web` 2.x       | 42 KB                | 154 KB              |
| `aws-rum-web` 3.0       | 32 KB                | 132 KB              |
| `@aws-rum-web/slim` 3.0 | **12 KB**            | **47 KB**           |

1. The slim client is 71% smaller to download and 70% less JavaScript for the browser to parse.
2. The full client also shrank by 22 KB raw (ua-parser-js removed).

### Payload size: 87% smaller metadata per request

In 2.x, if you sent 100 events in one batch, the same browser/OS/domain info was copied into all 100 events. In 3.0, that shared info is sent just once per batch — cutting repeated metadata by 87%.

```
2.x:  100 events × 313 chars each  =  30.6 KB of metadata
3.0:  234 chars once + 100 × 55    =   5.8 KB of metadata
                                       ─────
                                       87% less
```

Details in [Part 2 § Breaking Changes](#2-event-metadata-split-payload-level-vs-event-level).

## How We Compare to Competitors

All sizes measured with esbuild (minified + gzip), February 2026. "Full" = all features exported. "Slim/Minimal" = smallest available configuration.

| Vendor | Package | Full (raw / gzip) | Slim/Minimal (raw / gzip) | Slim offering |
| --- | --- | --- | --- | --- |
| **AWS CloudWatch RUM v3** | `aws-rum-web` 3.0 | 132.0 / 32.1 KB | 46.6 / 12.1 KB ✅ | `@aws-rum-web/slim` — no auth/signing, opt-in plugins |
| **AWS CloudWatch RUM v2** | `aws-rum-web` 2.x | 154.1 / 42.5 KB | — | No slim variant |
| Datadog | `@datadog/browser-rum` 6.26 | 197.7 / 69.1 KB | 128.9 / 45.5 KB | `@datadog/browser-rum-slim` — no Session Replay |
| Elastic | `@elastic/apm-rum` 5.17 | 66.7 / 22.6 KB | — | No slim variant (already small) |
| Grafana Faro | `@grafana/faro-web-sdk` | 89.3 / 31.7 KB | 86.6 / 30.7 KB | Tree-shakeable, but minimal savings |
| Sentry | `@sentry/browser` 10.38 | 404.0 / 134.6 KB | 75.0 / 26.0 KB | Tree-shakeable — errors-only init drops tracing/replay |
| New Relic | `@newrelic/browser-agent` 1.309 | 389.4 / 128.2 KB | 367.6 / 121.3 KB | Lite/Pro/SPA tiers, but poor tree-shaking |
| OpenTelemetry | `@opentelemetry/*` (browser) | ~300 / ~60 KB | — | No pre-built bundle; assemble from ~6-10 packages. `auto-instrumentations-web` is the all-in-one. Hand-picked setups still ~300 KB parsed per community reports |

-   `cwr-slim.js` is the smallest RUM client of any major vendor.
-   `cwr.js` 3.0 is competitive with Elastic and Grafana despite including auth and signing.

## What Customers Get

**Two choices, same data:**

-   `aws-rum-web` — the full client. Auth, signing, browser detection, all plugins included. Drop-in replacement for 2.x.
-   `@aws-rum-web/slim` — the lightweight client. No auth overhead. Customers bring their own proxy. Plugins are opt-in.

Both clients send the same telemetry data to CloudWatch RUM. The difference is what's bundled on the customer's page.

## Risk

Low. The existing `aws-rum-web` package is fully backward compatible. The slim package is additive — it's a new option, not a replacement. All 613 existing tests pass.

---

# Part 2: Technical Design

## Architecture

Three npm packages. The full client extends the slim client, which depends on a shared engine:

```
@aws-rum-web/slim  (47 KB raw / 12 KB gzip)
│
├── Orchestration ·················· 6.3 KB
│       ├──→ Dispatch (unsigned) ·· 13.9 KB
│       ├──→ EventCache ··········· 4.4 KB
│       ├──→ SessionManager ······· 6.6 KB ──→ navigator.userAgentData (no parser)
│       ├──→ PageManager
│       └──→ PluginManager
│               └──→ PageViewPlugin ·· 5.0 KB (only plugin loaded by default)
│
├── uuid ·· 0.8 KB
├── shimmer · 1.4 KB
│
│   Does NOT pull in:
│   ✗ auth classes ··  11.4 KB     ✗ @smithy/* ········ 20.9 KB
│   ✗ ua-parser-js ··  18.0 KB     ✗ @aws-crypto ······· 1.5 KB
│   ✗ web-vitals ····  11.5 KB     ✗ event plugins ···· 26.6 KB
│
│
aws-rum-web  (132 KB raw / 32 KB gzip)  ──extends slim──
│
├── Orchestration (subclass) ······ +4.2 KB
│       ├──→ + CognitoCredentialFactory ──→ BasicAuth/EnhancedAuth/Cognito/STS · 11.4 KB
│       │                                      └──→ @smithy/fetch-http-handler
│       ├──→ + SigningConfigFactory ──→ @smithy/signature-v4 ·· 20.9 KB (all smithy)
│       │                           ──→ @aws-crypto/sha256-js ·· 1.5 KB (tslib)
│       └──→ + telemetries functor ──→ all 7 event plugins ···· 26.6 KB
│                                      ├── NavigationPlugin ·· 4.9 KB
│                                      ├── XhrPlugin ········· 4.7 KB
│                                      ├── WebVitalsPlugin ··· 3.2 KB
│                                      ├── FetchPlugin ······· 2.9 KB
│                                      ├── DomEventPlugin ···· 2.3 KB
│                                      ├── ResourcePlugin ···· 1.3 KB
│                                      ├── JsErrorPlugin ····· 1.2 KB
│                                      └──→ web-vitals ···· 11.5 KB
│
│   Dropped from 2.x:
│   ✗ ua-parser-js (−18 KB)
```

Slim never imports auth or plugin code, so the bundler (webpack) automatically drops them from the output — this is called "tree-shaking."

Where the savings come from:

-   **2.x → 3.0 full** (−10 KB gzip): Removed `ua-parser-js` browser-detection library (19.3 KB raw).
-   **3.0 full → 3.0 slim** (−20 KB gzip): Auth/signing libraries, event plugins, web-vitals, and associated code are never imported, so the bundler drops them automatically.

See [Appendix B](#appendix-b-bundle-stats-by-category) for a module-by-module size breakdown and [Appendix C](#appendix-c-directory-structure) for the file system layout.

## Breaking Changes (3.0)

### 1. UA metadata fields may be `undefined`

In 2.x, `browserName`, `browserVersion`, `osName`, `osVersion` were always strings — either a real value or `"unknown"` (via `ua-parser-js`).

In 3.0, these fields are `undefined` when the value can't be determined:

-   **Both distributions**: Use `navigator.userAgentData` (Chromium browsers, ~70% of web traffic). On Firefox/Safari, UA fields are `undefined`. When `userAgentData` is not available, the raw `navigator.userAgent` string is included as `aws:userAgent` in payload metadata for server-side parsing.

### 2. Event metadata split: payload-level vs. event-level

Previously, every event in a batch repeated the same session-level metadata. Here's what a real 2.x event looked like (from the demo app loading Hacker News):

```jsonc
// 2.x — EVERY event carried all of this (313 chars)
{
    "metadata": {
        "browserLanguage": "en-US",
        "browserName": "Google Chrome",
        "browserVersion": "144",
        "osName": "macOS",
        "deviceType": "desktop",
        "platformType": "web",
        "domain": "localhost",
        "version": "1.0.0",
        "aws:client": "arw-module",
        "aws:clientVersion": "2.0.0",
        // ↑ same in every event — 258 chars repeated
        // ↓ only these vary per page
        "title": "Top | HN",
        "pageId": "/story/46979562",
        "interaction": 2,
        "parentPageId": "/top"
    }
}
```

In 3.0, session-level fields move to a top-level `SessionMetadata` sent once per request. Each event keeps only what's unique to it:

```jsonc
// 3.0 — session metadata sent ONCE
{
    "SessionMetadata": {
        "browserLanguage": "en-US",
        "browserName": "Google Chrome",
        "browserVersion": "144",
        "osName": "macOS",
        "deviceType": "desktop",
        "platformType": "web",
        "domain": "localhost",
        "version": "1.0.0",
        "aws:client": "arw-module",
        "aws:clientVersion": "3.0.0"
    },
    "RumEvents": [
        {
            // each event: just 55 chars instead of 313
            "metadata": {
                "title": "Top | HN",
                "pageId": "/story/46979562",
                "interaction": 2,
                "parentPageId": "/top"
            }
        }
    ]
}
```

**Why this matters even more for slim.** When `ua-parser-js` is removed, the raw `User-Agent` string is included as `aws:userAgent` so the server can parse it. That string is big:

```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
  (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
```

That's 117 characters — and it would be repeated in every event without the metadata split. With the split, it's sent once in `SessionMetadata`.

**Real numbers from a 100-event batch captured from the demo app:**

82% metadata reduction — or 87% when you factor in the UA string that slim adds.

| Scenario | Metadata payload | ~KB |
| --- | --- | --- |
| 2.x (session fields repeated per event) | 31,300 chars | ~30.6 KB |
| 2.x + raw UA string per event (hypothetical) | 45,100 chars | ~44.0 KB |
| **3.0 (session fields sent once)** | **5,734 chars** | **~5.6 KB** |
| **3.0 + raw UA string (sent once)** | **5,891 chars** | **~5.8 KB** |

This is backward-compatible for PutRumEvents — the `SessionMetadata` field is optional. Old clients that don't send it continue to work. New clients benefit from smaller payloads.

### 3. `@aws-rum-web/slim` is a new package

No existing package is removed or replaced. Customers choosing slim accept the tradeoffs above. `aws-rum-web` remains a recommended option for customers.

## What Didn't Change

-   `aws-rum-web` public API — fully backward compatible (same exports, same config shape)
-   CDN filename `cwr.js` — existing CDN deployments unaffected
-   Plugin system — same `Plugin` interface, same `addPlugin()` / `eventPluginsToLoad`
-   Session management, event batching, retry logic, compression — all unchanged
-   All 613 existing tests pass across 39 test suites

## Payload-level Metadata field

Added to `PutRumEventsRequest`:

```typescript
interface PutRumEventsRequest {
    BatchId: string;
    AppMonitorDetails: AppMonitorDetails;
    UserDetails: UserDetails;
    SessionMetadata?: SessionMetadata; // NEW — JSON of session-level metadata
    RumEvents: RumEvent[];
    Alias?: string;
}
```

Server-side consumers (including the local dev server in `aws-rum-web-ui`) merge `{ ...request.Metadata, ...event.metadata }` on ingestion.

## Future Optimizations

| Target | Savings | Effort | Notes |
| --- | --- | --- | --- |
| Replace `uuid` with `crypto.randomUUID()` | ~1 KB raw | Low | Supported in all modern browsers |
| Make `compression.ts` opt-in via DI | ~2.6 KB raw | Medium | Default is `enabled: false` in slim anyway |
| Remove `shimmer` from slim | ~1.4 KB raw | Medium | `MonkeyPatched` base class pulls it in via `PluginManager` |
| Replace `@smithy/protocol-http` types with local interfaces | ~3.2 KB raw | Medium | Residual type imports from `FetchHttpHandler`/`BeaconHttpHandler` |

These would bring slim to ~39 KB raw / ~10 KB gzip. Diminishing returns — the major wins are captured.

## Migration Guide

### For existing `aws-rum-web` CDN users

No changes required. `cwr.js` continues to work as before.

### For existing `aws-rum-web` NPM users

No changes required for most users. If you were checking for `"unknown"` in UA metadata fields, check for `undefined` instead.

### For new proxy-only deployments (choosing slim)

CDN:

```html
<script src="https://cdn.example.com/cwr-slim.js"></script>
```

NPM:

```bash
npm install @aws-rum-web/slim
```

```typescript
import { AwsRum } from '@aws-rum-web/slim';
```

Config must include `endpoint` pointing to your proxy. `signing: false` is the default in slim.

### Adding plugins to slim (NPM)

```typescript
import { AwsRum } from '@aws-rum-web/slim';
import { FetchPlugin, JsErrorPlugin } from '@aws-rum-web/slim';

new AwsRum(appId, version, region, {
    endpoint: 'https://my-proxy.example.com',
    eventPluginsToLoad: [new FetchPlugin(), new JsErrorPlugin()]
});
```

Your bundler tree-shakes to include only the plugins you import.

---

# Appendix

## Appendix A: Dependency Graph (2.x vs 3.0)

In 2.x, everything was one package. Auth, signing, and ua-parser were statically imported — always bundled, even when unused:

```
aws-rum-web 2.x  (154 KB raw / 42 KB gzip — everything in one bundle)
│
├── Orchestration ──→ Dispatch ──→ BasicAuthentication ──→ @smithy/fetch-http-handler
│                          │   ──→ EnhancedAuthentication ──→ StsClient ──→ @smithy/fetch-http-handler
│                          │   ──→ CognitoIdentityClient ──→ @smithy/fetch-http-handler
│                          │
│                          └──→ DataPlaneClient ──→ @smithy/signature-v4
│                                                ──→ @aws-crypto/sha256-js
│
├── SessionManager ──→ ua-parser-js
│
├── All 7 event plugins (always loaded via telemetries functor)
│       ├── NavigationPlugin ·· 4.9 KB
│       ├── XhrPlugin ········· 4.7 KB
│       ├── WebVitalsPlugin ··· 3.2 KB
│       ├── FetchPlugin ······· 2.9 KB
│       ├── DomEventPlugin ···· 2.3 KB
│       ├── ResourcePlugin ···· 1.3 KB
│       ├── JsErrorPlugin ····· 1.2 KB
│       └──→ web-vitals, shimmer
│
│   In source but NOT bundled (no static import from CDN entry):
│   ✗ RRWebPlugin  (session replay — opt-in via eventPluginsToLoad)
│   ✗ TTIPlugin    (time-to-interactive — experimental)
│   ✗ DemoPlugin   (example/demo)
```

In 3.0, we split into three packages. Heavy deps are injected only when needed:

```
┌─────────────────────────────────────────────────────────────────────┐
│  @aws-rum-web/core  (shared engine — never bundled directly)        │
│                                                                     │
│  EventCache, SessionManager, Dispatch, PageManager, PluginManager,  │
│  all 7 event plugins, PageViewPlugin                                │
│                                                                     │
│  Dispatch has DI seams:                                             │
│    • setCognitoCredentialProviderFactory(factory)                   │
│    • setSigningConfigFactory(factory)                               │
│  SessionManager calls navigator.userAgentData directly (no parser)  │
└──────────────────────────┬──────────────────────┬───────────────────┘
                           │                      │
              ┌────────────┘                      └───────────┐
              ▼                                               ▼
┌───────────────────────────────┐    ┌────────────────────────────────────┐
│  aws-rum-web  (132 KB / 32 KB)│    │  @aws-rum-web/slim (47 KB / 12 KB) │
│  extends slim Orchestration   │    │  base Orchestration                │
│                               │    │                                    │
│  Injects:                     │    │  Injects: nothing                  │
│   ✦ CognitoCredentialFactory  │    │                                    │
│   ✦ SigningConfigFactory      │    │  Loads: PageViewPlugin only        │
│   ✦ telemetries plugin system │    │  Config: signing: false            │
│                               │    │                                    │
│  Pulls in:                    │    │  Pulls in from core:               │
│   ✦ BasicAuthentication       │    │   ✦ Dispatch (unsigned)            │
│   ✦ EnhancedAuthentication    │    │   ✦ EventCache                     │
│   ✦ CognitoIdentityClient     │    │   ✦ SessionManager                 │
│   ✦ StsClient                 │    │   ✦ PageViewPlugin                 │
│   ✦ @smithy/signature-v4      │    │   ✦ uuid, shimmer                  │
│   ✦ @aws-crypto/sha256-js     │    │                                    │
│   ✦ @smithy/fetch-http-handler│    │  Does NOT pull in:                 │
│   ✦ web-vitals                │    │   ✗ auth classes                   │
│   ✦ shimmer                   │    │   ✗ @smithy/signature-v4           │
│   ✦ all 7 event plugins       │    │   ✗ @aws-crypto/sha256-js          │
│                               │    │   ✗ ua-parser-js                   │
│  Dropped from 2.x:            │    │   ✗ web-vitals                     │
│   ✗ ua-parser-js (−19 KB)     │    │   ✗ event plugins                  │
└───────────────────────────────┘    └────────────────────────────────────┘
```

The key: webpack only bundles what's actually imported. Slim never imports auth or signing code, so those modules are tree-shaken away entirely.

## Appendix B: Bundle Stats by Category

All sizes are raw (minified, pre-gzip) from webpack source map character attribution. Gzip totals are exact. Per-category gzip is not shown because gzip is not additive across categories.

| Category | cwr.js 2.x | cwr.js 3.0 | cwr-slim.js 3.0 | Notes |
| --- | --- | --- | --- | --- |
| app: plugins | 32.8 KB | 31.6 KB | 5.0 KB | Slim: PageViewPlugin only. Full: all 7 event plugins |
| aws-sdk/smithy | 24.3 KB | 20.9 KB | 3.2 KB | 2.x: `@aws-sdk/*` + `@smithy/*`. 3.0: `@smithy/*` only. Slim: residual types |
| ua-parser-js | 18.0 KB | — | — | Removed from both 3.0 distributions |
| app: dispatch | 15.0 KB | 19.8 KB | 13.9 KB | 3.0: DI seams added. Slim: no signing, no auth class imports |
| app: auth | 12.3 KB | 11.4 KB | — | BasicAuth, EnhancedAuth, Cognito, STS clients |
| app: sessions | 12.0 KB | 6.6 KB | 6.6 KB | 2.x included VirtualPageLoadTimer (4.2 KB) |
| web-vitals | 11.6 KB | 11.5 KB | — | Only in full (WebVitalsPlugin) |
| app: orchestration | 5.6 KB | 10.5 KB | 6.3 KB | 3.0: split into slim base + full subclass |
| tslib | 5.4 KB | 1.5 KB | — | 2.x: full tslib. 3.0: only `@aws-crypto` subset |
| app: utils | 4.4 KB | 4.5 KB | 1.8 KB | Slim: no http-utils, js-error-utils |
| app: event-cache | 4.3 KB | 4.4 KB | 4.4 KB | Shared |
| app: other | 2.6 KB | 3.0 KB | 1.6 KB | Slim: no XhrError |
| app: remote-config | 2.0 KB | 2.5 KB | — | Only in full |
| shimmer | 1.4 KB | 1.4 KB | 1.4 KB | Shared (MonkeyPatched base class) |
| uuid | 1.1 KB | 0.8 KB | 0.8 KB | Shared |
| app: event-bus | 0.7 KB | 0.9 KB | 0.9 KB | Shared |
| webpack runtime | 0.5 KB | 0.6 KB | 0.6 KB | — |
| **Total** | **154.1 KB** | **132.0 KB** | **46.6 KB** | — |
| **Gzip** | **42.5 KB** | **32.1 KB** | **12.1 KB** | — |
| **Modules** | 109 | 104 | 41 | — |

All sizes are exact (from source map character attribution via `scripts/bundle-stats.js`). The 2.x column is from a local build of the published v2.0.0 release (`ee6251e`).

## Appendix C: Directory Structure

```
packages/
├── core/              @aws-rum-web/core
│                      Shared engine: EventCache, SessionManager, Dispatch,
│                      PageManager, PluginManager, all plugins
│
├── aws-rum-web/       aws-rum-web (full distribution)
│                      Extends slim: adds Cognito auth, SigV4 signing,
│                      telemetries plugin system
│                      CDN bundle: cwr.js
│
└── aws-rum-slim/      @aws-rum-web/slim (slim distribution)
                       No auth, no signing, opt-in plugins
                       CDN bundle: cwr-slim.js
```

All three packages share a single version number (fixed versioning via Lerna). `@aws-rum-web/core` is an internal package — customers use either `aws-rum-web` or `@aws-rum-web/slim`.
