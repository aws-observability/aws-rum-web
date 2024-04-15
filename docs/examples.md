# Usage Examples

## Record custom events using `recordEvent`

> **:warning: The CloudWatch RUM app monitor must have custom events enabled.**
>
> To send custom events to a CloudWatch RUM app monitor, you must first
> configure your app monitor to accept custom events. See
> [*Send custom events*](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html)
> in the CloudWatch RUM user guide.

Call `recordEvent` directly from the application when the event occurs on a single page, and does not need to maintain state.

**Embedded script (CDN) installations**
```
cwr('recordEvent', {type: 'your_event_type', data: {field1: 1, field2: 2}})
```

**JavaScript module installations**
```
awsRum.recordEvent('your_event_type', {field1: 1, field2: 2})
```

See [Executing Commands: Events](cdn_commands.md#Events).

## Record custom events using a plugin

> **:warning: The CloudWatch RUM app monitor must have custom events enabled.**
>
> To send custom events to a CloudWatch RUM app monitor, you must first
> configure your app monitor to accept custom events. See
> [*Send custom events*](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html)
> in the CloudWatch RUM user guide.

Create a plugin when the event being recorded can occur on multiple pages, or needs to maintain state. To record events using a plugin, you must:
1. Create a plugin by implementing the
[Plugin](https://github.com/aws-observability/aws-rum-web/blob/main/src/plugins/Plugin.ts)
interface.
2. Install the plugin by adding it to the web client configuration.

**Step 1:** Create a plugin by implementing the
[Plugin](https://github.com/aws-observability/aws-rum-web/blob/main/src/plugins/Plugin.ts) interface.

For example, the following plugin records an event whenever the end-user scrolls.
```typescript
class MyScrollEventPlugin implements Plugin {

    protected context!: PluginContext;

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

    private eventHandler = (scrollEvent: Event) => {
        this.record({elementId: scrollEvent.target.id})
    }
}
```

**Step 2:** Install the plugin.

For example, the following code snippet instantiates `MyScrollEventPlugin` and
installs it in the web client.

```typescript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

try {
  const myScrollEventPlugin: MyScrollEventPlugin = new MyScrollEventPlugin();

  const config: AwsRumConfig = {
    identityPoolId: "us-west-2:00000000-0000-0000-0000-000000000000",
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

Alternatively, you can install the plugin after initializing the web client by
calling `addPlugin`. For example, the following code snippet instantiates 
`MyScrollEventPlugin` and installs it in the web client.

```typescript
const myScrollEventPlugin: MyScrollEventPlugin = new MyScrollEventPlugin();
awsRum.addplugin(myScrollEventPlugin);
```
