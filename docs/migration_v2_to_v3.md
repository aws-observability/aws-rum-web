# Migrating from 2.x to 3.x

3.0 restructures the distribution into a monorepo with three packages and tightens the default configuration. Most apps can upgrade with no code changes beyond a version bump. Read this guide before upgrading to catch the items that do require action.

Applies to both `aws-rum-web` (full) and `@aws-rum/web-slim` (slim).

## TL;DR

| Change | Action required |
| --- | --- |
| Monorepo split into `@aws-rum/web-core`, `@aws-rum/web-slim`, `aws-rum-web` | None for most apps. Keep importing from `aws-rum-web`. |
| Deep imports replaced with barrel imports | If you imported from internal paths (`aws-rum-web/dist/...`), switch to top-level imports. |
| Compilation target bumped from ES5 to **ES2017** | Drop IE11 / legacy browser support, or transpile in your own build. |
| `ua-parser-js` replaced with native `navigator.userAgentData` | None. Output shape is unchanged for supported browsers. |
| `telemetries` and auth fields moved from core `Config` to web `Config` | None unless you depended on `@aws-rum/web-core` types directly. |
| Default `telemetries` now `['errors', 'performance', 'http', 'replay']` | If you want the old set, pass `telemetries: ['errors', 'performance', 'http']`. |
| Session replay (RRWebPlugin) enabled by default | To disable, omit `replay` from `telemetries`. Privacy masking is enforced. |
| Compression enabled by default (`compressionStrategy: true`) | None. To opt out, set `compressionStrategy: false`. |
| `VirtualPageLoadTimer` already disabled by default in 2.0 | None — carried over unchanged. |

## Install

### aws-rum-web (full)

```bash
npm install aws-rum-web@^3
```

### @aws-rum/web-slim (new in 3.x)

Slim is a new lightweight build that excludes Cognito auth and default telemetries. Use it when you want a smaller bundle and plan to configure telemetries and credentials yourself.

```bash
npm install @aws-rum/web-slim@^3
```

See [`concepts/packages.md`](./concepts/packages.md) for the full comparison.

## Breaking changes

### 1. Monorepo restructure

The codebase was split into three published packages:

-   `@aws-rum/web-core` — shared base, not intended for direct consumption.
-   `@aws-rum/web-slim` — slim build. Forces `signing: false`. No default telemetries. No Cognito.
-   `aws-rum-web` — full build. Extends slim. Includes Cognito auth and the default telemetry plugins.

**Action:** Continue importing from `aws-rum-web`. The public `AwsRum` class and config surface are unchanged.

### 2. ES2017 compilation target

The bundled output now targets ES2017 (was ES5). This drops support for IE11 and other legacy browsers.

**Action:** If you still need older browser support, transpile `aws-rum-web` through your own build (Babel/SWC targeting ES5).

### 3. Barrel imports

Internal module paths were consolidated into barrel exports. Code that imported from deep paths (e.g. `aws-rum-web/dist/plugins/...`) will break.

**Before:**

```typescript
import { RRWebPlugin } from 'aws-rum-web/dist/plugins/rrweb/RRWebPlugin';
```

**After:**

```typescript
import { RRWebPlugin } from 'aws-rum-web';
```

### 4. `ua-parser-js` → `navigator.userAgentData`

The `ua-parser-js` dependency was removed in favor of the native User-Agent Client Hints API. Browsers that do not implement `navigator.userAgentData` (older Safari/Firefox) will emit events without detailed UA metadata.

**Action:** None for most apps. If you need full UA parsing in all browsers, parse `navigator.userAgent` yourself in a custom plugin.

### 5. Config field relocation

`telemetries` and the Cognito auth fields (`identityPoolId`, `guestRoleArn`) moved from the core `Config` type to the web-level `Config` type. This is only observable if you typed configs against `@aws-rum/web-core` directly.

**Action:** Type configs with `AwsRumConfig` from `aws-rum-web` (or `@aws-rum/web-slim`).

### 6. Default telemetries now include `replay`

2.x default: `['errors', 'performance', 'http']` 3.x default: `['errors', 'performance', 'http', 'replay']`

RRWebPlugin records DOM snapshots for session replay. **All text and all input values are masked and this cannot be disabled** — see [`plugins/RRWebPlugin.md`](./plugins/RRWebPlugin.md).

**Action — keep 2.x behavior:**

```typescript
const config: AwsRumConfig = {
    // ...
    telemetries: ['errors', 'performance', 'http']
};
```

### 7. Compression on by default

`compressionStrategy` now defaults to `true` (gzip when payload > 2KB and compresses by ≥20%).

**Action:** None unless you run behind a proxy that rejects gzip request bodies. Opt out with `compressionStrategy: false`.

## Non-breaking improvements in 3.x

-   `sendBeacon` falls back to `fetch` when the payload exceeds the 64 KB beacon limit.
-   Invalid Cognito credentials are purged on 403 and re-fetched automatically.
-   Custom request headers via `headers` config.
-   Fetch transport uses `keepalive` to survive `pagehide` on modern browsers.
-   W3C `traceparent` header support (`enableW3CTraceId`).

## See also

-   [`configuration.md`](./configuration.md) — full option list
-   [`concepts/packages.md`](./concepts/packages.md) — slim vs full vs core
-   [`plugins/RRWebPlugin.md`](./plugins/RRWebPlugin.md) — session replay and privacy enforcement
-   [CHANGELOG](../CHANGELOG.md) — full change log
