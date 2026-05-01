# `@aws-rum/web-slim`

A smaller, imperative distribution of the CloudWatch RUM web client. Same `AwsRum` class and public API as `aws-rum-web`, but without bundled Cognito auth, default telemetries, remote config, or SigV4 signing. You wire those up yourself — pay only for what you import.

|  | `aws-rum-web` (full) | `@aws-rum/web-slim` (slim) |
| --- | --- | --- |
| Bundle (minified) | ~162 KB | ~32 KB |
| Bundle (gzipped) | ~50 KB | ~10 KB |
| Cognito auth | ✅ | ❌ (BYO via `setAwsCredentials`) |
| SigV4 signing | ✅ | opt-in via `setSigningConfigFactory` |
| Remote config (`u` snippet field) | ✅ | ❌ |
| Default telemetries | `errors`, `performance`, `http`, `replay` | none (load explicitly) |
| `telemetries` config field | ✅ | ❌ (use `eventPluginsToLoad`) |

The full distribution's `AwsRum` class extends the slim one — every slim API is also available on the full build.

## When to pick slim

Pick slim when **any** of these is true:

-   Bundle size is load-bearing (marketing sites, commerce landing pages, slow networks).
-   You already have AWS credentials from another source (your own Cognito client, STS federation, a server-signed token) and don't need the bundled Cognito helpers.
-   You terminate SigV4 at a proxy in front of `PutRumEvents` so the client ships unsigned.
-   You want explicit control over which plugins load instead of the telemetry groups.

If none of those apply, use `aws-rum-web`.

## Install

```bash
npm install @aws-rum/web-slim
```

Slim is published alongside `aws-rum-web` on the same release cadence. Version numbers match.

## Initialize

```typescript
import {
    AwsRum,
    AwsRumConfig,
    FetchPlugin,
    JsErrorPlugin
} from '@aws-rum/web-slim';

const config: AwsRumConfig = {
    sessionSampleRate: 1,
    endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
    eventPluginsToLoad: [new FetchPlugin(), new JsErrorPlugin()],
    allowCookies: true
};

const awsRum = new AwsRum('application-id', '1.0.0', 'us-west-2', config);
```

No `identityPoolId`, no `telemetries`, no `signing: true`. The rest of `AwsRumConfig` — `sessionSampleRate`, `cookieAttributes`, `endpoint`, `debug`, etc. — works the same as in the full build. See [`configuration.md`](../configuration.md).

## BYO credentials

Slim does not fetch Cognito credentials for you. If your backend requires signed requests, supply credentials yourself:

```typescript
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

awsRum.setAwsCredentials(
    fromCognitoIdentityPool({
        identityPoolId: 'us-west-2:xxxx',
        clientConfig: { region: 'us-west-2' }
    })
);
```

Any `AwsCredentialIdentity` or `AwsCredentialIdentityProvider` works — STS, a custom resolver, a pre-fetched session, etc.

If you terminate SigV4 at a proxy (the proxy re-signs the request before forwarding to `PutRumEvents`), skip this step. The default `signing: false` is what you want.

## Opt into SigV4 signing

SigV4 is not bundled into slim. Opt in by wiring `createSigningConfig` from `@aws-rum/web-core`:

```typescript
import { createSigningConfig } from '@aws-rum/web-core';

awsRum.setSigningConfigFactory(createSigningConfig);
awsRum.setAwsCredentials(provider);
```

Both calls are required — signing needs credentials to sign with. Importing `createSigningConfig` pulls in `@aws-sdk/signature-v4` and its deps (~30 KB gzipped), which is why it is not the default.

## Load plugins explicitly

Slim has no `telemetries` config option. Instead, pass instantiated plugins via `eventPluginsToLoad`:

```typescript
import {
    AwsRum,
    FetchPlugin,
    JsErrorPlugin,
    NavigationPlugin,
    ResourcePlugin,
    WebVitalsPlugin,
    XhrPlugin
} from '@aws-rum/web-slim';

new AwsRum(appId, version, region, {
    eventPluginsToLoad: [
        new JsErrorPlugin(),
        new NavigationPlugin(),
        new ResourcePlugin(),
        new WebVitalsPlugin(),
        new FetchPlugin(),
        new XhrPlugin()
    ]
});
```

The equivalent `telemetries` array on the full build is `['errors', 'performance', 'http']`. Pass plugin options via the constructor — for example `new XhrPlugin({ trace: true })` instead of the `http` group's config object.

Configure the X-Ray header, DOM event selectors, and similar on the plugin constructor rather than the top-level config. See [`plugins/`](../plugins/README.md) for each plugin's options.

## What's not in slim

Three features from `aws-rum-web` are not available on slim:

-   **`telemetries` config field** — replaced by `eventPluginsToLoad`.
-   **Cognito auth (`identityPoolId`, `guestRoleArn`)** — call `setAwsCredentials` with your own provider.
-   **Remote config (`u` field in the CDN snippet)** — all configuration is local.

Plugins themselves are all exported. Session replay (`RRWebPlugin`) works on slim — just add it to `eventPluginsToLoad`.

## CDN snippet

Slim publishes its own CDN bundle. Point the snippet's `s` argument at `cwr-slim.js` instead of `cwr.js`:

```html
<script>
    (function (n, i, v, r, s, c) {
        /* standard RUM snippet */
    })(
        'cwr',
        'application-id',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/3.x/cwr-slim.js',
        {
            sessionSampleRate: 1,
            endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com'
        }
    );

    // BYO credentials after the snippet loads
    cwr('setAwsCredentials', {
        accessKeyId: '...',
        secretAccessKey: '...',
        sessionToken: '...'
    });
</script>
```

The CDN command surface is the same as `aws-rum-web`, minus `identityPoolId` / `guestRoleArn` / `telemetries` in the config object.

## See also

-   [Migrating from `aws-rum-web` to `@aws-rum/web-slim`](../migration_full_to_slim.md)
-   [Packages overview](../concepts/packages.md) — slim vs full vs core
-   [API reference](../reference/api.md)
-   [Configuration reference](../configuration.md)
