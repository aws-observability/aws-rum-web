# Using CloudWatch RUM Web Client to Record Custom Events
CloudWatch RUM now allows users to record custom events. The `recordEvent` API will allow you to record custom events by passing in two inputs, `type` and `data`. 
On the other hand, you can also implement a custom Plugin that can be designed and implemented to fit your use cases and applications and record custom events using your custom Plugin.

If you are seeking a simple option, we recommend you use the `recordEvent` API. On the other hand, if your use case is complex and requires customization, we recommend that you implement a custom Plugin.

-----------------
## Record events using the API
If you are using **CDN** to install the web client:
```
cwr('recordEvent', {type: string, data: object})

Ex) cwr('recordEvent', {type: 'your_event_type', data: {field1: 1, field2: 2, ..., fieldN: 'N'}})
```

If you are using **NPM** to install the web client:
```
recordEvent(type: string, data: object)

Ex) awsRum.recordEvent('your_event_type', {field1: 1, field2: 2, ..., fieldN: 'N'})
```

### `type`
The `type` field refers to the *type* or *name* of your event. For example, CW RUM's `JsError` object's `event_type` is `com.amazon.rum.js_error_event`. 


### `data`
The `data` field contains the actual data you wish to record using the web client. `event_data` must be an object that consists of field and values.

--------------
## Record events using a customized plugin
If your use cases are more complex and tightly coupled with your application, you may benefit from implementing your own plugin. You can implement CW RUM Web Client's Plugin interface to automatically capture application specific events and record the events and introduce complex logic to handle different use cases, similar to the built-in plugins RUM Web Client provides. 

Example custom plugin to record on `scroll` events
```typescript
class MyCustomPlugin implements Plugin {
    // Initialize MyCustomPlugin
    constructor() {
        this.enabled;
        this.context;
        this.id = 'custom_event_plugin';
    }

    // Load MyCustomPlugin
    load(context) {
        this.context = context;
        this.enable();
    }

    // Turn on MyCustomPlugin
    enable() {
        this.enabled = true;
        this.addEventHandler();
    }

    // Turn off MyCustomPlugin
    disable() {
        this.disabled = false;
        this.removeEventHandler();
    }

    // Return MyCustomPlugin Id
    getPluginId() {
        return this.id;
    }

    // Record custom event
    record(data) {
        this.context.record('custom_scroll_event', data);
    }

    // EventHandler
    private eventHandler = (scrollEvent: Event) => {
        this.record({timestamp: Date.now()})
    }

    // Attach an eventHandler to scroll event
    private addEventHandler(): void {
        window.addEventListener('scroll', this.eventHandler);
    }

    // Detach eventHandler from scroll event
    private removeEventHandler(): void {
        window.removeEventListender('scroll', this.eventHandler);
    }
}
```
This custom plugin will record an event with one field, `timestamp`, that holds the time at which a `scroll` event happened. You can refer to RUM Web Client's built-in plugins for more examples to help you implement your customized plugin.

Once your plugin is initialized in your web app, you need to register the plugin with the Web Client's PluginManager.
If you wish to add your plugin during the initialization of the web client, add your plugin into the web client's `eventPluginsToLoad` field:

```typescript
{
    allowCookies: true,
    endpoint: "https://dataplane.rum.us-west-2.amazonaws.com",
    guestRoleArn: "arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth",
    identityPoolId: "us-west-2:00000000-0000-0000-0000-000000000000",
    sessionSampleRate: 1,
    telemetries: ['errors', 'performance', 'http'],
    eventPluginsToLoad: [myCustomPlugin]
}
```

If you have a plugin that needs to be added later on, you may directly use the `addPlugin` API provided by the web client:

```
addPlugin(plugin: Plugin)

Ex) awsRum.addPlugin(this.myCustomPlugin)
```

Once your plugin has been registered, you can now use your plugin to record events.