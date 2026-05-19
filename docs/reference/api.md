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
| **recordEvent** | `awsRum.recordEvent('type', { ... }, { tier: 'beta' })` | `cwr('recordEvent', { type, data, metadata })` | Record a custom event. The optional 3rd arg attaches per-call metadata (highest precedence). See [Event](#event). ⚠️ AppMonitor must have custom events enabled. |
| **addSessionAttributes** | `awsRum.addSessionAttributes({ appVersion: '1.3.8' })` | `cwr('addSessionAttributes', { appVersion: '1.3.8' })` | Add metadata attributes to every event in the current session. See [MetadataAttributes](../configuration.md#metadataattributes). |
| **setEventMetadataHook** | `awsRum.setEventMetadataHook((type, data, ctx) => ({ route: location.pathname }))` | _(NPM only — hooks are functions)_ | Register a function that decorates every recorded event's metadata. The hook receives `(eventType, eventData, currentMetadata)` and returns an `EventMetadata` object. Replaces any previously set hook. Manual metadata passed to `recordEvent` always wins. If the hook throws, its output is dropped for that event and the SDK logs a warning. |
| **clearEventMetadataHook** | `awsRum.clearEventMetadataHook()` | `cwr('clearEventMetadataHook')` | Remove the previously registered event metadata hook. |
| **registerDomEvents** | `awsRum.registerDomEvents([{...}])` | `cwr('registerDomEvents', [{...}])` | Append DOM events recorded by `DomEventPlugin`. See [Interaction](../configuration.md#interaction). |
| **setAwsCredentials** | `awsRum.setAwsCredentials(provider)` | `cwr('setAwsCredentials', creds)` | Forward AWS credentials to the web client. Required when `identityPoolId` is unset. |
| **allowCookies** | `awsRum.allowCookies(true)` | `cwr('allowCookies', true)` | Toggle cookie usage at runtime. When `false`, session and user IDs live only in memory. |
| **clearCookies** | `awsRum.clearCookies()` | `cwr('clearCookies')` | Purge all RUM cookies (`cwr_s`, `cwr_u`, `cwr_c`, and the `_${applicationId}`-suffixed variants used when `cookieAttributes.unique` is set). Intended for automated test setup so the next init starts a fresh session. Does not affect in-memory state — call before `new AwsRum(...)` or before a navigation. |
| **getSessionId** | `awsRum.getSessionId()` | _(NPM only)_ | Returns the current session ID, minting a new one if no session exists. Use to read the leader's session ID for broadcast to follower contexts. See [Sharing a session across contexts](../concepts/sessions.md#sharing-a-session-across-contexts). |
| **pinSessionId** | `awsRum.pinSessionId('shared-uuid')` | `cwr('pinSessionId', 'shared-uuid')` | Adopt an externally-minted session ID. Subsequent dispatches use this ID; already-buffered events inherit it at dispatch time (sessionId rides on `UserDetails` per batch, not per event). Does **not** emit `session_start` and does **not** re-roll sampling. Empty values are ignored with a warning. |
| **startSession** | `awsRum.startSession()` <br> `awsRum.startSession({ sessionId, userId })` | `cwr('startSession')` <br> `cwr('startSession', { sessionId, userId })` | Begin a new session immediately at a host-known boundary (sign-in, sign-out, kiosk handoff). With no args: mints a fresh UUID, re-rolls sampling, disengages session manual mode, emits `session_start` (subject to `suppressSessionStartEvent`). Optional `sessionId` adopts a host-chosen ID and engages manual mode; optional `userId` rotates the user identity in the same call (silent — no `user_start` event exists). NPM returns the new session ID; the CDN form is fire-and-forget — pass `sessionId` if you need to know it. See [Starting a session at runtime](../concepts/sessions.md#starting-a-session-at-runtime). |
| **getUserId** | `awsRum.getUserId()` | _(NPM only)_ | Returns the current anonymous user ID. Returns the nil UUID (`00000000-0000-0000-0000-000000000000`) when cookies are disabled and no `userId` has been seeded or set. Use to read the leader's user ID for broadcast to follower contexts so a single human is not counted as N anonymous users. See [Sharing a user ID across contexts](../concepts/sessions.md#sharing-a-user-id-across-contexts). |
| **pinUserId** | `awsRum.pinUserId('shared-uuid')` | `cwr('pinUserId', 'shared-uuid')` | Adopt an externally-supplied user ID. Engages manual mode for the life of the instance, overriding `userIdRetentionDays: 0` and the `allowCookies: false` gate in `getUserId()`. No event is emitted. Empty values are ignored with a warning. |
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
| `metadata` | [MetadataAttributes](../configuration.md#metadataattributes) | _(optional)_ | Per-call metadata merged into the event's metadata (highest precedence: overrides hook output and page attributes). Values must be `string`, `number`, or `boolean`; non-primitive values, the `aws:` namespace, and reserved page-state keys (`pageId`, `parentPageId`, `interaction`, `pageTags`, `title`) are dropped with a warning. |

> **⚠️ Custom events must be enabled on the AppMonitor.** See [Send custom events](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html) in the user guide.

The call signature differs by install method:

-   **NPM**: `awsRum.recordEvent(type, data, metadata?)` — positional arguments.
-   **CDN**: `cwr('recordEvent', { type, data, metadata })` — wrapped in an object.

### Metadata precedence

Per-event metadata is composed of three layers, applied in order from lowest to highest precedence:

1. **Page attributes** — set via `recordPageView({ pageAttributes: ... })`.
2. **Hook output** — set via `setEventMetadataHook(fn)`. Overrides page attributes for non-reserved keys.
3. **Manual metadata** — passed as the 3rd argument to `recordEvent`. Overrides hook output.

Session-level metadata travels in the request-level `Metadata` field, separate from per-event metadata. Within session-level metadata, precedence (lowest → highest) is:

1. **Auto-collected** — `domain`, `browserName`, `osName`, `deviceType`, `aws:releaseId`, etc.
2. **`sessionAttributes`** — overrides auto-collected on key collision.
3. **`applicationAttributes`** — overrides session attributes and auto-collected. Use this to pin values like `domain` at construction.
4. **SDK-owned `aws:*`** — `aws:client`, `aws:clientVersion`. Always wins; user-supplied `aws:*` keys are dropped with a warning.

On key collision between session-level and event-level metadata, the backend treats event-level metadata as authoritative.

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
