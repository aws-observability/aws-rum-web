# Packages

The web client ships as three npm packages. Most users want **`aws-rum-web`**.

| Package | What it is | When to use it |
| --- | --- | --- |
| **`aws-rum-web`** | Full distribution. Bundles the slim core with Cognito auth, SigV4 signing, the default telemetry group (`errors`, `performance`, `http`, `replay`), and remote config. | Default choice. Use this unless you have a specific reason not to. |
| **`@aws-rum/web-slim`** | Imperative distribution. No Cognito, no default telemetries, no built-in signing. `signing` is forced to `false` until you opt in via `setSigningConfigFactory`. Every plugin class is still exported — you wire them up yourself via `eventPluginsToLoad`. | You want the smallest possible bundle and are comfortable bringing your own auth (signing proxy, or SigV4 wired in manually). |
| **`@aws-rum/web-core`** | Engine and plugin types. | Building a custom distribution or writing plugins. Not a standalone SDK. |

## Key differences between slim and full

|  | slim (`@aws-rum/web-slim`) | full (`aws-rum-web`) |
| --- | --- | --- |
| `signing` default | `false` (and cannot be overridden via snippet) | `true` |
| Telemetries default | `[]` | `['errors', 'performance', 'http', 'replay']` |
| Cognito auth (basic + enhanced) | ❌ | ✅ |
| Remote config (`u` field in snippet) | ❌ | ✅ |
| Session replay (RRWebPlugin) | available as opt-in | enabled by default |

The full distribution's `Orchestration` class extends the slim one, so every slim API is also available on the full build.

## BYO auth on slim

Slim does not ship Cognito or SigV4 wired up, but the pieces are available in `@aws-rum/web-core` so you only pay for what you import. A typical BYO-SigV4 slim setup:

```typescript
import { AwsRum, FetchPlugin, JsErrorPlugin } from '@aws-rum/web-slim';
import { createSigningConfig } from '@aws-rum/web-core';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const awsRum = new AwsRum(appId, version, region, {
    endpoint: `https://dataplane.rum.${region}.amazonaws.com`,
    eventPluginsToLoad: [new FetchPlugin(), new JsErrorPlugin()]
});

awsRum.setSigningConfigFactory(createSigningConfig);
awsRum.setAwsCredentials(
    fromCognitoIdentityPool({ identityPoolId, clientConfig: { region } })
);
```

If you instead terminate SigV4 in a proxy in front of `PutRumEvents`, skip both `setSigningConfigFactory` and `setAwsCredentials`. The default `signing: false` is what you want in that case.

## Global names

When installed via the CDN snippet, both distributions expose `window.AwsRumClient`. `window.AwsNexusTelemetry` is also defined as a backward-compatible alias.
