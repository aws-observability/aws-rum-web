# Slim Distribution: Remove ua-parser-js via DI

## Design Intention

### Problem

`ua-parser-js` (19.3 KB raw / 27% of slim bundle) is imported by `SessionManager.collectAttributes()` in core. Because `SessionManager` is essential infrastructure (created by `EventCache`), the dependency is always bundled — even in `aws-rum-slim` where server-side UA parsing is the intended approach.

### Current code

```typescript
// packages/core/src/sessions/SessionManager.ts
import { UAParser } from 'ua-parser-js';

private collectAttributes() {
    const ua = new UAParser(navigator.userAgent).getResult();
    this.attributes = {
        browserLanguage: navigator.language,
        browserName: ua.browser.name ? ua.browser.name : UNKNOWN,
        browserVersion: ua.browser.version ? ua.browser.version : UNKNOWN,
        osName: ua.os.name ? ua.os.name : UNKNOWN,
        osVersion: ua.os.version ? ua.os.version : UNKNOWN,
        deviceType: ua.device.type ? ua.device.type : DESKTOP_DEVICE_TYPE,
        platformType: WEB_PLATFORM_TYPE,
        domain: window.location.hostname,
        'aws:releaseId': this.config.releaseId
    };
}
```

Single import site. Single usage site. Clean extraction target.

### Current event metadata flow

```
SessionManager.collectAttributes()
    → this.attributes = { browserName, browserVersion, osName, osVersion, deviceType, ... }

EventCache.createEvent()
    → metadata = { ...sessionManager.getAttributes(), ...pageManager.getAttributes(), version, ... }
    → RumEvent.metadata = JSON.stringify(metadata)

Dispatch.createRequest()
    → PutRumEventsRequest = { BatchId, AppMonitorDetails, UserDetails, RumEvents }
```

The parsed UA fields are embedded in **every event's** `metadata` JSON string. A batch of 10 events repeats `browserName`, `browserVersion`, `osName`, `osVersion`, `deviceType`, `browserLanguage`, `platformType`, `domain`, `aws:client`, `aws:clientVersion`, `version` ten times. Only `pageId`, `title`, `interaction`, `parentPageId` vary per event.

---

## Part 1: Remove ua-parser-js from slim via DI + userAgentData polyfill

### Decision

Same DI pattern as Phase 2b auth/signing extraction. Add an optional `userAgentProvider` function to `Config`. `SessionManager.collectAttributes()` calls it if present; otherwise uses `navigator.userAgentData` (Chromium-only, sync subset) as a best-effort polyfill, falling back to `UNKNOWN`/`desktop` for fields it can't determine.

-   `aws-rum-web` sets `config.userAgentProvider` to a function wrapping `UAParser` → full metadata, no behavior change
-   `aws-rum-slim` does nothing → uses `userAgentData` when available (Chromium), `UNKNOWN` otherwise
-   NPM consumers of either package can override `userAgentProvider` in their config

### Why Config, not constructor/setter

1. `EventCache` creates `SessionManager` internally — no way to pass extra args without changing `EventCache` too
2. Config is already the bag of options that distribution packages customize
3. Consistent with how `clientBuilder` and `fetchFunction` are already on Config

### Type

```typescript
export type UserAgentDetails = {
    browserName: string;
    browserVersion: string;
    osName: string;
    osVersion: string;
    deviceType: string;
};
```

Added to `Config`:

```typescript
userAgentProvider?: () => UserAgentDetails;
```

### userAgentData polyfill (no-provider fallback)

When `userAgentProvider` is not set, `collectAttributes()` checks `navigator.userAgentData` (the [User-Agent Client Hints API](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData)):

```typescript
// Sync properties available without getHighEntropyValues():
navigator.userAgentData.brands; // [{ brand: "Chromium", version: "144" }, { brand: "Google Chrome", version: "144" }]
navigator.userAgentData.mobile; // boolean
navigator.userAgentData.platform; // "macOS", "Windows", "Android", "Linux", etc.
```

This gives us:

-   `browserName` — last brand entry (heuristic: pick the non-"Chromium", non-"Not" brand)
-   `browserVersion` — version from that brand
-   `osName` — `platform` field
-   `osVersion` — **not available** sync (requires `getHighEntropyValues()` which is async). Defaults to `UNKNOWN`.
-   `deviceType` — `mobile ? 'mobile' : 'desktop'` (no tablet/smarttv/etc distinction)

**Coverage**: Chromium browsers (Chrome, Edge, Opera, Samsung Internet) ~70% of web traffic. Firefox and Safari don't support `userAgentData` — all fields default to `UNKNOWN`/`desktop`.

This is acceptable for slim because:

1. It's better than nothing — 70% of users get partial metadata for free
2. The raw `User-Agent` string is available server-side via the HTTP header for full parsing
3. Consumers who need full client-side parsing use `aws-rum-web` or inject their own `userAgentProvider`

### What changes (Part 1)

| File | Change |
| --- | --- |
| `packages/core/src/orchestration/config.ts` | Add `UserAgentDetails` type, add optional `userAgentProvider` to `Config` |
| `packages/core/src/sessions/SessionManager.ts` | Remove `ua-parser-js` import. `collectAttributes()` uses `config.userAgentProvider?.()`, falls back to `userAgentData` polyfill, then `UNKNOWN` defaults |
| `packages/core/src/index.ts` | Export `UserAgentDetails` type |
| `packages/aws-rum-web/src/orchestration/config.ts` | Import `UAParser`, set `userAgentProvider` in `defaultConfig()` |
| `packages/aws-rum-web/src/orchestration/Orchestration.ts` | Re-export `UserAgentDetails` type |
| `packages/core/src/sessions/__tests__/SessionManager.test.ts` | Existing UA tests inject `userAgentProvider`. New test for no-provider → `userAgentData` polyfill. New test for no-provider + no `userAgentData` → UNKNOWN defaults |

### What doesn't change

-   `aws-rum-slim` — no changes needed. It already doesn't set `userAgentProvider`.
-   `EventCache` — no constructor changes.
-   `PageManager` — unrelated.
-   Any plugin code — unrelated.

### Estimated bundle impact

| Bundle             | Before    | After     | Savings |
| ------------------ | --------- | --------- | ------- |
| `cwr-slim.js` raw  | 65.2 KB   | ~46 KB    | ~19 KB  |
| `cwr-slim.js` gzip | 20.4 KB   | ~14-15 KB | ~5-6 KB |
| `cwr.js`           | unchanged | unchanged | —       |

---

## Part 2: Payload-level common metadata

### Problem

Every event in a `PutRumEventsRequest` batch repeats the same session-level metadata:

```json
{
  "RumEvents": [
    { "metadata": { "browserName": "Chrome", "browserVersion": "144", "osName": "Mac OS", "domain": "localhost", "pageId": "/top", ... } },
    { "metadata": { "browserName": "Chrome", "browserVersion": "144", "osName": "Mac OS", "domain": "localhost", "pageId": "/story/123", ... } },
    { "metadata": { "browserName": "Chrome", "browserVersion": "144", "osName": "Mac OS", "domain": "localhost", "pageId": "/story/123", ... } }
  ]
}
```

Fields like `browserName`, `browserVersion`, `osName`, `osVersion`, `deviceType`, `browserLanguage`, `platformType`, `domain`, `aws:client`, `aws:clientVersion`, `version` are identical across all events in a batch. Only `pageId`, `title`, `interaction`, `parentPageId`, `pageTags` vary per event.

With 10 events per batch, the repeated session metadata adds ~1-2 KB of redundant JSON per request.

### Proposal

Add a top-level `Metadata` field to `PutRumEventsRequest` for session-level (common) metadata. Event-level metadata retains only per-event fields.

```typescript
export interface PutRumEventsRequest {
    BatchId: string;
    AppMonitorDetails: AppMonitorDetails;
    UserDetails: UserDetails;
    Metadata?: string; // NEW — common session-level metadata (JSON string)
    RumEvents: RumEvent[];
    Alias?: string;
}
```

Payload example after:

```json
{
  "BatchId": "...",
  "AppMonitorDetails": { "id": "...", "version": "1.0.0" },
  "UserDetails": { "userId": "...", "sessionId": "..." },
  "Metadata": {
    "version": "1.0.0",
    "browserLanguage": "en-US",
    "browserName": "Chrome",
    "browserVersion": "144.0.0.0",
    "osName": "Mac OS",
    "osVersion": "10.15.7",
    "deviceType": "desktop",
    "platformType": "web",
    "domain": "localhost",
    "aws:client": "arw-module",
    "aws:clientVersion": "2.0.0",
    "aws:userAgent": "Mozilla/5.0 ..."
  },
  "RumEvents": [
    {
      "metadata": { "pageId": "/top", "title": "Top | HN" },
      "details": { ... }
    },
    {
      "metadata": { "pageId": "/story/123", "title": "Show HN: ...", "interaction": 1, "parentPageId": "/top" },
      "details": { ... }
    }
  ]
}
```

### Field classification

All fields from the `MetaData` interface (`events/meta-data.ts`), plus custom session attributes and the new `aws:userAgent`:

#### Common (payload-level `Metadata`) — constant for the session/batch

| Field | Source | Notes |
| --- | --- | --- |
| `version` | `EventCache.createEvent()` | Always `"1.0.0"` |
| `browserLanguage` | `SessionManager.collectAttributes()` | `navigator.language` |
| `browserName` | `SessionManager.collectAttributes()` | From `userAgentProvider` or `userAgentData` or `UNKNOWN` |
| `browserVersion` | `SessionManager.collectAttributes()` | From `userAgentProvider` or `userAgentData` or `UNKNOWN` |
| `osName` | `SessionManager.collectAttributes()` | From `userAgentProvider` or `userAgentData` or `UNKNOWN` |
| `osVersion` | `SessionManager.collectAttributes()` | From `userAgentProvider` or `UNKNOWN` (`userAgentData` sync can't provide this) |
| `deviceType` | `SessionManager.collectAttributes()` | From `userAgentProvider` or `userAgentData.mobile` or `desktop` |
| `platformType` | `SessionManager.collectAttributes()` | Always `"web"` |
| `domain` | `SessionManager.collectAttributes()` | `window.location.hostname` |
| `aws:releaseId` | `SessionManager.collectAttributes()` | From `config.releaseId` (optional) |
| `aws:client` | `EventCache.createEvent()` | Installation method: `"arw-module"`, `"arw-script"`, etc. |
| `aws:clientVersion` | `EventCache.createEvent()` | Package version string |
| `aws:userAgent` | `SessionManager.collectAttributes()` | NEW — raw `navigator.userAgent`, only when `userAgentProvider` is not set |
| Custom session attributes | `SessionManager.addSessionAttributes()` | User-defined `{ [k: string]: string \| number \| boolean }` via `config.sessionAttributes` or `addSessionAttributes()` API |

#### Per-event (event-level `metadata`) — varies per page/navigation

| Field | Source | Notes |
| --- | --- | --- |
| `pageId` | `PageManager.collectAttributes()` | Current page identifier |
| `title` | `PageManager.collectAttributes()` | `document.title` or custom `pageAttributes.title` |
| `interaction` | `PageManager.collectAttributes()` | Navigation depth counter (only when `recordInteraction` is true) |
| `parentPageId` | `PageManager.collectAttributes()` | Previous page's ID (only when set) |
| `pageTags` | `PageManager.collectAttributes()` | Custom tags array from `PageAttributes` |
| Custom page attributes | `PageManager.collectAttributes()` | User-defined attributes from `PageAttributes.pageAttributes` |

#### Defined in MetaData schema but not set by client code

These fields exist in the `MetaData` interface (auto-generated from JSON Schema) but are not populated by the web client. They may be set by server-side enrichment or custom page attributes:

| Field             | Notes                                                   |
| ----------------- | ------------------------------------------------------- |
| `pageUrl`         | Not set by client; may come from custom page attributes |
| `url`             | Not set by client; may come from custom page attributes |
| `referrerUrl`     | Not set by client; may come from custom page attributes |
| `pageTitle`       | Not set by client; `title` is used instead              |
| `countryCode`     | Not set by client; server-side enrichment               |
| `subdivisionCode` | Not set by client; server-side enrichment               |

### Backward compatibility

This is a **backward-compatible, additive change**. The contract is:

1. **Event-level metadata inherits from payload-level metadata.** When a consumer (server, UI, analytics) reads an event's metadata, it merges: `{ ...request.Metadata, ...event.metadata }`. Event-level fields override payload-level fields if both exist.

2. **Payload-level `Metadata` is optional.** Old clients that don't send it still work — the server/UI just reads event-level metadata as before.

3. **Event-level metadata continues to work standalone.** Even after this change, the client MAY still include common fields in event-level metadata for backward compatibility during a transition period. The server SHOULD prefer payload-level values when present.

This means:

-   Old clients (no `Metadata` field) → server reads event-level metadata as today. No breakage.
-   New clients (with `Metadata` field) → server merges payload + event metadata. Smaller payloads.
-   Mixed batches are impossible (one client version per request), so no ambiguity.

### Impact on aws-rum-web-ui

The local dev server needs to handle both old and new payload formats:

1. **On event ingestion**: if `request.body.Metadata` exists, merge it into each event's metadata before storage/display: `eventMetadata = { ...request.body.Metadata, ...event.metadata }`
2. **UA enrichment**: if `browserName` is `"unknown"` after merge, parse `aws:userAgent` from merged metadata (or fall back to request `User-Agent` header) using `ua-parser-js` server-side
3. **Display**: No UI changes — fields are populated before display

This is read-time enrichment. Raw events in storage are unchanged.

### What changes (Part 2)

| File | Change |
| --- | --- |
| `packages/core/src/dispatch/dataplane.ts` | Add optional `Metadata?: string` to `PutRumEventsRequest` |
| `packages/core/src/events/meta-data.ts` | Add optional `"aws:userAgent"?: string` |
| `packages/core/src/event-cache/EventCache.ts` | Split `createEvent()`: session attributes → stored once, page attributes → per-event metadata |
| `packages/core/src/dispatch/Dispatch.ts` | `createRequest()` includes `Metadata` from EventCache |
| `packages/core/src/dispatch/DataPlaneClient.ts` | `serializeRequest()` includes `Metadata` field |
| `aws-rum-web-ui` (separate repo) | Merge payload `Metadata` into event metadata on ingestion; UA enrichment when `browserName === "unknown"` |

---

## Breaking change note

Part 1 is a 3.0 breaking change for slim consumers who relied on `browserName`/`browserVersion`/`osName`/`osVersion`/`deviceType` being fully populated. They will now see `userAgentData`-derived values (Chromium) or `unknown` (Firefox/Safari) unless they:

1. Use `aws-rum-web` (which injects the full provider)
2. Pass their own `userAgentProvider` in config
3. Handle it server-side

Part 2 is **not** a breaking change — it's additive. Old consumers ignore `Metadata`; new consumers benefit from smaller payloads and the merge contract.

---

## Execution Plan

### Part 1 tasks

#### Task U1 — Add `UserAgentDetails` type and `userAgentProvider` to Config

Files changed:

-   **Modified**: `packages/core/src/orchestration/config.ts` — add `UserAgentDetails` type, add `userAgentProvider?: () => UserAgentDetails` to `Config`
-   **Modified**: `packages/core/src/index.ts` — export `UserAgentDetails`

#### Task U2 — Make SessionManager use optional provider with userAgentData fallback

Files changed:

-   **Modified**: `packages/core/src/sessions/SessionManager.ts` — remove `import { UAParser } from 'ua-parser-js'`. In `collectAttributes()`:
    -   If `config.userAgentProvider` exists: call it, use returned fields
    -   Else if `navigator.userAgentData` exists: extract browserName/version from `brands`, osName from `platform`, mobile → deviceType
    -   Else: all five fields default to UNKNOWN/desktop

#### Task U3 — Inject ua-parser-js provider in aws-rum-web

Files changed:

-   **Modified**: `packages/aws-rum-web/src/orchestration/config.ts` — import `UAParser` from `ua-parser-js`, set `userAgentProvider` in `defaultConfig()` to a function that parses `navigator.userAgent` and returns `UserAgentDetails`
-   **Modified**: `packages/aws-rum-web/src/orchestration/Orchestration.ts` — re-export `UserAgentDetails` type

#### Task U4 — Update tests

Files changed:

-   **Modified**: `packages/core/src/sessions/__tests__/SessionManager.test.ts`:
    -   Existing "session attributes include user agent" test: add `userAgentProvider` to config that returns `MOBILE_USER_AGENT_META_DATA` fields
    -   Existing "device type is desktop" test: add `userAgentProvider` to config that returns `DESKTOP_USER_AGENT_META_DATA` fields
    -   New test: "when no userAgentProvider and userAgentData available, uses userAgentData"
    -   New test: "when no userAgentProvider and no userAgentData, UA fields default to unknown/desktop"

#### Task U5 — Validate Part 1

```bash
npm test                    # All tests pass (611)
npm run build               # Both bundles build
npm run stats               # Slim drops ~19 KB raw
```

Validation checklist:

-   [ ] All existing tests pass
-   [ ] `cwr-slim.js` builds — expected ~46 KB raw / ~14-15 KB gzip
-   [ ] `cwr.js` unchanged (~148 KB raw / ~40.9 KB gzip)
-   [ ] `ua-parser-js` absent from slim bundle
-   [ ] `ua-parser-js` present in full bundle
-   [ ] `npm run lint` — no new errors

### Part 2 tasks

#### Task U6 — Add payload-level Metadata to PutRumEventsRequest

Files changed:

-   **Modified**: `packages/core/src/dispatch/dataplane.ts` — add `Metadata?: string` to `PutRumEventsRequest`
-   **Modified**: `packages/core/src/events/meta-data.ts` — add `"aws:userAgent"?: string`

#### Task U7 — Split EventCache metadata into common + per-event

Files changed:

-   **Modified**: `packages/core/src/event-cache/EventCache.ts` — extract session-level attributes into a `getCommonMetadata()` method. `createEvent()` only includes page-level attributes in event metadata.
-   **Modified**: `packages/core/src/dispatch/Dispatch.ts` — `createRequest()` includes `Metadata: JSON.stringify(eventCache.getCommonMetadata())`
-   **Modified**: `packages/core/src/dispatch/DataPlaneClient.ts` — `serializeRequest()` passes through `Metadata` field

#### Task U8 — Update tests for Part 2

Files changed:

-   **Modified**: `packages/core/src/event-cache/__tests__/EventCache.test.ts` — verify common metadata separate from event metadata
-   **Modified**: `packages/core/src/dispatch/__tests__/Dispatch.test.ts` — verify `Metadata` field in request
-   **Modified**: `packages/core/src/dispatch/__tests__/DataPlaneClient.test.ts` — verify serialization includes `Metadata`

#### Task U9 — aws-rum-web-ui server-side enrichment (separate repo)

Files changed (in `aws-rum-web-ui` repo):

-   Event ingestion handler: merge `request.body.Metadata` into each event's metadata
-   When `browserName === "unknown"` after merge: parse `aws:userAgent` from metadata (or `User-Agent` header) using `ua-parser-js` server-side

#### Task U10 — Validate Part 2

Validation checklist:

-   [ ] All existing tests pass
-   [ ] Both bundles build, sizes unchanged from Part 1
-   [ ] Payload contains top-level `Metadata` with session-level fields
-   [ ] Event-level metadata contains only page-level fields
-   [ ] `npm run lint` — no new errors

---

## Dependency

```
Part 1: U1 → U2 → U3 → U4 → U5
Part 2: U6 → U7 → U8 → U10
         U9 (separate repo, after U7)
```

Part 1 and Part 2 are independent — Part 2 can be done before, after, or in parallel with Part 1. However, doing Part 1 first is recommended because it delivers the bundle size win immediately.
