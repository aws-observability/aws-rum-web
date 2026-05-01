# API reference

Every public method on the `AwsRum` class and every command on the CDN command queue (`cwr(...)`). The two install methods expose the same capabilities — this page documents both side by side.

For the full configuration reference, see [`configuration.md`](../configuration.md).

## Constructor (NPM only)

```typescript
new AwsRum(
    applicationId: string,
    applicationVersion: string,
    region: string,
    config?: AwsRumConfig
)
```

| Parameter | Required | Notes |
| --- | --- | --- |
| `applicationId` | ✅ | Your AppMonitor's UUID. |
| `applicationVersion` | ✅ | Free-form version string. Shown in the RUM console to slice data by release. |
| `region` | ✅ | AWS region of the AppMonitor (e.g. `us-west-2`). |
| `config` |  | See [configuration](../configuration.md). |

On the CDN, the snippet passes the same values as positional arguments to the IIFE. See [CDN installation](../cdn_installation.md#arguments).

## Commands

Each row shows the NPM method and the equivalent CDN command.

| Command | NPM | CDN | Description |
| --- | --- | --- | --- |
| **recordPageView** | `awsRum.recordPageView('/home')` | `cwr('recordPageView', '/home')` | Record a page view. Accepts a string (page ID) or a `PageView` object. See [PageView](#pageview). |
| **recordError** | `awsRum.recordError(e)` | `cwr('recordError', e)` | Record a caught error. Accepts `Error`, `ErrorEvent`, or string. |
| **recordEvent** | `awsRum.recordEvent('type', { ... })` | `cwr('recordEvent', { type, data })` | Record a custom event. See [Event](#event). ⚠️ AppMonitor must have custom events enabled. |
| **addSessionAttributes** | `awsRum.addSessionAttributes({ appVersion: '1.3.8' })` | `cwr('addSessionAttributes', { appVersion: '1.3.8' })` | Add metadata attributes to every event in the current session. See [MetadataAttributes](../configuration.md#metadataattributes). |
| **registerDomEvents** | `awsRum.registerDomEvents([{...}])` | `cwr('registerDomEvents', [{...}])` | Append DOM events recorded by `DomEventPlugin`. See [Interaction](../configuration.md#interaction). |
| **setAwsCredentials** | `awsRum.setAwsCredentials(provider)` | `cwr('setAwsCredentials', creds)` | Forward AWS credentials to the web client. Required when `identityPoolId` is unset. |
| **allowCookies** | `awsRum.allowCookies(true)` | `cwr('allowCookies', true)` | Toggle cookie usage at runtime. When `false`, session and user IDs live only in memory. |
| **enable** / **disable** | `awsRum.enable()` / `awsRum.disable()` | `cwr('enable')` / `cwr('disable')` | Start or stop recording and dispatching. Useful for pause/resume in response to user consent. |
| **dispatch** | `awsRum.dispatch()` | `cwr('dispatch')` | Flush the event cache via `fetch`. Returns a promise. |
| **dispatchBeacon** | `awsRum.dispatchBeacon()` | `cwr('dispatchBeacon')` | Flush via `navigator.sendBeacon`. Falls back to `fetch`. Preferred for `visibilitychange`/`pagehide`. |
| **addPlugin** | `awsRum.addPlugin(plugin)` | _(not exposed — use `eventPluginsToLoad` in snippet config)_ | Register a plugin after construction. See [writing plugins](../concepts/plugins.md). |

Unrecognized CDN commands throw `UnsupportedOperationException`.

### Credentials example

```typescript
// NPM
const awsRum = new AwsRum(id, version, region, {
    disableAutoPageView: true
});
awsRum.recordPageView(window.location.hash);
if (awsCreds) awsRum.setAwsCredentials(new CustomCredentialProvider());
```

```html
<!-- CDN -->
<script>
    (function (n, i, v, r, s, c, u, x, z) {
        /* ... */
    })(
        'cwr',
        '...',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js',
        { disableAutoPageView: true }
    );
    cwr('recordPageView', window.location.hash);
    const awsCreds = localStorage.getItem('customAwsCreds');
    if (awsCreds) cwr('setAwsCredentials', awsCreds);
</script>
```

## PageView

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `pageId` | String | **required** | Unique identifier for the current view (e.g. `'/home'`). |
| `pageTags` | String[] | `[]` | Tags for grouping pages when aggregating data (e.g. `['en', 'landing']`). |
| `pageAttributes` | `{ [key: string]: string \| number \| boolean }` | N/A | Custom attributes added to every event recorded on this page. Keys must match `^(?!pageTags)(?!aws:)[a-zA-Z0-9_:]{1,128}$`. Values up to 256 chars. |

You may add up to 10 custom attributes per event (session + page attributes combined). Any beyond 10 are dropped.

AWS reserves the `aws:` prefix — don't create custom attributes with it.

The web client also records a set of [default attributes](https://github.com/aws-observability/aws-rum-web/blob/main/src/event-schemas/meta-data.json), which cannot be overwritten.

## Event

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | String | **required** | Event type identifier. Must match `^[a-zA-Z0-9_.-]{1,256}$`. |
| `data` | Object | **required** | JavaScript object, serialized as JSON. Each event (including metadata) must be under 6 KB — larger events are dropped. |

> **⚠️ Custom events must be enabled on the AppMonitor.** See [Send custom events](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html) in the user guide.

The call signature differs by install method:

-   **NPM**: `awsRum.recordEvent(type, data)` — two positional arguments.
-   **CDN**: `cwr('recordEvent', { type, data })` — wrapped in an object.

## Slim vs full

The slim distribution (`@aws-rum/web-slim`) exposes the same method surface as above, minus:

-   Cognito auth (no `identityPoolId` / `guestRoleArn` effect — use `setAwsCredentials` with your own provider)
-   Built-in SigV4 (opt in via `setSigningConfigFactory(createSigningConfig)` — `createSigningConfig` is exported from `@aws-rum/web-core`)
-   Remote config (the `u` field in the snippet)
-   `telemetries` config (load plugins explicitly via `eventPluginsToLoad`; configure XRay header and similar on the plugin's constructor)

See [concepts/packages: BYO auth on slim](../concepts/packages.md#byo-auth-on-slim) for the working snippet.

## Next steps

-   [Configuration reference](../configuration.md)
-   [Writing plugins](../concepts/plugins.md)
-   [Troubleshooting](../cdn_troubleshooting.md)
