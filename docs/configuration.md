# Application-specific Configurations

The application being monitored must provided an application-specific configuration to the CloudWatch RUM web client. The configuration tells the web client what to monitor and how to monitor.

For example, the config object may look similar to the following:

```javascript
{
    allowCookies: true,
    endpoint: "https://dataplane.rum.us-west-2.amazonaws.com",
    identityPoolId: "us-west-2:00000000-0000-0000-0000-000000000000",
    sessionSampleRate: 1,
    telemetries: ['errors', 'performance', 'http']
}
```

## Configuration Options

| Field Name | Type | Default | Description |
| --- | --- | --- | --- |
| allowCookies | Boolean | `false` | Enable the web client to set and read two cookies: a session cookie named `cwr_s` and a user cookie named `cwr_u`.<br/><br/>`cwr_s` stores session data including an anonymous session ID (uuid v4) created by the web client. This allows CloudWatch RUM to compute sessionized metrics like errors per session.<br/><br/>`cwr_u` stores an anonymous user ID (uuid v4) created by the web client. This allows CloudWatch RUM to count return visitors.<br/><br/>`true`: the web client will use cookies<br/>`false`: the web client will not use cookies. |
| releaseId | String | `undefined` | The releaseId will be used to retrieve source map(s), if any, when RUM service unminifies JavaScript error stack traces. It should be unique to each application release and match regex ^[a-zA-Z0-9_\-:/\.]{1,200}$, including size limit of 200. |
| cookieAttributes | [CookieAttributes](#cookieattributes) | `{ domain: window.location.hostname, path: '/', sameSite: 'Strict', secure: true, unique: false } ` | Cookie attributes are applied to all cookies stored by the web client, including `cwr_s` and `cwr_u`. |
| debug | Boolean | `false` | When this field is `true`, the web client will output detailed debug logs to the browser console. These logs include session lifecycle events, plugin operations, dispatch activities, and error details. Debug logs are prefixed with `[aws-rum-web:ClassName.methodName]` for easy identification.<br/><br/>**Note:** Debug mode should only be enabled during development or troubleshooting as it may impact performance and expose internal operations. |
| sessionAttributes | [MetadataAttributes](#metadataattributes) | `{}` | Session attributes will be added the metadata of all events in the session. |
| disableAutoPageView | Boolean | `false` | When this field is `false`, the web client will automatically record page views.<br/><br/>By default, the web client records page views when (1) the page first loads and (2) the browser's [history API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) is called. The page ID is `window.location.pathname`.<br/><br/>In some cases, the web client's instrumentation will not record the desired page ID. In this case, the web client's page view automation must be disabled using the `disableAutoPageView` configuration, and the application must be instrumented to record page views using the `recordPageView` command. |
| enableRumClient | Boolean | `true` | When this field is `true`, the web client will record and dispatch RUM events. |
| enableXRay | Boolean | `false` | When this field is `true` **and** the `http` telemetry is used, the web client will record X-Ray traces for HTTP requests.<br/><br/>See the [HTTP telemetry configuration](#http) for more information, including how to connect client-side and server-side traces. |
| enableW3CTraceId | Boolean | `false` | When this field is `true` **and** the `enableXRay` field is `true` **and** the `http` telemetry is used, the web client will record X-Ray traces for HTTP requests in the W3C trace ID format.<br/><br/>Note that existing X-Ray headers will be ignored if this is enabled, and existing W3C headers will be ignored if this is disabled.<br/><br/>See the [W3C Trace Format Specification](https://www.w3.org/TR/trace-context/) for more information. |
| endpoint | String | `'https://dataplane.rum.[region].amazonaws.com'`<br/><br/>`'https://[restapi_id].execute-api.[region].amazonaws.com/[stage_name]/'` | The URL of the CloudWatch RUM API where data will be sent.<br/><br/>You may include a path prefix like `/stage_name/` in the endpoint URL if there is a proxy between your web application and CloudWatch RUM. |
| eventPluginsToLoad | [Plugin](examples.md#record-custom-events-using-a-plugin)[] | `[]` | The set of custom plugins to load. See [usage examples](examples.md#record-custom-events-using-a-plugin). |
| guestRoleArn | String | `undefined` | The ARN of the AWS IAM role that will be assumed during anonymous authorization.<br/><br/>When `guestRoleArn` and `identityPoolId` are both set, the web client will use Cognito's [basic (classic) authflow](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html).<br/><br/>When only `identityPoolId` is set, the web client will use Cognito's [enhanced (simplified) authflow](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html) (recommended). |
| identityPoolId | String | `undefined` | The Amazon Cognito Identity Pool ID that will be used during anonymous authorization.<br/><br/>When `identityPoolId` is set, the web client will use Cognito to retrieve temporary AWS credentials. These credentials authorize the bearer to send data to the CloudWatch RUM app monitor.<br/><br/>When`identityPoolId` is not set, you must either (A) forward credentials to the web client using the `setAwsCredentials` command, or (B) use a proxy and set `signing` to `false`. |
| alias | String | `undefined` | Adds an alias to all PutRumEvents requests. This will be compared against the `rum:alias` service context key in the resource based policy attached to a RUM app monitor. To learn more about how to use resource based policies with RUM, see [here](http://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-resource-policies.html). |
| pageIdFormat | String | `'PATH'` | The portion of the `window.location` that will be used as the page ID. Options include `PATH`, `HASH` and `PATH_AND_HASH`.<br/><br/>For example, consider the URL `https://amazonaws.com/home?param=true#content`<br/><br/>`PATH`: `/home`<br/>`HASH`: `#content`<br/>`PATH_AND_HASH`: `/home#content` |
| pagesToInclude | RegExp[] | `[/.*/]` | A list of regular expressions which specify the `window.location` values for which the web client will record data, unless explicitly excluded by `pagesToExclude`. Pages are matched using the `RegExp.test()` function.<br/><br/>For example, when `pagesToInclude: [ /\/home/ ]`, then data from `https://amazonaws.com/home` will be included, and `https://amazonaws.com/` will not be included. |
| pagesToExclude | RegExp[] | `[]` | A list of regular expressions which specify the `window.location` values for which the web client will not record data. Pages are matched using the `RegExp.test()` function.<br/><br/>For example, when `pagesToExclude: [ /\/home/ ]`, then data from `https://amazonaws.com/home` will be excluded, and `https://amazonaws.com/` will not be excluded. |
| recordResourceUrl | Boolean | `true` | When this field is `false`, the web client will not record the URLs of resources downloaded by your application.<br/><br/> Some types of resources (e.g., profile images) may be referenced by URLs which contain PII. If this applies to your application, you must set this field to `false` to comply with CloudWatch RUM's shared responsibility model. |
| routeChangeComplete | Number | `100` | The interval (in milliseconds) for which when no HTTP or DOM activity has been observed, an active route change is marked as complete. Note that `routeChangeComplete` must be strictly less than `routeChangeTimeout`. |
| routeChangeTimeout | Number | `10000` | The maximum time (in milliseconds) a route change may take. If a route change does not complete before the timeout, no timing data is recorded for the route change. If your application's route changes may take longer than the default timeout (i.e., more than 10 second), you should increase the value of the timeout. |
| sessionEventLimit | Number | `200` | The maximum number of events to record during a single session. If set to `0`, the limit is removed and all events in the session will be recorded. |
| sessionSampleRate | Number | `1` | The proportion of sessions that will be recorded by the web client, specified as a unit interval (a number greater than or equal to 0 and less than or equal to 1). When this field is `0`, no sessions will be recorded. When this field is `1`, all sessions will be recorded. |
| signing | Boolean | true | When this field is `true`, the web client signs [RUM data](https://docs.aws.amazon.com/cloudwatchrum/latest/APIReference/API_PutRumEvents.html) using [SigV4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html).<br/><br/>When this field is `false`, the web client does not sign [RUM data](https://docs.aws.amazon.com/cloudwatchrum/latest/APIReference/API_PutRumEvents.html).<br/><br/>Set this field to `false` only when sending RUM data to CloudWatch RUM through an unauthenticated proxy. This field **must be `true`** when sending RUM data directly to CloudWatch RUM. |
| telemetries | [Telemetry Config Array](#telemetry-config-array) | `[]` | See [Telemetry Config Array](#telemetry-config-array) |
| batchLimit | Number | `100` | The maximum number of events that will be sent in one batch of RUM events. |
| dispatchInterval | Number | `5000` | The frequency (in milliseconds) in which the webclient will dispatch a batch of RUM events. RUM events are first cached and then automatically dispatched at this set interval. |
| eventCacheSize | Number | `1000` | The maximum number of events the cache can contain before dropping events. Each event is typically 1KB in size, so we recommend a default limit of 1000 events -> 1 MB to balance performance against capturing all observed events. If necessary, feel free to enable debug mode to get detailed logs on how to optimize cache size depending on your application behavior. |
| sessionLengthSeconds | Number | `1800` | The duration of a session (in seconds). |
| headers | Object | `{}` | The **headers** configuration is optional and allows you to include custom headers in an HTTP request. For example, you can use it to pass `Authorization` and `x-api-key` headers.<br/><br/>For more details, see: [MDN - Request Headers](https://developer.mozilla.org/en-US/docs/Glossary/Request_header). |
| legacySPASupport | Boolean | `false` | When this field is `true`, the web client will use legacy virtual page load timing for single page applications. This feature tracks HTTP requests and DOM mutations to determine when a route change is complete. **Warning:** This is a legacy feature that is no longer supported. Please enable with caution in debugging mode to see if it is relevant for your web application. |

## CookieAttributes

| Field Name | Type | Default | Description |
| --- | --- | --- | --- |
| domain | String | `window.location.hostname` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| path | String | `/` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| sameSite | Boolean | `true` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| secure | Boolean | `true` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| unique | Boolean | `false` | When this field is `false`, the session cookie name is `cwr_s` and the credential cookie name is `cwr_c`. When this field is `true`, the session cookie name is `cwr_s_[AppMonitor Id]` and the credential cookie name is `cwr_c_[AppMonitor Id]`.<br/><br/>Set this field to `true` when multiple AppMonitors will monitor the same page. For example, this might be the case if one AppMonitor is used for logged-in users, and a second AppMonitor is used for guest users. |

## MetadataAttributes

You may add up to 10 custom attributes per event. Custom attributes are key/value pairs. Keys must be a String and contain alphanumeric characters, `_`, or `:`. Values may be any primitive type.

The 10 attribute limit applies to the combined total of session attributes and page attributes. Any attributes that exceed this limit will be dropped. For example, 6 custom session attributes + 4 custom page attributes totals 10 custom attributes and falls within the limit. However, 6 custom attributes + 5 custom page attributes total 11 custom attributes and one of these custom attributes will be dropped.

AWS reserves the namespace prefix `aws:` for its attributes. Do not create custom attributes with the `aws:` prefix, or they may be overwritten by future versions of the CloudWatch RUM web client.

The RUM web client also records a set of [default attributes](https://github.com/aws-observability/aws-rum-web/blob/main/src/event-schemas/meta-data.json). Overriding default attributes can have unintended consequences in the Cloudwatch RUM console.

| Field Name | Type | Default | Description |
| --- | --- | --- | --- |
| [key] | String | N/A | An attribute which will be added to the metadata of all events in the session.<br/><br/>Keys must conform to the following regex: `^(?!pageTags)(?!aws:)[a-zA-Z0-9_:]{1,128}$`.<br/><br/>Values can have up to 256 characters and must be of type `string`, `number`, or `boolean`. |

## Telemetry Config Array

You must configure the types of RUM telemetry you wish to perform on your application. Each telemetry records a different category of data. Specifically, performance (load timing), errors, HTTP requests and DOM events.

The telemetry config array is an array of telemetry configurations. A telemetry configuration is either (1) a string containing the telemetry's name, or (2) an array containing the telemetry's name in position 0 and an object containing the telemetry's configuration in position 1.

For example, the following telemetry config arrays are both valid. The one on the top uses default configurations while the one on the bottom provides partial configurations for the `'errors'` and `'http'` telemetries.

```javascript
telemetries: ['errors', 'performance', 'http'];
```

```javascript
telemetries: [
    ['errors', { stackTraceLength: 500 }],
    'performance',
    ['http', { stackTraceLength: 500, addXRayTraceIdHeader: true }]
];
```

| Telemetry&nbsp;Name | Description |
| --- | --- |
| errors | Record JavaScript errors. By default, this telemetry will only record unhandled JavaScript errors. See [Errors](#errors). |
| http | Record HTTP requests. By default, this telemetry will only record failed requests; i.e., requests that have network failures, or whose responses contain a non-2xx status code. See [HTTP](#http) <br/><br/> This telemetry is required to enable X-Ray tracing. |
| interaction | Record DOM events. By default, this telemetry will not record data. The telemetry must be configured to record specific DOM events. See [Interaction](#interaction) |
| performance | Record performance data including page load timing, web vitals, and resource load timing. See [Performance](#performance) |

## Errors

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| stackTraceLength | Number | `1000` | The number of characters to record from a JavaScript error's stack trace (if available). |
| ignore | Function | `() => false` | A function which accepts an [`ErrorEvent`](https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent) or a [`PromiseRejectionEvent`](https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent) and returns a value that coerces to true when the error should be ignored. By default, no errors are ignored. |

For example, the following telemetry config array causes the web client to ignore all errors whose message begins with "Warning:".

```javascript
telemetries: [
    [
        'errors',
        {
            stackTraceLength: 500,
            ignore: (errorEvent) => {
                return (
                    errorEvent &&
                    errorEvent.message &&
                    /^Warning:/.test(errorEvent.message)
                );
            }
        }
    ],
    'performance',
    'http'
];
```

## HTTP

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| urlsToInclude | RegExp[] | `[/.*/]` | A list of HTTP request (`XMLHttpRequest` or `fetch`) URLs. These requests will be recorded, unless explicitly excluded by `urlsToExclude`. |
| urlsToExclude | RegExp[] | `[]` | A list of HTTP request (`XMLHttpRequest` or `fetch`) URLs. These requests will not be recorded. |
| stackTraceLength | Number | `1000 ` | The number of characters to record from a JavaScript error's stack trace (if available). |
| recordAllRequests | boolean | `false` | By default, only HTTP failed requests (i.e., those with network errors or status codes which are not 2xx) are recorded. When this field is `true`, the http telemetry will record all requests, including those with successful 2xx status codes. <br/><br/>This field does **does not apply** to X-Ray traces, where all requests are recorded. |
| addXRayTraceIdHeader | boolean or RegExp[] | `false` | By default, the `X-Amzn-Trace-Id` header will not be added to the HTTP request. This means that the client-side trace and server-side trace will **not be linked** in X-Ray or the ServiceLens graph.<br/><br/> When this field is `true`, the `X-Amzn-Trace-Id` header will be added to HTTP requests (`XMLHttpRequest` or `fetch`).<br/><br/> When this field is an array of regular expressions (RegExp[]), the `X-Amzn-Trace-Id` header will be added only to HTTP requests that contain an URL matching one or more of the regular expressions. If the `enableW3CTraceId` field is set to true, then a `traceparent` header will be added in the W3C trace format (see [here](https://www.w3.org/TR/trace-context/#traceparent-header) for more information) instead of the `X-Amzn-Trace-Id` header. <br/><br/>**Adding the `X-Amzn-Trace-Id` header can cause CORS failures. Test your application before enabling this feature in a production environment.** |

## Interaction

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| enableMutationObserver | Boolean | `false` | When `false`, the web client will record events on only DOM elements that existed when the `window.load` event was fired.<br/><br/>When `true`, the web client will record events on all DOM elements, including those added to the DOM after the `window.load` event was fired. The web client does this by using a [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to listen for changes to the DOM. Using this feature does not typically have a perceptible impact on application performance, but may have a small impact when (1) the plugin is listening for an unusually large number DOM events (i.e., multiple thousands), or (2) the number and size of the DOM mutations are unusually large (i.e., multiple thousands). |
| events | Array | `[]` | An array of target DOM events to record. Each DOM event is defined by an _event_ and a _selector_. The event must be a [DOM event](https://www.w3schools.com/jsref/dom_obj_event.asp). The selector must be one of (1) `cssLocator`, (2) `elementId` or (3) `element`.<br/><br/>When two or more selectors are provided for a target DOM event, only one selector will be used. The selectors will be honored with the following precedence: (1) `cssLocator`, (2) `elementId` or (3) `element`. For example, if both `cssLocator` and `elementId` are provided, only the `cssLocator` selector will be used.<br/><br/>**Examples:**<br/>Record all elements identified by CSS selector `[label="label1"]`:<br/> `[{ event: 'click', cssLocator: '[label="label1"]' }]`<br/><br/>Record a single element with ID `mybutton`:<br/>`[{ event: 'click', elementId: 'mybutton' }]`<br/><br/>Record a complete clickstream<br/>`[{ event: 'click', element: document }]`. |
| interactionId | Function | `() => undefined` | A function to generate a custom ID for the DOM event. <br/><br/>**Example:**<br/> Retrieve custom ID stored in the `data-rum-id` attribute of a DOM element. <br/> `(element) => element.target.getAttribute('data-rum-id')` |

For example, the following code snippet identifies DOM events by the value of the attribute `data-rum-id` in the nearest ancestor of the event's target element. The snippet defines a function `getInteractionId` which reads the `data-rum-id` attribute, and passes this function as the value of the `interactionId` property in the `interaction` configuration.

```typescript
const getInteractionId = (event: Event): string => {
    const eventPath = event.composedPath() as Element[];
    for (const element of eventPath) {
        if (element.hasAttribute && element.hasAttribute('data-rum-id')) {
            return element.getAttribute('data-rum-id') as string;
        }
    }
    return '';
};

const config: AwsRumConfig = {
    identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
    sessionSampleRate: 1,
    telemetries: [
        [
            'interaction',
            {
                events: [{ event: 'click', element: document }],
                interactionId: getInteractionId
            }
        ]
    ]
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
```

## Performance

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| eventLimit | Number | `10` | The maximum number of resources to record load timing. <br/><br/>There may be many similar resources on a page (e.g., images) and recording all resources may add expense without adding value. The web client records all HTML files and JavaScript files, while recording a sample of stylesheets, images and fonts. Increasing the event limit increases the maximum number of sampled resources. |
| ignore | Function(event: PerformanceEntry) : any | `(entry: PerformanceEntry) => entry.entryType === 'resource' && !/^https?:/.test(entry.name)` | A function which accepts a [PerformanceEntry](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry) and returns a value that coerces to true when the PerformanceEntry should be ignored.</br></br> By default, [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) entries with URLs that do not have http(s) schemes are ignored. This causes resources loaded by browser extensions to be ignored. |
| recordAllTypes | String[] | ['document', 'script', 'stylesheet', 'font'] | A list of resource types that are always recorded, no matter if the resource event limit has been reached. Possible values are 'other', 'stylesheet', 'document', 'script', 'image', and 'font'. |
| sampleTypes | String[] | ['image', 'other'] | A list of resource types that are only recorded if the resource event limit has not been reached. Possible values are 'other', 'stylesheet', 'document', 'script', 'image', and 'font'. |
| reportAllLCP | Boolean | `false` | If true, then all increases to LCP are recorded. |
| reportAllCLS | Boolean | `false` | If true, then all increases to CLS are recorded. |
| reportAllINP | boolean | `false` | If true, then all increases to INP are recorded. |

For example, the following telemetry config array causes the web client to ignore all resource entries.

```javascript
telemetries: [
    'errors',
    'http',
    [
        'performance',
        {
            ignore: (entry: PerformanceEntry) => {
                return entry.entryType === 'resource';
            }
        }
    ]
];
```
