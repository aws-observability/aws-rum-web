# Installing from CDN

Applications may use a code snippet to install the web client from a content
delivery network (CDN). The snippet is a self-executing function created by the
CloudWatch RUM console. The snippet must be added to the \<head\> tag of each
HTML file in your web application. The snippet dynamically installs the web
client by (1) downloading the web client from a CDN, and (2) configuring the web
client for the application it is monitoring. The snippet will look similar to
the following:

```html
<script>
(function(n,i,v,r,s,c,u,x,z){x=window.AwsRumClient={q:[],n:n,i:i,v:v,r:r,c:c,u:u};window[n]=function(c,p){x.q.push({c:c,p:p});};z=document.createElement('script');z.async=true;z.src=s;document.head.insertBefore(z,document.getElementsByTagName('script')[0]);})('cwr','00000000-0000-0000-0000-000000000000','1.0.0','us-west-2','https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',{sessionSampleRate:1,guestRoleArn:'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth',identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',telemetries:['errors','http','performance'],allowCookies:true});
</script>
```

## Arguments

The code snippet accepts six arguments. The snippet below shows these arguments with the body of the snippet's function omitted for readability:
```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
        { /* Configuration */ }
    );
</script>
```

| Position | Argument&nbsp;Name | Type | Description |
| --- | --- | --- | --- |
| 1 | Namespace | String | The name of the global variable that the application will use to execute commands on the web client. This will typically be `'cwr'`. |
| 2 | AppMonitor ID | String | A globally unique identifier for the CloudWatch RUM AppMonitor which monitors your application. |
| 3 | Application Version | String | Your application's semantic version. If you do not wish to use this field then add any placeholder, such as `'0.0.0'`. |
| 4 | Region | String |  The AWS region of the AppMonitor. For example, `'us-east-1'` or '`eu-west-2'`. |
| 5 | Web Client URL | String |  The URL of the web client bundle. For example, `'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js'`|
| 6 | Configuration | [Configuration](#configuration) | An application-specific configuration for the web client. |

## Configuration

The application-specific web client configuration is a JavaScript object whose fields are all optional. While these fields are optional, depending on your application the web client may not function properly if certain fields are omitted. For example, `identityPoolId` and `guestRoleArn` are both required unless your application performs its own AWS authentication and passes the credentials to the web client using the command `cwr('setAwsCredentials', {...});`.

The snippet below shows several configuration options with the body of the snippet's function omitted for readability:
```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
        {
            sessionSampleRate:1,
            guestRoleArn:'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth',
            identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',
            endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',
            telemetries:['errors','http','performance'],
            allowCookies:true
        }
    );
</script>
```

| Field Name | Type | Default | Description |
| --- | --- | --- | --- |
| allowCookies | Boolean | `false` | Enable the web client to set and read two cookies: a session cookie named `cwr_s` and a user cookie named `cwr_u`.<br/><br/>`cwr_s` stores session data including an anonymous session ID (uuid v4) created by the web client. This allows CloudWatch RUM to compute sessionized metrics like errors per session.<br/><br/>`cwr_u` stores an anonymous user ID (uuid v4) created by the web client. This allows CloudWatch RUM to count return visitors.<br/><br/>`true`: the web client will use cookies<br/>`false`: the web client will not use cookies. |
| cookieAttributes | [CookieAttributes](#cookieattributes) | `{ domain: window.location.hostname, path: '/', sameSite: 'Strict', secure: true } ` | Cookie attributes are applied to all cookies stored by the web client, including `cwr_s` and `cwr_u`. |
| disableAutoPageView | Boolean | `false` | When this field is `false`, the web client will not automatically record page views.<br/><br/>By default, the web client records page views when (1) the page first loads and (2) the browser's [history API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) is called. The page ID is `window.location.pathname`.<br/><br/>In some cases, the web client's instrumentation will not record the desired page ID. In this case, the web client's page view automation must be disabled using the `disableAutoPageView` configuration, and the application must be instrumented to record page views using the `recordPageView` command. |
| enableRumClient | Boolean | `true` | When this field is `true`, the web client will record and dispatch RUM events. |
| enableXRay | Boolean | `false` | When this field is `true` **and** the `http` telemetry is used, the web client will record X-Ray traces for HTTP requests.<br/><br/>See the [HTTP telemetry configuration](#http) for more information, including how to connect client-side and server-side traces. |
| endpoint | String | `'https://dataplane.rum.[region].amazonaws.com'` | The URL of the CloudWatch RUM API where data will be sent. |
| guestRoleArn | String | `undefined` | The ARN of the AWS IAM role that will be assumed during anonymous authorization.<br/><br/>When this field is set (along with `identityPoolId`), the web client will attempt to retrieve temporary AWS credentials through Cognito using `AssumeRoleWithWebIdentity`. If this field is not set, you must forward credentials to the web client using the `setAwsCredentials` command. |
| identityPoolId | String | `undefined` | The Amazon Cognito Identity Pool ID that will be used during anonymous authorization.<br/><br/>When this field is set (along with `guestRoleArn`), the web client will attempt to retrieve temporary AWS credentials through Cognito using `AssumeRoleWithWebIdentity`. If this field is not set, you must forward credentials to the web client using the `setAwsCredentials` command. |
| pageIdFormat | String | `'PATH'` | The portion of the `window.location` that will be used as the page ID. Options include `PATH`, `HASH` and `PATH_AND_HASH`.<br/><br/>For example, consider the URL `https://amazonaws.com/home?param=true#content`<br/><br/>`PATH`: `/home`<br/>`HASH`: `#content`<br/>`PATH_AND_HASH`: `/home#content` |
| pagesToInclude | RegExp[] | `[]` | A list of regular expressions which specify the `window.location` values for which the web client will record data. Pages are matched using the `RegExp.test()` function.<br/><br/>For example, when `pagesToInclude: [ /\/home/ ]`, then data from `https://amazonaws.com/home` will be included,  and `https://amazonaws.com/` will not be included. |
| pagesToExclude | RegExp[] | `[]` | A list of regular expressions which specify the `window.location` values for which the web client will record data. Pages are matched using the `RegExp.test()` function.<br/><br/>For example, when `pagesToExclude: [ /\/home/ ]`, then data from `https://amazonaws.com/home` will be excluded,  and `https://amazonaws.com/` will not be excluded. |
| recordResourceUrl | Boolean | `true` | When this field is `false`, the web client will not record the URLs of resources downloaded by your application.<br/><br/> Some types of resources (e.g., profile images) may be referenced by URLs which contain PII. If this applies to your application, you must set this field to `false` to comply with CloudWatch RUM's shared responsibility model. |
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
| events | Array | `[]` | An array of target DOM events to record. <br/><br/>For example, to record a single element with Id `mybutton`, use `[{event: 'click', elementId: 'mybutton' }]`. To record a complete clickstream, use `[{ event: 'click', element: document }]`. |

## Performance

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| eventLimit | Number | `10` | The maximum number of resources to record load timing. <br/><br/>There may be many similar resources on a page (e.g., images) and recording all resources may add expense without adding value. The web client records all HTML files and JavaScript files, while recording a sample of stylesheets, images and fonts. Increasing the event limit increases the maximum number of sampled resources. |
