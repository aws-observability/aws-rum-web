# Plugins

The web client's instrumentation is organized as plugins. Most plugins are grouped into **telemetries** (`errors`, `performance`, `http`, `interaction`, `replay`) and enabled via the [`telemetries` config](../configuration.md#telemetry-config-array).

This page is a quick reference. For end-to-end configuration options, see [`configuration.md`](../configuration.md); for the mental model, see [`concepts/plugins`](../concepts/plugins.md).

## Plugin index

| Plugin | ID | Event type | Telemetry | Configured via |
| --- | --- | --- | --- | --- |
| [JsErrorPlugin](#jserrorplugin) | `js-error` | `com.amazon.rum.js_error_event` | `errors` | [Errors](../configuration.md#errors) |
| [NavigationPlugin](#navigationplugin) | `navigation` | `com.amazon.rum.performance_navigation_event` | `performance` | [Performance](../configuration.md#performance) |
| [ResourcePlugin](#resourceplugin) | `resource` | `com.amazon.rum.performance_resource_event` | `performance` | [Performance](../configuration.md#performance) |
| [WebVitalsPlugin](#webvitalsplugin) | `web-vitals` | LCP / FID / CLS / INP events | `performance` | [Performance](../configuration.md#performance) |
| [FetchPlugin](#fetchplugin--xhrplugin) | `fetch` | `com.amazon.rum.http_event` (+ X-Ray) | `http` | [HTTP](../configuration.md#http) |
| [XhrPlugin](#fetchplugin--xhrplugin) | `xhr` | `com.amazon.rum.http_event` (+ X-Ray) | `http` | [HTTP](../configuration.md#http) |
| [DomEventPlugin](#domeventplugin) | `dom-event` | `com.amazon.rum.dom_event` | `interaction` | [Interaction](../configuration.md#interaction) |
| [PageViewPlugin](#pageviewplugin) | `page-view` | `com.amazon.rum.page_view_event` | — (always on) | `disableAutoPageView` |
| [RRWebPlugin](./RRWebPlugin.md) | `rrweb` | `com.amazon.rum.rrweb_event` | `replay` | [RRWebPlugin](./RRWebPlugin.md) |
| [TTIPlugin](#ttiplugin) | `time-to-interactive` | `com.amazon.rum.time_to_interactive_event` | — (opt-in) | `eventPluginsToLoad` |

## Plugins

### JsErrorPlugin

Listens for uncaught errors and unhandled promise rejections via `window.addEventListener('error' | 'unhandledrejection')`. Caught errors can be recorded manually with `awsRum.recordError(e)`.

Configured under the `errors` telemetry. Options: `stackTraceLength`, `ignore`. See [Errors](../configuration.md#errors).

### NavigationPlugin

Records the browser's single-page navigation timing (`PerformanceNavigationTiming`): DNS, TCP, request, response, DOM, load. One event per hard navigation.

No plugin-specific options. Controlled by the top-level `pagesToInclude` / `pagesToExclude` filters.

### ResourcePlugin

Records load timing for resources (images, scripts, stylesheets, fonts, documents) via `PerformanceResourceTiming`.

Options: `eventLimit`, `ignore`, `recordAllTypes`, `sampleTypes`. See [Performance](../configuration.md#performance).

### WebVitalsPlugin

Records Core Web Vitals using the [`web-vitals`](https://github.com/GoogleChrome/web-vitals) library: LCP, FID, CLS, INP. Consumes navigation + resource data to attribute each metric to a specific resource where possible.

Options: `reportAllLCP`, `reportAllCLS`, `reportAllINP`. See [Performance](../configuration.md#performance).

### FetchPlugin / XhrPlugin

Instruments HTTP traffic by monkey-patching `window.fetch` and `XMLHttpRequest`. Records one event per request containing method, URL, status, latency, and (optionally) a stack trace of the initiating call.

Options: `urlsToInclude`, `urlsToExclude`, `recordAllRequests`, `stackTraceLength`, `addXRayTraceIdHeader`. See [HTTP](../configuration.md#http).

When `enableXRay: true`, these plugins also emit `com.amazon.rum.xray_trace_event` for X-Ray. When `enableW3CTraceId: true` **and** `addXRayTraceIdHeader` is set, a W3C `traceparent` header is used instead of `X-Amzn-Trace-Id`.

### DomEventPlugin

Records configured DOM events (clicks, etc.). **Disabled by default** — you must add the `interaction` telemetry and provide an `events` array.

Options: `events`, `enableMutationObserver`, `interactionId`. See [Interaction](../configuration.md#interaction).

### PageViewPlugin

Emits a `com.amazon.rum.page_view_event` on the initial page load and on `history.pushState` / `replaceState` (for SPAs). Always loaded unless `disableAutoPageView: true` is set.

To record page views manually, disable this plugin and call `awsRum.recordPageView(...)`.

### TTIPlugin

Records time-to-interactive. Not included in any telemetry group — opt-in only:

```typescript
import { AwsRum, TTIPlugin } from 'aws-rum-web';
awsRum.addPlugin(new TTIPlugin());
```

### RRWebPlugin

Session replay via [rrweb](https://github.com/rrweb-io/rrweb). Privacy-enforced (all text and inputs masked). Full documentation: **[RRWebPlugin](./RRWebPlugin.md)**.
