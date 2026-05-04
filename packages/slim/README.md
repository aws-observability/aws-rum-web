# `@aws-rum/web-slim`

A smaller, imperative distribution of the [Amazon CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html) web client. Same `AwsRum` class and public API as [`aws-rum-web`](https://www.npmjs.com/package/aws-rum-web) — without bundled Cognito auth, default telemetries, remote config, or SigV4 signing. You wire those up yourself, so you pay only for what you import.

## Size

|                       | `aws-rum-web` (full) | `@aws-rum/web-slim` |
| --------------------- | -------------------- | ------------------- |
| CDN bundle (minified) | ~162 KB              | ~32 KB ✅           |
| CDN bundle (gzipped)  | ~50 KB               | ~10 KB ✅           |

## Documentation

Start at **[docs/README.md](https://github.com/aws-observability/aws-rum-web/blob/main/docs/README.md)** for the full index. Slim-specific entry points:

-   [Full → slim migration guide](https://github.com/aws-observability/aws-rum-web/blob/main/docs/migration_full_to_slim.md) — step-by-step if you're coming from `aws-rum-web`
-   [Packages overview](https://github.com/aws-observability/aws-rum-web/blob/main/docs/concepts/packages.md) — slim vs full vs core
-   [Configuration reference](https://github.com/aws-observability/aws-rum-web/blob/main/docs/configuration.md)
-   [Auth concepts](https://github.com/aws-observability/aws-rum-web/blob/main/docs/concepts/auth.md) — resource-policy flow pairs naturally with slim

## Quick start

**1. Create an app monitor.** Follow [Set up an app monitor](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-get-started.html) in the CloudWatch RUM user guide.

**2. Install and initialize.**

```bash
npm install @aws-rum/web-slim
```

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

Note: no `identityPoolId`, no `telemetries`, no `signing: true`. Every other field of [`AwsRumConfig`](https://github.com/aws-observability/aws-rum-web/blob/main/docs/configuration.md) behaves the same as the full build.

| Bundle | Recommended URL (major-pinned) |
| --- | --- |
| `cwr-slim.js` (slim) | `https://client.rum.us-east-1.amazonaws.com/3.x/cwr-slim.js` |
| `cwr.js` (full) | `https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js` |

See [CDN installation](https://github.com/aws-observability/aws-rum-web/blob/main/docs/cdn_installation.md) and [CDN version pinning](https://github.com/aws-observability/aws-rum-web/blob/main/README.md#cdn-version-pinning).

## Getting help

-   [CloudWatch RUM user guide](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)
-   [File a bug](https://github.com/aws-observability/aws-rum-web/issues/new) — please search [existing issues](https://github.com/aws-observability/aws-rum-web/issues?q=is%3Aissue) first and include the web client version and a repro case.

## License

Apache-2.0. See [LICENSE](https://github.com/aws-observability/aws-rum-web/blob/main/LICENSE).
