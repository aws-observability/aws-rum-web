# Executing Commands

Applications interact with the web client either through its command queue (embedded script install), or its API (JavaScript module install).

**Embedded script command queue**

The command queue is accessed through a global variable (named `cwr` by default). The command queue is a function which stores commands that will be executed asynchronously by the web client. Commands may be sent to the web client using the command queue after the snippet has executed.

**JavaScript module API**

Commands may be sent to the web client using the API after the `AwsRum` class has been instantiated.

## Examples

In the following example, the snippet has disabled automated page view recording
and has not provided AWS credentials. Following the snippet, the application
manually records a page view and forwards AWS credentials to the web client.

**Embedded script example**
```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
        {
            disableAutoPageView: true
        }
    );
    cwr('recordPageView', window.location.hash);
    const awsCreds = localStorage.getItem('customAwsCreds');
    if(awsCreds) cwr('setAwsCredentials', awsCreds)
</script>
```

**JavaScript module example**
```typescript
const awsRum: AwsRum = new AwsRum(
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    { disableAutoPageView: true }
);
awsRum.recordPageView(window.location.hash);
const credentialProvider = new CustomCredentialProvider();
if(awsCreds) awsRum.setAwsCredentials(credentialProvider);
```

## Commands

| Command | Parameter Type | Example <div style="width:265px"></div> | Description |
| --- | --- | --- | --- |
| allowCookies | Boolean | `cwr('allowCookies', true);`<br/><br/>`awsRum.allowCookies(true)` | Enable the web client to set and read two cookies: a session cookie named `cwr_s` and a user cookie named `cwr_u`.<br/><br/>`cwr_s` stores session data including an anonymous session ID (uuid v4) created by the web client. This allows CloudWatch RUM to compute session metrics like errors per session.<br/><br/>`cwr_u` stores an anonymous user ID (uuid v4) created by the web client. This allows CloudWatch RUM to count return visitors.<br/><br/>`true`: the web client will use cookies<br/>`false`: the web client will not use cookies
| disable | None | `cwr('disable');`<br/><br/>`awsRum.disable();` | Stop recording and dispatching RUM events.
| dispatch | None | `cwr('dispatch');`<br/><br/>`awsRum.dispatch();` | Flush RUM events from the cache and dispatch them to CloudWatch RUM using [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). 
| dispatchBeacon | None | `cwr('dispatchBeacon');`<br/><br/>`awsRum.dispatchBeacon();` | Flush RUM events from the cache and dispatch them to CloudWatch RUM using [`sendBeacon`](https://developer.mozilla.org/en-US/docs/Web/API/Beacon_API). 
| enable | None | `cwr('enable');`<br/><br/>`awsRum.enable();` | Start recording and dispatching RUM events.
| addSessionAttributes | [MetadataAttributes](https://github.com/aws-observability/aws-rum-web/blob/main/docs/configuration.md#metadataattributes)| `cwr('addSessionAttributes', { applicationVersion: '1.3.8' });` <br/><br/> `awsRum.addSessionAttributes({ applicationVersion: '1.3.8' });`| Add custom attributes to the metadata of all events in the session.
| recordPageView | String \| [PageView](#pageview) | Record a page view: <br/> `cwr('recordPageView', '/home');`<br/><br/>`awsRum.recordPageView('/home')`<br/><br/> Record a page view with tags: <br/>`cwr('recordPageView', { pageId: '/home', pageTags: ['en', 'landing'] });` <br/><br/> `awsRum.recordPageView({ pageId: '/home', pageTags: ['en', 'landing'] });` <br/><br/> Record a page view with custom metadata attributes: <br/>`cwr('recordPageView', { pageId: '/home', pageAttributes: { pageOrder: 1, template: 'studio' }});` <br/><br/> `awsRum.recordPageView({ pageId: '/home', pageAttributes: { pageOrder: 1, template: 'studio' }});`| Record a page view event.<br/><br/> If you wish to manually record page views instead of using the web client's page view automation, you must  disable the automation using the `disableAutoPageView` configuration option, and instrument your application to record page views using  the `recordPageView` command.<br/><br/>You can tag pages by setting the `pageTags` property, which is an array of strings. Later, you can use these tags to group pages when aggregating data. <br/><br/>You can add custom attributes to the metadata of all events that occur on this page.
| recordError | Error \|&nbsp;ErrorEvent \|&nbsp;String | `try {...} catch(e) { cwr('recordError', e); }`<br/><br/>`try {...} catch(e) { awsRum.recordError(e); }` | Record a caught error.
| recordEvent | [Event](#event) | `cwr('recordEvent', {type: 'your_event_type', data: {field1: 1, field2: 2}})` <br/><br/> `awsRum.recordEvent('your_event_type', {field1: 1, field2: 2})` | Record a custom event.<br/><br/> Event types must conform to the following regex: `^[a-zA-Z0-9_.-]{1,256}$`. <br/><br/>Each custom event, including metadata, must be less than 6 KB. Events over 6KB are dropped by CloudWatch RUM.
| registerDomEvents | Array | `cwr('registerDomEvents', [{ event: 'click', cssLocator: '[label="label1"]' }]);`<br/><br/>`awsRum.registerDomEvent([{ event: 'click', cssLocator: '[label="label1"]' }]);` | Register target DOM events to record. The target DOM events will be added to existing target DOM events. The parameter type is equivalent to the `events` property type of the [interaction telemetry configuration](https://github.com/aws-observability/aws-rum-web/blob/main/docs/cdn_installation.md#interaction).
| setAwsCredentials | [Credentials](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html) \|&nbsp;[CredentialProvider](https://www.npmjs.com/package/@aws-sdk/credential-providers) | `cwr('setAwsCredentials', cred);`<br/><br/>`awsRum.setAwsCredentials(cred);` | Forward AWS credentials to the web client. The web client requires AWS credentials with permission to call the `PutRumEvents` API. If you have not set `identityPoolId` and `guestRoleArn` in the web client configuration, you must forward AWS credentials to the web client using this command.

## PageView
| Field Name | Type | Default | Example | Description |
| --- | --- | --- | --- | --- |
| pageId | String | This is a required field. | `'/home'` | A unique identifier for the current view. |
| pageTags | String[] | `[]` | `['en', 'landing']` | An array of tags for the current view. |
| pageAttributes | `{ [key: string]: string \| number \| boolean }` | N/A | `{ 'pageOrder': 1`, `'template': 'studio' }`  | An attribute which will be added to the metadata of all events which are recorded on this page.<br/><br/> Keys must conform to the following regex: `^(?!pageTags)(?!aws:)[a-zA-Z0-9_:]{1,128}$`.<br/><br/>Values can have up to 256 characters and must be of type `string`, `number`, or `boolean`.|

You may add up to 10 custom attributes per event. The 10 attribute limit applies to the combined total of session attributes and page attributes. Any attributes that exceed this limit will be dropped. For example, 6 custom session attributes + 4 custom page attributes totals 10 custom attributes and falls within the limit. However, 6 custom attributes + 5 custom page attributes total 11 custom attributes and one of these custom attributes will be dropped.

AWS reserves the namespace prefix `aws:` for its attributes. Do not create
custom attributes with the `aws:` prefix, or they may be overwritten by future
versions of the CloudWatch RUM web client.

The RUM web client also records a set of [default
attributes](https://github.com/aws-observability/aws-rum-web/blob/main/src/event-schemas/meta-data.json).
You cannot overwrite default attributes with custom attributes.

## Event
| Field Name | Type | Default | Example | Description |
| --- | --- | --- | --- | --- |
| type | String | This is a required field. | `'your_event_type'` | A unique identifier for the event type. Event types must conform to the following regex: `^[a-zA-Z0-9_.-]{1,256}$`. |
| data | Object | This is a required field. | `{ field1: 1, field2: 2 }` | A JavaScript object. This object will be serialized as JSON and sent to CloudWatch RUM. |

Note that the call signature differs depending on the installation method.

App monitors must have custom events `ENABLED` to ingest custom events. You can edit the configuration of your app monitor via CLI or the RUM console.

**Embedded script** -- wrap the `type` and `data` arguments in an object. For example:
```
cwr('recordEvent', {type: 'your_event_type', data: {field1: 1, field2: 2}})
```

**JavaScript module** -- pass `type` and `data` to `recordEvent` as arguments. For example:
```
awsRum.recordEvent('your_event_type', {field1: 1, field2: 2})
```