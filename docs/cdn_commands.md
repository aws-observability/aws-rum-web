# Executing Commands

Applications which install the web client using CDN must interact with the web client through its command queue. The command queue is a function which stores commands that will be executed asynchronously by the web client.

## Commands

Commands may be sent to the web client after the snippet has executed. In the following example, the snippet has disabled automated page view recording and has not provided AWS credentials. Following the snippet, the application manually records a page view and forwards AWS credentials to the web client.
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

| Command | Parameter Type | Example <div style="width:265px"></div> | Description |
| --- | --- | --- | --- |
| allowCookies | Boolean | `cwr('allowCookies', true);` | Enable the web client to set and read two cookies: a session cookie named `cwr_s` and a user cookie named `cwr_u`.<br/><br/>`cwr_s` stores session data including an anonymous session ID (uuid v4) created by the web client. This allows CloudWatch RUM to compute sessionized metrics like errors per session.<br/><br/>`cwr_u` stores an anonymous user ID (uuid v4) created by the web client. This allows CloudWatch RUM to count return visitors.<br/><br/>`true`: the web client will use cookies<br/>`false`: the web client will not use cookies
| disable | None | `cwr('disable');` | Stop recording and dispatching RUM events.
| dispatch | None | `cwr('dispatch');` | Flush RUM events from the cache and dispatch them to CloudWatch RUM using [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). 
| dispatchBeacon | None | `cwr('dispatchBeacon');` | Flush RUM events from the cache and dispatch them to CloudWatch RUM using [`sendBeacon`](https://developer.mozilla.org/en-US/docs/Web/API/Beacon_API). 
| enable | None | `cwr('enable');` | Start recording and dispatching RUM events.
| recordPageView | String | `cwr('recordPageView', '/home');` | Record a page view event.<br/><br/>By default, the web client records page views when (1) the page first loads and (2) the browser's [history API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) is called. The page ID is `window.location.pathname`.<br/><br/>In some cases, the web client's instrumentation will not record the desired page ID. In this case, the web client's page view automation must be disabled using the `disableAutoPageView` configuration, and the application must be instrumented to record page views using this command.
| recordError | Error \|&nbsp;ErrorEvent \|&nbsp;String | `try {...} catch(e) { cwr('recordError', e); }` | Record a caught error.
| registerDomEvents | Array | `cwr('registerDomEvents', [{ event: 'click', cssLocator: '[label="label1"]' }]);` | Register target DOM events to record. The target DOM events will be added to existing target DOM events. The parameter type is equivalent to the `events` property type of the [interaction telemetry configuration](https://github.com/aws-observability/aws-rum-web/blob/main/docs/cdn_installation.md#interaction).
| setAwsCredentials | [Credentials](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html) \|&nbsp;[CredentialProvider](https://www.npmjs.com/package/@aws-sdk/credential-providers) | `cwr('setAwsCredentials', cred);` | Forward AWS credentials to the web client. The web client requires AWS credentials with permission to call the `PutRumEvents` API. If you have not set `identityPoolId` and `guestRoleArn` in the web client configuration, you must forward AWS credentials to the web client using this command.
