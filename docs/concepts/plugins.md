# Plugins

Every piece of instrumentation in the web client is a **plugin**. A plugin observes some part of the page (the DOM, `fetch`, the performance API, ...) and emits RUM events.

## Built-in plugins

| Plugin | Telemetry group | Emits |
| --- | --- | --- |
| `JsErrorPlugin` | `errors` | `com.amazon.rum.js_error_event` |
| `NavigationPlugin` | `performance` | `com.amazon.rum.performance_navigation_event` |
| `ResourcePlugin` | `performance` | `com.amazon.rum.performance_resource_event` |
| `WebVitalsPlugin` | `performance` | LCP / FID / CLS / INP events |
| `FetchPlugin` | `http` | `com.amazon.rum.http_event`, optional `com.amazon.rum.xray_trace_event` |
| `XhrPlugin` | `http` | same as `FetchPlugin` |
| `DomEventPlugin` | `interaction` | `com.amazon.rum.dom_event` |
| `PageViewPlugin` | — (always on) | `com.amazon.rum.page_view_event` |
| `RRWebPlugin` | `replay` | `com.amazon.rum.rrweb_event` |
| `TTIPlugin` | — (opt-in) | `com.amazon.rum.time_to_interactive_event` |

## Enabling plugins

For built-in plugins, use the `telemetries` config. Each entry is either the telemetry name or a `[name, config]` tuple:

```javascript
{
    telemetries: [
        'errors',
        ['http', { recordAllRequests: true }],
        ['performance', { eventLimit: 20 }]
    ];
}
```

See [Telemetry Config Array](../configuration.md#telemetry-config-array) for each group's options.

## Custom plugins

Implement the `Plugin` interface and register either at construction or at runtime:

```typescript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';
import { MyCustomPlugin } from './my-custom-plugin';

// At construction
const config: AwsRumConfig = {
    eventPluginsToLoad: [new MyCustomPlugin()]
};

// Or after construction
awsRum.addPlugin(new MyCustomPlugin());
```

See [examples.md](../examples.md#record-custom-events-using-a-plugin) for a full implementation.

## Opt-in plugins

`TTIPlugin` is exported but not loaded by any telemetry group. Add it via `eventPluginsToLoad` or `addPlugin`:

```typescript
import { AwsRum, TTIPlugin } from 'aws-rum-web';
awsRum.addPlugin(new TTIPlugin());
```
