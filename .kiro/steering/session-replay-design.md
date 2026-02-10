# RUM Web Session Replay - Client-Side Design

## 1. Background

### What Is Session Replay?

Session replay records what a user sees and does on your website — clicks, scrolls, page changes — and lets you play it back like a video. No actual video is captured. Instead, the system records changes to the page as an animation and rebuilds them during playback.

### Why We Need It

Session replay is one of the **most requested features** missing from AWS RUM. Customers tell us it's the main reason they pick a competitor instead. Without it, teams cannot:

-   Watch what a user did before an error happened
-   Understand why a page felt slow
-   See how people actually use the product

### Every Major Competitor Has It

| Provider  | Session Replay | Market Position       |
| --------- | -------------- | --------------------- |
| Datadog   | ✅ Yes         | Market Leader         |
| New Relic | ✅ Yes         | Major Player          |
| Sentry    | ✅ Yes         | Error Tracking Leader |
| LogRocket | ✅ Yes         | Replay Specialist     |
| FullStory | ✅ Yes         | Analytics Focus       |
| AWS RUM   | ❌ **No**      | **Feature gap**       |

### How It Works (Non-Technical)

We use an open source library called [rrweb](https://github.com/rrweb-io/rrweb) that is the industry standard for session replay. There are other proprietary implementations but they are not licensed for re-use. RRWeb does the following:

-   Takes a "snapshot" of the page when recording starts
-   Tracks every change after that (text updates, clicks, scrolls)
-   Sends those changes as small data packets — not screenshots or video
-   Has very low performance impact (~1-2% CPU)
-   Has built-in privacy controls (text masking, input hiding)

## 2. High-Level Design

<!-- TODO: Add screenshot of http://localhost:5174/ showing the replay viewer -->

### Configuration

```typescript
new RRWebPlugin({
    additionalSampleRate: number, // 0-1, applied on top of sessionSampleRate. Default: 1.0
    batchSize: number,            // rrweb events per RUM event. Default: 50
    flushInterval: number,        // ms between flushes. Default: 5000
    recordOptions: { ... }        // forwarded to rrweb record()
})
```

### RUM Session Replay Event Schema

Each flush produces one RUM event containing a batch of rrweb events:

```json
{
    "id": "uuid-v4",
    "type": "com.amazon.rum.session_replay_event",
    "timestamp": 1737489376629,
    "metadata": "{ \"version\": \"1.0.0\" }",
    "details": "{ \"events\": [...], \"eventCount\": 50 }"
}
```

Session ID and page ID are included at the batch level by EventCache, not per-event.

### Cost Controls Available to Customer

Session replay generates more data than standard RUM events. Here's how costs stay low:

-   **Batching (biggest cost saver):** AWS RUM charges $1 per 100,000 RUM events. Session replay batches many small recording events into a single RUM event (default: up to 50 per batch). This means 50 recording events count as 1 RUM event on your bill — not 50.
-   **Sample rates:** Two knobs control how many sessions get recorded:
    -   **Session sample rate** — already exists in RUM. Controls what percentage of user sessions are monitored at all. Example: `0.5` = 50% of sessions.
    -   **Session Replay sample rate** (`additionalSampleRate`) — applied on top of the session sample rate. Controls what percentage of _monitored_ sessions also get replay recorded.
-   **Session Replay flush interval** (default 10 seconds) - how often buffered RRWeb events are batched into a single RUM event (default: every 10 seconds).
-   **Session Replay batch size** (default 50) - also determines effective flush interval based on max size.

### Cost Factors that Cannot Be Controlled

-   **User Session length** — longer sessions produce more replay events
-   **Page complexity** — pages with frequent DOM changes (animations, live feeds) produce more data per flush
-   **End User Activity** — session is not recorded when end user is idle

### Final Additional Cost Estimation

-   Assuming 5-min avg session, 10s flush interval, and external RUM Price of $1 per 100K RUM events

> _Based on 1M visits/month. Actual costs vary with session length and page complexity._

| Session Sample Rate | Replay Sample Rate | Recorded Sessions/mo | Replay Events/mo | Additional Cost/mo |
| --- | --- | --- | --- | --- |
| 1.0 (100%) | 1.0 (100%) | 1,000,000 | 60,000,000 | $600.00 |
| 0.5 (50%) | 0.1 (10%) | 50,000 | 3,000,000 | $30.00 |
| 0.5 (50%) | 0.05 (5%) | 25,000 | 1,500,000 | $15.00 |
| 0.1 (10%) | 0.05 (5%) | 5,000 | 300,000 | $3.00 |

### Privacy Controls

All text and form inputs are hidden by default. Replays show `***` instead of real content. This is the safest starting point.

| What's Protected              | Default Behavior           | Can Be Changed? |
| ----------------------------- | -------------------------- | --------------- |
| All text on the page          | Masked (shows as `***`)    | Yes — opt out   |
| Form inputs (passwords, etc.) | Masked                     | Yes — opt out   |
| Images                        | Not recorded (not inlined) | Yes — opt in    |
| Cross-origin iframes          | Not recorded               | Yes — opt in    |

Developers can also use HTML classes to control specific elements:

-   `class="rr-block"` — completely hides an element from the recording
-   `class="rr-mask"` — replaces text with `***`

### Platform Support

| Platform         | Supported? | Notes                                   |
| ---------------- | ---------- | --------------------------------------- |
| Desktop browsers | ✅ Yes     | Chrome, Firefox, Safari, Edge           |
| iOS devices      | ✅ Yes     | Mouse tracking disabled for performance |
| Android devices  | ✅ Yes     | Full support                            |
| IE 11            | ❌ No      | Too old                                 |

### Bundle Size Impact

Session replay adds **zero bytes** to the default CDN bundle (`cwr.js`). It is only included when a developer explicitly imports it via NPM.

---

## 3. Low-Level Design

_Audience: engineers. Assumes familiarity with the RUM web client internals._

### 3A) RRWeb Event Types Reference

[rrweb](https://github.com/rrweb-io/rrweb) (record and replay the web) is the industry-standard open source library for session replay. It records DOM snapshots and mutations as JSON events with deterministic replay from the event stream.

**Event Types:**

| Type | Name | Description | Frequency | Size Impact |
| --- | --- | --- | --- | --- |
| 0 | DomContentLoaded | Initial page load marker | Once per page | <1KB |
| 2 | FullSnapshot | Complete DOM snapshot | Start + periodic checkouts | Large (50-200 KB) |
| 3 | IncrementalSnapshot | DOM mutations, interactions | Continuous | **99% of payload** |
| 4 | Meta | Viewport size, URL changes | On change | <1KB |
| 5 | Custom | Plugin-defined events | Varies | Varies |

**IncrementalSnapshot Sources (Type 3, responsible for 99% of payload):**

| Source | Name | Description | Size Impact |
| --- | --- | --- | --- |
| 0 | Mutation | DOM changes (add/remove/modify nodes) | **99% of incremental data** |
| 1 | MouseMove | Cursor position tracking | 0.7% |
| 2 | MouseInteraction | Clicks, focus, blur | 0.3% |
| 3 | Scroll | Scroll position changes | Minimal |
| 4 | ViewportResize | Window resize events | Minimal |
| 5 | Input | Form input changes (masked) | Minimal |

### 3B) RUM Session Replay Event Schema

The RRWebPlugin produces `SessionReplayEvent` payloads. EventCache wraps these into the standard RUM event envelope (`id`, `type`, `timestamp`, `metadata`).

**SessionReplayEvent details payload:**

```json
{
    "version": "1.0.0",
    "events": [
        { "type": 2, "data": {...}, "timestamp": 1737489376629 },
        { "type": 3, "data": {...}, "timestamp": 1737489376730 }
    ],
    "eventCount": 100
}
```

**Full RUM event envelope** (added by EventCache):

```json
{
    "id": "uuid-v4",
    "type": "com.amazon.rum.session_replay_event",
    "timestamp": 1737489376629,
    "metadata": "{ \"version\": \"1.0.0\" }",
    "details": "{ \"events\": [...], \"eventCount\": 100 }"
}
```

Session ID and page ID are included at the batch level by EventCache, not per-event.

### 3C) Configuration Details

Users pass a `Partial<RRWebPluginConfig>` when constructing the plugin.

```typescript
export type RRWebPluginConfig = {
    /** Probability (0-1) of recording, applied on top of sessionSampleRate.
     *  e.g. 0.05 additionalSampleRate × 0.5 sessionSampleRate = 2.5% effective rate */
    additionalSampleRate: number; // Default: 1.0

    /** Number of rrweb events to buffer before auto-flushing a batch. */
    batchSize: number; // Default: 50

    /** Milliseconds between automatic flushes of buffered events. */
    flushInterval: number; // Default: 5000 (5 seconds)

    /** Options forwarded directly to rrweb record(). */
    recordOptions: recordOptions<unknown>;
};
```

**Default production config:**

```typescript
export const RRWEB_CONFIG_PROD: RRWebPluginConfig = {
    additionalSampleRate: 1.0,
    batchSize: 50,
    flushInterval: 5000,
    recordOptions: {
        slimDOMOptions: 'all',
        inlineStylesheet: true,
        inlineImages: false,
        collectFonts: true,
        recordCrossOriginIframes: false,
        maskAllInputs: true,
        maskTextSelector: '*' // masks all text by default
    }
};
```

### 3D) Privacy Implementation Details

**Privacy rationale:**

-   `maskAllInputs: true` — all form inputs masked by default
-   `maskTextSelector: '*'` — all text content masked by default (used instead of `maskAllText` due to rrweb alpha API)
-   `blockSelector` — NOT used in defaults due to [rrweb bug #1486](https://github.com/rrweb-io/rrweb/issues/1486) (crashes on text nodes)
-   Users can relax masking by overriding `recordOptions`

### 3E) Compression

**Decision: Request-level gzip compression** via [PR #759](https://github.com/aws-observability/aws-rum-web/pull/759), NOT per-event `@rrweb/packer` web worker.

**Original proposal** was to compress replay events individually using `@rrweb/packer` in a web worker. This was rejected in favor of request-level gzip because:

-   Simpler architecture — no web worker needed
-   Compresses ALL event types in the PutRumEvents payload, not just replay
-   Gzip achieves comparable compression ratios (~80-90% reduction)
-   `@rrweb/packer` would add to bundle size; gzip is native via `CompressionStream`
-   Web worker approach can be revisited if needed for very large replay payloads

**Data flow (implemented):**

```
rrweb record() → RRWebPlugin buffer → flush() → EventCache → Dispatch
    → DataPlaneClient.sendFetch() → gzip compress entire request body → AWS RUM Backend
```

**Rough sizing:** A typical 5-minute session on a moderately complex page produces ~1-3 MB of uncompressed replay data. Gzip reduces this by ~80-90%, so ~200-600 KB is actually sent over the network per session.

### 3F) Plugin Lifecycle

RRWebPlugin extends `InternalPlugin` and uses the standard plugin lifecycle:

1. `load()` — receives PluginContext (inherited)
2. `enable()` — starts rrweb recording if session passes both sample-rate checks (sessionSampleRate × additionalSampleRate)
3. Events buffered; flushed on batchSize threshold, flushInterval timer, or page unload
4. `disable()` — stops recording and flushes remaining events

**Flush hook:** A `flush()` method was added to the `Plugin` interface. `EventCache.getEventBatch(flush=true)` calls `PluginManager.flush()` which iterates all plugins. This ensures buffered replay events are captured before page unload (visibilitychange → beacon).

### 3G) Platform Support Details

| Platform | Support Status | Mousemove Recording | Notes |
| --- | --- | --- | --- |
| Desktop (Chrome, Firefox, Safari, Edge) | ✅ Fully Supported | ✅ Enabled | Standard configuration |
| iOS (iPhone, iPad, iPod) | ✅ Supported | ❌ Disabled | Prevents main thread blocking |
| Android (Phone, Tablet) | ✅ Fully Supported | ✅ Enabled | No performance issues |
| IE 11 | ❌ Not Supported | N/A | Lacks ES6+ features |

### 3H) Bundle Impact

RRWebPlugin is NOT included in the CDN bundle (`cwr.js`). It is only exported from the NPM barrel (`index.ts`). Webpack tree-shakes rrweb out of the CDN build entirely — **0 KB impact** on `cwr.js`.

Users who import `RRWebPlugin` via NPM will pull in rrweb (~7 MB on disk, but only the `record` function is used).

## 4. Pre-release Status

PR [#762](https://github.com/aws-observability/aws-rum-web/pull/762) implements RRWebPlugin in pre-release mode.

**Pre-release means:**

-   NOT exposed in top-level `telemetries` configuration
-   NOT built into the CDN bundle
-   Users must manually import and install via `eventPluginsToLoad`
-   API may change before GA

### Usage (pre-release)

```typescript
import { AwsRum } from 'aws-rum-web';
import { RRWebPlugin } from 'aws-rum-web/plugins/event-plugins/RRWebPlugin';

const config = {
    telemetries: ['errors', 'performance', 'http'],
    eventPluginsToLoad: [
        new RRWebPlugin({
            additionalSampleRate: 0.05,
            batchSize: 25,
            recordOptions: {
                maskAllInputs: true,
                maskTextSelector: '*',
                slimDOMOptions: 'all',
                inlineStylesheet: true,
                inlineImages: false
            }
        })
    ]
};

const awsRum = new AwsRum('my-app', '1.0.0', 'us-west-2', config);
```

### Privacy Controls (HTML markup)

```html
<!-- Use rrweb default classes -->
<div class="rr-block">Blocked entirely from recording</div>
<p class="rr-mask">Text is masked as ***</p>

<!-- All text masked by default (maskTextSelector: '*') -->
<p>This text appears as *** in replay</p>
<input type="text" value="masked by default" />
```

## 5. Remaining Work

### Blocking GA release

-   Enable gzip compression by default — currently implemented but not enabled by default
-   [SendBeacon 65 KB limit](https://github.com/aws-observability/aws-rum-web/issues/761) — replay batches may exceed beacon size limit
-   [Slim Build](https://github.com/aws-observability/aws-rum-web/issues/507) — monorepo restructure in progress (Phase 1 + 2a done, Phase 2b planned)
-   Backend requirements for replay storage and playback
-   `blockSelector` fix — waiting on rrweb upstream or version upgrade past 2.0.0-alpha.4

### Post-GA

-   `maxRecordingDuration` — cap recording length per session
-   Expose via `telemetries: ['session_replay']` config (requires Orchestration integration)
-   CDN loader script (`loader-session-replay.js`)
-   Smoke tests across browsers/devices
-   "Only record errored sessions" — offline buffering + retroactive decision
-   Cost estimation guidance for customers

## 6. Engineering Plan

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| 1 | Setup local PutRumEvents endpoint with custom UI | ✅ Done | PR #755 |
| 2 | Schema for RUM Session Replay event | ✅ Done | Simplified from design — no per-event compression fields |
| 3 | Design review | ✅ Done | This document |
| 4 | Validate privacy configurations | 🔄 Partial | `maskTextSelector: '*'` works; `blockSelector` blocked by rrweb bug |
| 5 | Implement compression | ✅ Done | Request-level gzip (PR #759), not per-event @rrweb/packer |
| 6 | Implement RRWebPlugin + flush hook | ✅ Done | PR #762 |
| 7 | Visual correlation in local UI | 🔄 In progress | SessionReplayTab in aws-rum-web-ui |
| 8 | Validate platform/device support | ⬜ TODO | Needs cross-browser testing |
| 9 | Slim build (monorepo) | 🔄 In progress | Phase 1 + 2a done, Phase 2b planned |
| 10 | Resolve beacon 65KB limit | ⬜ TODO | Issue #761 |
