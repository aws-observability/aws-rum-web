# Migrating from `aws-rum-web` to `@aws-rum/web-slim`

Slim is a smaller, imperative build of the RUM web client — ~10 KB gzipped vs ~50 KB for the full distribution. Migrating is mostly a matter of changing the import and doing explicitly what the full build did implicitly.

If you haven't already, skim [`packages/slim.md`](./packages/slim.md) for the full picture of what slim does and doesn't include.

## TL;DR

| Change | Action |
| --- | --- |
| Package | `npm uninstall aws-rum-web && npm install @aws-rum/web-slim` |
| Import | `from 'aws-rum-web'` → `from '@aws-rum/web-slim'` |
| `telemetries: [...]` | Remove. Load plugins explicitly via `eventPluginsToLoad`. |
| `identityPoolId` / `guestRoleArn` | Remove. Call `setAwsCredentials(provider)` with your own credential source. |
| `signing: true` | Remove. If you need SigV4, call `setSigningConfigFactory(createSigningConfig)` (from `@aws-rum/web-core`). |
| Remote config (CDN `u` field) | Remove. All config is local on slim. |
| `new AwsRum(...)` call signature | Unchanged. |
| Public methods (`recordPageView`, `recordError`, etc.) | Unchanged. |

## Should you migrate?

Migrate if bundle size is load-bearing (marketing pages, commerce landers, slow networks) or if you already have AWS credentials from your own source. Stay on `aws-rum-web` if you rely on Cognito auth bundled in, remote config, or the convenience of `telemetries` groups.

The slim `AwsRum` class is a strict subset of the full one, so nothing functionally new unlocks by switching — slim is about paying less.

## Steps

### 1. Swap the package

```bash
npm uninstall aws-rum-web
npm install @aws-rum/web-slim
```

Version numbers match across both packages. If you were on `aws-rum-web@3.2.0`, install `@aws-rum/web-slim@3.2.0`.

### 2. Update imports

```diff
- import { AwsRum, AwsRumConfig } from 'aws-rum-web';
+ import { AwsRum, AwsRumConfig } from '@aws-rum/web-slim';
```

Every plugin is still exported from slim — no changes to plugin imports.

### 3. Replace `telemetries` with `eventPluginsToLoad`

The full build's telemetry groups don't exist on slim. Load plugins individually.

**Before:**

```typescript
const config: AwsRumConfig = {
    telemetries: ['errors', 'performance', 'http']
};
```

**After:**

```typescript
import {
    FetchPlugin,
    JsErrorPlugin,
    NavigationPlugin,
    ResourcePlugin,
    WebVitalsPlugin,
    XhrPlugin
} from '@aws-rum/web-slim';

const config: AwsRumConfig = {
    eventPluginsToLoad: [
        new JsErrorPlugin(),
        new NavigationPlugin(),
        new ResourcePlugin(),
        new WebVitalsPlugin(),
        new FetchPlugin(),
        new XhrPlugin()
    ]
};
```

Equivalences:

| Telemetry group | Plugins to instantiate                                  |
| --------------- | ------------------------------------------------------- |
| `errors`        | `JsErrorPlugin`                                         |
| `performance`   | `NavigationPlugin`, `ResourcePlugin`, `WebVitalsPlugin` |
| `http`          | `FetchPlugin`, `XhrPlugin`                              |
| `replay`        | `RRWebPlugin`                                           |
| `interaction`   | `DomEventPlugin({ ... })`                               |

If your `telemetries` entries used the tuple form with config (e.g. `['http', { recordAllRequests: true }]`), pass those options to the plugin constructors directly instead: `new XhrPlugin({ recordAllRequests: true })`.

### 4. Replace Cognito config with `setAwsCredentials`

Slim does not bundle Cognito. Fetch credentials yourself — the AWS SDK credential providers are the usual source.

**Before:**

```typescript
const config: AwsRumConfig = {
    identityPoolId: 'us-west-2:xxxx',
    guestRoleArn: 'arn:aws:iam::123:role/Guest'
};
const awsRum = new AwsRum(appId, version, region, config);
```

**After:**

```typescript
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const awsRum = new AwsRum(appId, version, region, {
    /* no auth fields */
});

awsRum.setAwsCredentials(
    fromCognitoIdentityPool({
        identityPoolId: 'us-west-2:xxxx',
        clientConfig: { region: 'us-west-2' }
    })
);
```

`setAwsCredentials` accepts any `AwsCredentialIdentity` or `AwsCredentialIdentityProvider`. Use whatever credential source you already have — STS, a custom resolver, a pre-fetched session, etc.

If you terminate SigV4 at a proxy in front of `PutRumEvents`, you don't need credentials on the client at all. Skip this step and leave `signing: false` (the default).

### 5. Opt into SigV4 signing (only if you need it)

Slim defaults to `signing: false` and cannot be overridden through the config object. If your backend requires signed requests and you aren't using a signing proxy, wire it up explicitly:

```typescript
import { createSigningConfig } from '@aws-rum/web-core';

awsRum.setSigningConfigFactory(createSigningConfig);
awsRum.setAwsCredentials(provider); // required — signing needs credentials
```

`createSigningConfig` pulls in `@aws-sdk/signature-v4` and its dependencies (~30 KB gzipped). Not importing it is how slim stays small.

### 6. (CDN only) Point the snippet at `cwr-slim.js`

```diff
- 'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js',
+ 'https://client.rum.us-east-1.amazonaws.com/3.x/cwr-slim.js',
```

Drop `identityPoolId` / `guestRoleArn` / `telemetries` from the config object and drop the `u` (remote config URL) positional argument. Call `cwr('setAwsCredentials', ...)` after the snippet loads to supply credentials.

Remote config is not available on slim — all configuration must be present in the snippet itself.

## After migrating

Verify the same way as a fresh install: open the app, trigger a page view or throw a test error, then check the CloudWatch RUM console. If nothing appears:

-   Enable `debug: true` and watch the browser console for dispatch logs.
-   Check for 403s — on slim these usually mean missing or expired credentials from your BYO provider. See [`cdn_troubleshooting.md`](./cdn_troubleshooting.md).
-   Confirm the plugin you expected is actually in `eventPluginsToLoad`. There is no default telemetry group — an empty list records only page views.

## See also

-   [`packages/slim.md`](./packages/slim.md) — full slim reference
-   [`concepts/packages.md`](./concepts/packages.md) — slim vs full vs core
-   [`reference/api.md`](./reference/api.md) — API reference (both builds)
-   [`configuration.md`](./configuration.md) — every config option
