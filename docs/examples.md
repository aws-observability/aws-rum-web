# Usage Examples

## Runnable demos

The [`Examples/`](../Examples) directory ships three end-to-end demos that run against a local debug server with no AWS account required:

| Demo | Install path | Port | What it shows |
| --- | --- | --- | --- |
| [`aws-rum-web-ui`](../Examples/aws-rum-web-ui) | — | `5200` (UI) / `3000` (data plane) | Local Express receiver + React UI that captures and visualizes RUM payloads. Start this first. |
| [`spa-react-demo`](../Examples/spa-react-demo) | NPM (`@aws-rum/web-slim`) | `5210` | Single-page React app. Validates SPA page-view tracking, route changes, fetch instrumentation, and session replay. |
| [`mpa-cdn-demo`](../Examples/mpa-cdn-demo) | CDN snippet | `5220` | Plain multi-page site that loads `cwr.js` via the embedded snippet. Validates hard navigations, the `cwr(...)` command queue, and session continuity across page loads. |

See each demo's `README.md` for setup.

## Record custom events using `recordEvent`

> **:warning: The CloudWatch RUM app monitor must have custom events enabled.**
>
> To send custom events to a CloudWatch RUM app monitor, you must first configure your app monitor to accept custom events. See [_Send custom events_](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html) in the CloudWatch RUM user guide.

Call `recordEvent` directly from the application when the event occurs on a single page, and does not need to maintain state.

**Embedded script (CDN) installations**

```
cwr('recordEvent', {type: 'your_event_type', data: {field1: 1, field2: 2}})
```

**JavaScript module installations**

```
awsRum.recordEvent('your_event_type', {field1: 1, field2: 2})
```

See [API reference: Event](./reference/api.md#event).

## Record custom events using a plugin

> **:warning: The CloudWatch RUM app monitor must have custom events enabled.**
>
> To send custom events to a CloudWatch RUM app monitor, you must first configure your app monitor to accept custom events. See [_Send custom events_](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html) in the CloudWatch RUM user guide.

Create a plugin when the event being recorded can occur on multiple pages, or needs to maintain state. To record events using a plugin, you must:

1. Create a plugin by implementing the [Plugin](https://github.com/aws-observability/aws-rum-web/blob/main/src/plugins/Plugin.ts) interface.
2. Install the plugin by adding it to the web client configuration.

**Step 1:** Create a plugin by implementing the [Plugin](https://github.com/aws-observability/aws-rum-web/blob/main/src/plugins/Plugin.ts) interface.

For example, the following plugin records an event whenever the end-user scrolls.

```typescript
class MyScrollEventPlugin implements Plugin {
    protected context!: PluginContext;
    private bufferedEvents: any[] = [];

    constructor() {
        this.id = 'MyScrollEventPlugin';
    }

    load(context: PluginContext) {
        this.context = context;
        this.enable();
    }

    enable() {
        window.addEventListener('scroll', this.eventHandler);
    }

    disable() {
        window.removeEventListender('scroll', this.eventHandler);
    }

    getPluginId() {
        return this.id;
    }

    // Optional: flush any buffered events. Called by the web client during
    // page unload so buffered data is not lost. Implement this method when
    // your plugin batches events before recording them.
    flush() {
        if (this.bufferedEvents.length > 0) {
            this.context.record('my_scroll_events', {
                events: this.bufferedEvents
            });
            this.bufferedEvents = [];
        }
    }

    private eventHandler = (scrollEvent: Event) => {
        this.bufferedEvents.push({ elementId: scrollEvent.target.id });
    };
}
```

**Step 2:** Install the plugin.

For example, the following code snippet instantiates `MyScrollEventPlugin` and installs it in the web client.

```typescript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

try {
    const myScrollEventPlugin: MyScrollEventPlugin = new MyScrollEventPlugin();

    const config: AwsRumConfig = {
        identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
        sessionSampleRate: 1,
        telemetries: ['errors', 'performance'],
        eventPluginsToLoad: [myScrollEventPlugin]
    };

    const APPLICATION_ID: string = '00000000-0000-0000-0000-000000000000';
    const APPLICATION_VERSION: string = '1.0.0';
    const APPLICATION_REGION: string = 'us-west-2';

    const awsRum: AwsRum = new AwsRum(
        APPLICATION_ID,
        APPLICATION_VERSION,
        APPLICATION_REGION,
        config
    );
} catch (error) {
    // Ignore errors thrown during CloudWatch RUM web client initialization
}
```

Alternatively, you can install the plugin after initializing the web client by calling `addPlugin`. For example, the following code snippet instantiates `MyScrollEventPlugin` and installs it in the web client.

```typescript
const myScrollEventPlugin: MyScrollEventPlugin = new MyScrollEventPlugin();
awsRum.addPlugin(myScrollEventPlugin);
```
