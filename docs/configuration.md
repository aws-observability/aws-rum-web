# Application-specific Configurations

The application being monitored must provided an application-specific
configuration to the CloudWatch RUM web client. The configuration tells the web
client what to monitor and how to monitor.

For example, the config object may look similar to the following:
```javascript
{
    allowCookies: true,
    endpoint: "https://dataplane.rum.us-west-2.amazonaws.com",
    guestRoleArn: "arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth",
    identityPoolId: "us-west-2:00000000-0000-0000-0000-000000000000",
    sessionSampleRate: 1,
    telemetries: ['errors', 'performance', 'http']
}
```

## Configuration Options

| Field Name | Type | Default | Description |
| --- | --- | --- | --- |
| allowCookies | Boolean | `false` | Enable the web client to set and read two cookies: a session cookie named `cwr_s` and a user cookie named `cwr_u`.<br/><br/>`cwr_s` stores session data including an anonymous session ID (uuid v4) created by the web client. This allows CloudWatch RUM to compute sessionized metrics like errors per session.<br/><br/>`cwr_u` stores an anonymous user ID (uuid v4) created by the web client. This allows CloudWatch RUM to count return visitors.<br/><br/>`true`: the web client will use cookies<br/>`false`: the web client will not use cookies. |
| cookieAttributes | [CookieAttributes](#cookieattributes) | `{ domain: window.location.hostname, path: '/', sameSite: 'Strict', secure: true } ` | Cookie attributes are applied to all cookies stored by the web client, including `cwr_s` and `cwr_u`. |
| disableAutoPageView | Boolean | `false` | When this field is `false`, the web client will automatically record page views.<br/><br/>By default, the web client records page views when (1) the page first loads and (2) the browser's [history API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) is called. The page ID is `window.location.pathname`.<br/><br/>In some cases, the web client's instrumentation will not record the desired page ID. In this case, the web client's page view automation must be disabled using the `disableAutoPageView` configuration, and the application must be instrumented to record page views using the `recordPageView` command. |
| enableRumClient | Boolean | `true` | When this field is `true`, the web client will record and dispatch RUM events. |
| enableXRay | Boolean | `false` | When this field is `true` **and** the `http` telemetry is used, the web client will record X-Ray traces for HTTP requests.<br/><br/>See the [HTTP telemetry configuration](#http) for more information, including how to connect client-side and server-side traces. |
| endpoint | String | `'https://dataplane.rum.[region].amazonaws.com'`<br/><br/>`'https://[restapi_id].execute-api.[region].amazonaws.com/[stage_name]/'` | The URL of the CloudWatch RUM API where data will be sent.<br/><br/>You may include a path prefix like `/stage_name/` in the endpoint URL if there is a proxy between your web application and CloudWatch RUM. |
| guestRoleArn | String | `undefined` | The ARN of the AWS IAM role that will be assumed during anonymous authorization.<br/><br/>When this field is set (along with `identityPoolId`), the web client will attempt to retrieve temporary AWS credentials through Cognito using `AssumeRoleWithWebIdentity`. If this field is not set, you must forward credentials to the web client using the `setAwsCredentials` command. |
| identityPoolId | String | `undefined` | The Amazon Cognito Identity Pool ID that will be used during anonymous authorization.<br/><br/>When this field is set (along with `guestRoleArn`), the web client will attempt to retrieve temporary AWS credentials through Cognito using `AssumeRoleWithWebIdentity`. If this field is not set, you must forward credentials to the web client using the `setAwsCredentials` command. |
| pageIdFormat | String | `'PATH'` | The portion of the `window.location` that will be used as the page ID. Options include `PATH`, `HASH` and `PATH_AND_HASH`.<br/><br/>For example, consider the URL `https://amazonaws.com/home?param=true#content`<br/><br/>`PATH`: `/home`<br/>`HASH`: `#content`<br/>`PATH_AND_HASH`: `/home#content` |
| pagesToInclude | RegExp[] | `[/.*/]` | A list of regular expressions which specify the `window.location` values for which the web client will record data, unless explicitly excluded by `pagesToExclude`. Pages are matched using the `RegExp.test()` function.<br/><br/>For example, when `pagesToInclude: [ /\/home/ ]`, then data from `https://amazonaws.com/home` will be included,  and `https://amazonaws.com/` will not be included. |
| pagesToExclude | RegExp[] | `[]` | A list of regular expressions which specify the `window.location` values for which the web client will record data. Pages are matched using the `RegExp.test()` function.<br/><br/>For example, when `pagesToExclude: [ /\/home/ ]`, then data from `https://amazonaws.com/home` will be excluded,  and `https://amazonaws.com/` will not be excluded. |
| recordResourceUrl | Boolean | `true` | When this field is `false`, the web client will not record the URLs of resources downloaded by your application.<br/><br/> Some types of resources (e.g., profile images) may be referenced by URLs which contain PII. If this applies to your application, you must set this field to `false` to comply with CloudWatch RUM's shared responsibility model. |
| routeChangeComplete | Number | `100` | The interval (in milliseconds) for which when no HTTP or DOM activity has been observed, an active route change is marked as complete. Note that `routeChangeComplete` must be strictly less than `routeChangeTimeout`. |
| routeChangeTimeout | Number | `10000` | The maximum time (in milliseconds) a route change may take. If a route change does not complete before the timeout, no timing data is recorded for the route change. If your application's route changes may take longer than the default timeout (i.e., more than 10 second), you should increase the value of the timeout. |
| sessionEventLimit | Number | `200` | The maximum number of events to record during a single session. |
| sessionSampleRate | Number | `1` | The proportion of sessions that will be recorded by the web client, specified as a unit interval (a number greater than or equal to 0 and less than or equal to 1). When this field is `0`, no sessions will be recorded. When this field is `1`, all sessions will be recorded. |
| telemetries | [Telemetry Config Array](#telemetry-config-array) | `[]` | See [Telemetry Config Array](#telemetry-config-array) |

## CookieAttributes

| Field Name | Type | Default | Description |
| --- | --- | --- | --- |
| domain | String | `window.location.hostname` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| path | String | `/` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| sameSite | Boolean | `true` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| secure | Boolean | `true` | See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent |
| unique | Boolean | `false` | When this field is `false`, the session cookie name is `cwr_s`. When this field is true `true`, the session cookie name is `cwr_s_[AppMonitor Id]`.<br/><br/>Set this field to `true` when multiple AppMonitors will monitor the same page. For example, this might be the case if one AppMonitor is used for logged-in users, and a second AppMonitor is used for guest users.  |

## Telemetry Config Array

You must configure the types of RUM telemetry you wish to perform on your application. Each telemetry records a different category of data. Specifically, performance (load timing), errors, HTTP requests and DOM events.

The telemetry config array is an array of telemetry configurations. A telemetry configuration is either (1) a string containing the telemetry's name, or (2) an array containing the telemetry's name in position 0 and an object containing the telemetry's configuration in position 1.

For example, the following telemetry config arrays are both valid. The one on the top uses default configurations while the one on the bottom provides partial configurations for the `'errors'` and `'http'` telemetries.
```javascript
telemetries: [ 'errors', 'performance', 'http' ]
```
```javascript
telemetries: [
    [ 'errors', { stackTraceLength: 500 } ],
    'performance',
    [ 'http', { stackTraceLength: 500, addXRayTraceIdHeader: true } ]
]
```

| Telemetry&nbsp;Name | Description |
| ----------- | ----------- |
| errors | Record JavaScript errors. By default, this telemetry will only record unhandled JavaScript errors. See [Errors](#errors). |
| http | Record HTTP requests. By default, this telemetry will only record failed requests; i.e., requests that have network failures, or whose responses contain a non-2xx status code. See [HTTP](#http) <br/><br/> This telemetry is required to enable  X-Ray tracing. |
| interaction | Record DOM events. By default, this telemetry will not record data. The telemetry must be configured to record specific DOM events. See [Interaction](#interaction) |
| performance | Record performance data including page load timing, web vitals, and resource load timing. See [Performance](#performance) |

## Errors

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| stackTraceLength | Number | `200` | The number of characters to record from a JavaScript error's stack trace (if available). |
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
                    errorEvent.message.test(/^Warning:/)
                );
            }
        }
    ],
    'performance',
    'http'
]
```

## HTTP

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| urlsToInclude | RegExp[] | `[/.*/]` | A list of HTTP request (`XMLHttpRequest` or `fetch`) URLs. These requests will be recorded, unless explicitly excluded by `urlsToExclude`. |
| urlsToExclude | RegExp[] | `[]` | A list of HTTP request (`XMLHttpRequest` or `fetch`) URLs. These requests will not be recorded. |
| stackTraceLength | Number | `200 ` | The number of characters to record from a JavaScript error's stack trace (if available). |
| recordAllRequests | boolean | `false` | By default, only HTTP failed requests (i.e., those with network errors or status codes which are not 2xx) are recorded. When this field is `true`, the http telemetry will record all requests, including those with successful 2xx status codes. <br/><br/>This field does **does not apply** to X-Ray traces, where all requests are recorded. |
| addXRayTraceIdHeader | boolean | `false` | By default, the `X-Amzn-Trace-Id` header will not be added to the HTTP request. This means that the client-side trace and server-side trace will **not be linked** in X-Ray or the ServiceLens graph.<br/><br/> When this field is `true`, the `X-Amzn-Trace-Id` header will be added to HTTP requests (`XMLHttpRequest` or `fetch`). **Adding the header is dangerous and you must test your application before setting this field to `true` in a production environment.** The header could cause CORS to fail or invalidate the request's signature if the request is signed with sigv4.

## Interaction

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| enableMutationObserver | Boolean | `false` | When `false`, the web client will record events on only DOM elements that existed when the `window.load` event was fired.<br/><br/>When `true`, the web client will record events on all DOM elements, including those added to the DOM after the `window.load` event was fired. The web client does this by using a [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to listen for changes to the DOM. Using this feature does not typically have a perceptible impact on application performance, but may have a small impact when (1) the plugin is listening for an unusually large number DOM events (i.e., multiple thousands), or (2) the number and size of the DOM mutations are unusually large (i.e., multiple thousands). |
| events | Array | `[]` | An array of target DOM events to record. Each DOM event is defined by an *event* and a *selector*. The event must be a [DOM event](https://www.w3schools.com/jsref/dom_obj_event.asp). The selector must be one of (1) `cssLocator`, (2) `elementId` or (3) `element`.<br/><br/>When two or more selectors are provided for a target DOM event, only one selector will be used. The selectors will be honored with the following precedence: (1) `cssLocator`, (2) `elementId` or (3) `element`. For example, if both `cssLocator` and `elementId` are provided, only the `cssLocator` selector will be used.<br/><br/>**Examples:**<br/>Record all elements identified by CSS selector `[label="label1"]`:<br/> `[{ event: 'click', cssLocator: '[label="label1"]' }]`<br/><br/>Record a single element with ID `mybutton`:<br/>`[{ event: 'click', elementId: 'mybutton' }]`<br/><br/>Record a complete clickstream<br/>`[{ event: 'click', element: document }]`. |

## Performance

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| eventLimit | Number | `10` | The maximum number of resources to record load timing. <br/><br/>There may be many similar resources on a page (e.g., images) and recording all resources may add expense without adding value. The web client records all HTML files and JavaScript files, while recording a sample of stylesheets, images and fonts. Increasing the event limit increases the maximum number of sampled resources. |
