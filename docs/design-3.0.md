# aws-rum-web 3.0: Slim Distribution & Monorepo

---

# Part 1: Overview

## What We Did

We built a lightweight version of the CloudWatch RUM web client called `@aws-rum-web/slim`. It's 71% smaller than the current client — just 12 KB over the wire, down from 41 KB.

The existing `aws-rum-web` package continues to work exactly as before. Nothing breaks for current customers. This is a new option for customers who don't need the full feature set.

## Why It Matters

Every kilobyte of JavaScript a customer adds to their page costs them load time. Our RUM client is supposed to measure performance — it shouldn't hurt it.

Many customers use a proxy endpoint to send RUM data. They don't need Cognito authentication or request signing. But today, those features are baked in and can't be removed. Customers pay the download cost whether they use them or not.

This has been the [#1 requested feature](https://github.com/aws-observability/aws-rum-web/issues/507) on our GitHub repo.

## The Numbers

|  | Download size (gzip) | Parse size (raw JS) |
|---|---|---|
| `aws-rum-web` 2.x | 44 KB | 157 KB |
| `aws-rum-web` 3.0 | 41 KB | 148.5 KB |
| `@aws-rum-web/slim` 3.0 | **12 KB** | **46.5 KB** |

The slim client is 71% smaller to download and 70% less JavaScript for the browser to parse.

## How We Compare to Competitors

We measured every major RUM SDK using the same tool and methodology (esbuild, minified + gzip):

| Vendor | Full SDK | Smallest option |
|---|---|---|
| **AWS CloudWatch RUM 3.0** | **41 KB** | **12 KB** ✅ |
| Elastic APM | 23 KB | 23 KB (no slim) |
| Grafana Faro | 32 KB | ~31 KB |
| Datadog | 69 KB | 46 KB |
| Sentry | 135 KB | 26 KB |
| New Relic | 128 KB | ~121 KB |

## What Customers Get

**Two choices, same data:**

- `aws-rum-web` — the full client. Auth, signing, browser detection, all plugins included. Drop-in replacement for 2.x.
- `@aws-rum-web/slim` — the lightweight client. No auth overhead. Customers bring their own proxy. Plugins are opt-in.

Both clients send the same telemetry data to CloudWatch RUM. The difference is what's bundled on the customer's page.

## What's Left to Do

| Task | Status |
|---|---|
| Update documentation (README, install guides) | Not started |
| Update GitHub Actions CI/CD for multi-package build | Not started |
| Publish to npm | Not started |
| Close GitHub Issue #507 | Blocked on publish |

## Risk

Low. The existing `aws-rum-web` package is fully backward compatible. The slim package is additive — it's a new option, not a replacement. All 613 existing tests pass.

---

# Part 2: Technical Design

## Architecture

We converted the repo from a single package into a Lerna monorepo with three packages:

```
packages/
├── core/              @aws-rum-web/core
│                      Shared engine: EventCache, SessionManager, Dispatch,
│                      PageManager, PluginManager, all plugins
│
├── aws-rum-web/       aws-rum-web (full distribution)
│                      Injects: Cognito auth, SigV4 signing, ua-parser-js
│                      CDN bundle: cwr.js
│
└── aws-rum-slim/      @aws-rum-web/slim (slim distribution)
                       Injects: nothing
                       CDN bundle: cwr-slim.js
```

All three packages are published to npm. They share a single version number (fixed versioning via Lerna). `@aws-rum-web/core` contains the shared engine and all plugins. The distribution packages (`aws-rum-web` and `@aws-rum-web/slim`) are thin orchestration layers that decide what to inject.

### How the size reduction works: Dependency Injection

The key insight: heavy dependencies (auth, signing, UA parsing) were statically imported in core modules. Even when unused, webpack couldn't remove them. We severed these static imports and replaced them with injection points.

Three DI seams:

| Seam | What it decouples | Where it's injected |
|---|---|---|
| `CognitoCredentialProviderFactory` | Cognito auth (Basic + Enhanced flows) | `Dispatch.setCognitoCredentialProviderFactory()` |
| `SigningConfigFactory` | SigV4 request signing (`@smithy/signature-v4`, `@aws-crypto/sha256-js`) | `Dispatch.setSigningConfigFactory()` |
| `userAgentProvider` | UA string parsing (`ua-parser-js`, 19 KB) | `Config.userAgentProvider` |

`aws-rum-web`'s Orchestration injects all three. `@aws-rum-web/slim`'s Orchestration injects none. Webpack tree-shakes everything that isn't imported — the auth classes, signing libraries, and UA parser simply don't exist in the slim bundle.

Additionally, slim removes the `telemetries` opt-in system (the string-based plugin loader). Slim loads only `PageViewPlugin` by default. All other plugins are available as opt-in imports for NPM consumers, or via `eventPluginsToLoad` config.

### What was removed from slim

| Removed module | Size saved (raw) |
|---|---|
| All event plugins (Navigation, Xhr, Fetch, DomEvent, JsError, Resource, WebVitals) | 26.6 KB |
| `ua-parser-js` | 19.3 KB |
| `@smithy/signature-v4` + `@aws-crypto/sha256-js` | 17.7 KB |
| `web-vitals` | 11.5 KB |
| Auth classes + Cognito/STS clients | 9.6 KB |
| `@smithy/fetch-http-handler` + querystring-builder | 2.1 KB |
| tslib | 1.5 KB |

### Slim bundle composition (46.5 KB raw / 12.0 KB gzip)

| Category | Size | % |
|---|---|---|
| App: dispatch | 13.9 KB | 30% |
| App: sessions | 6.7 KB | 14% |
| App: orchestration | 6.1 KB | 13% |
| App: plugins (PageViewPlugin only) | 5.0 KB | 11% |
| App: event-cache | 4.4 KB | 9% |
| @smithy types (residual) | 3.2 KB | 7% |
| App: utils + other | 3.4 KB | 7% |
| shimmer | 1.4 KB | 3% |
| uuid | 1.0 KB | 2% |
| Remaining | 1.4 KB | 3% |

## Breaking Changes (3.0)

### 1. UA metadata fields may be `undefined`

In 2.x, `browserName`, `browserVersion`, `osName`, `osVersion` were always strings — either a real value or `"unknown"` (via `ua-parser-js`).

In 3.0, these fields are `undefined` when the value can't be determined:

- **`aws-rum-web` (full)**: Still uses `ua-parser-js`. Fields are `undefined` instead of `"unknown"` when ua-parser can't determine them (rare — mainly unrecognized user agents).
- **`@aws-rum-web/slim`**: Uses `navigator.userAgentData` (Chromium browsers, ~70% of web traffic) as a lightweight fallback. On Firefox/Safari, UA fields are `undefined`. When no UA provider resolves, the raw `navigator.userAgent` string is included as `aws:userAgent` in payload metadata for server-side parsing.

Customers can inject their own `userAgentProvider` function in config to restore full client-side parsing with any library they choose.

### 2. Event metadata split: payload-level vs. event-level

Previously, every event in a batch repeated the same session-level metadata (browser, OS, domain, client version). With 10 events per batch, that's ~1-2 KB of redundant JSON.

Now, session-level metadata is sent once per request in a top-level `Metadata` field. Event-level metadata contains only per-page fields (`pageId`, `title`, `interaction`, `parentPageId`, `pageTags`).

**Wire format change:**

```
Before: each event.metadata = { browserName, osName, domain, ..., pageId, title }
After:  request.Metadata   = { browserName, osName, domain, ... }
        each event.metadata = { pageId, title }
```

Consumers merge on read: `{ ...request.Metadata, ...event.metadata }`.

This is backward-compatible for the server — the `Metadata` field is optional. Old clients that don't send it continue to work. New clients benefit from smaller payloads.

### 3. `@aws-rum-web/slim` is a new package

No existing package is removed or replaced. Customers choosing slim accept the tradeoffs above. `aws-rum-web` remains the default recommendation.

## What Didn't Change

- `aws-rum-web` public API — fully backward compatible (same exports, same config shape)
- CDN filename `cwr.js` — existing CDN deployments unaffected
- Plugin system — same `Plugin` interface, same `addPlugin()` / `eventPluginsToLoad`
- Session management, event batching, retry logic, compression — all unchanged
- All 613 existing tests pass across 39 test suites

## `userAgentProvider` DI design

The `userAgentProvider` is an optional function on `Config` that returns browser/OS details:

```typescript
type UserAgentDetails = {
    browserName?: string;
    browserVersion?: string;
    osName?: string;
    osVersion?: string;
    deviceType?: string;
};

interface Config {
    // ... existing fields ...
    userAgentProvider?: () => UserAgentDetails | undefined;
}
```

Resolution order in `SessionManager.collectAttributes()`:

1. If `config.userAgentProvider` is set and returns a value → use it
2. If no provider or provider returns `undefined` → UA fields are `undefined`, raw `navigator.userAgent` is set as `aws:userAgent`

Distribution defaults:
- `aws-rum-web`: sets `userAgentProvider` to a function wrapping `UAParser`
- `@aws-rum-web/slim`: sets `userAgentProvider` to `userAgentDataProvider` (uses `navigator.userAgentData` Chromium API, returns `undefined` on Firefox/Safari)

A standalone `userAgentDataProvider` function is exported from `@aws-rum-web/core` for consumers who want the Chromium-only fallback without importing `ua-parser-js`.

## `ParsedRumEvent.metadata` type change

`ParsedRumEvent.metadata` changed from `MetaData` to `Partial<MetaData>`. This reflects that parsed events now carry only per-page metadata (not the full session + page merge). Event bus subscribers that previously checked for `version`, `aws:client`, or `aws:clientVersion` on parsed events need to read those from `EventCache.getCommonMetadata()` instead.

## Payload-level `Metadata` field

Added to `PutRumEventsRequest`:

```typescript
interface PutRumEventsRequest {
    BatchId: string;
    AppMonitorDetails: AppMonitorDetails;
    UserDetails: UserDetails;
    Metadata?: string;  // NEW — JSON string of session-level metadata
    RumEvents: RumEvent[];
    Alias?: string;
}
```

Server-side consumers (including the local dev server in `aws-rum-web-ui`) merge `{ ...request.Metadata, ...event.metadata }` on ingestion.


## Future Optimizations

| Target | Savings | Effort | Notes |
|---|---|---|---|
| Replace `uuid` with `crypto.randomUUID()` | ~1 KB raw | Low | Supported in all modern browsers |
| Make `compression.ts` opt-in via DI | ~2.6 KB raw | Medium | Default is `enabled: false` in slim anyway |
| Remove `shimmer` from slim | ~1.4 KB raw | Medium | `MonkeyPatched` base class pulls it in via `PluginManager` |
| Replace `@smithy/protocol-http` types with local interfaces | ~3.2 KB raw | Medium | Residual type imports from `FetchHttpHandler`/`BeaconHttpHandler` |

These would bring slim to ~39 KB raw / ~10 KB gzip. Diminishing returns — the major wins are captured.

## Competitor Bundle Size Comparison

All sizes measured with esbuild (minified + gzip), February 2026. "Full" = all features exported. "Slim/Minimal" = smallest available configuration.

| Vendor | Package | Full (raw / gzip) | Slim/Minimal (raw / gzip) | Slim offering |
|---|---|---|---|---|
| **AWS CloudWatch RUM** | `aws-rum-web` 3.0 | **148.5 / 41.0 KB** | **46.5 / 12.0 KB** | `@aws-rum-web/slim` — no auth/signing/ua-parser, opt-in plugins |
| Datadog | `@datadog/browser-rum` 6.26 | 197.7 / 69.1 KB | 128.9 / 45.5 KB | `@datadog/browser-rum-slim` — no Session Replay |
| Elastic | `@elastic/apm-rum` 5.17 | 66.7 / 22.6 KB | — | No slim variant (already small) |
| Grafana Faro | `@grafana/faro-web-sdk` | 89.3 / 31.7 KB | 86.6 / 30.7 KB | Tree-shakeable, but minimal savings |
| Sentry | `@sentry/browser` 10.38 | 404.0 / 134.6 KB | 75.0 / 26.0 KB | Tree-shakeable — errors-only init drops tracing/replay |
| New Relic | `@newrelic/browser-agent` 1.309 | 389.4 / 128.2 KB | 367.6 / 121.3 KB | Lite/Pro/SPA tiers, but poor tree-shaking |

Note: Dynatrace RUM uses a proprietary injected agent (`ruxitagentjs`) not available on npm. Their agent is typically ~30-40 KB gzip based on community reports.

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
