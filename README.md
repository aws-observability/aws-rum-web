# Amazon CloudWatch RUM Web Client

The CloudWatch RUM web client is a JavaScript library that performs real user monitoring (RUM) on web applications. It captures page load timing, web vitals (LCP, FID, CLS, INP), JavaScript errors, HTTP requests, session replays, and custom events, then ships them to [Amazon CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html).

## Quick start

**1. Create an app monitor.** Follow [Set up an app monitor](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-get-started.html) in the CloudWatch RUM user guide. You will receive an application ID, a region, and (optionally) a Cognito identity pool ID.

**2. Install and initialize.**

NPM:

```bash
npm install aws-rum-web
```

```typescript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
        endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
        telemetries: ['performance', 'errors', 'http'],
        allowCookies: true,
        enableXRay: false
    };

    const APPLICATION_ID = '00000000-0000-0000-0000-000000000000';
    const APPLICATION_VERSION = '1.0.0';
    const APPLICATION_REGION = 'us-west-2';

    const awsRum: AwsRum = new AwsRum(
        APPLICATION_ID,
        APPLICATION_VERSION,
        APPLICATION_REGION,
        config
    );
} catch (error) {
    // Ignore errors thrown during CloudWatch RUM web client initialization
}
```

CDN (embedded script): paste the snippet from the RUM console into your `<head>`, or see [CDN installation](docs/cdn_installation.md).

**3. Verify it works.** Open your app, trigger a page view or throw a test error, then open the CloudWatch RUM console. Events appear within ~1 minute. If nothing shows up, enable `debug: true` in the config and check the browser console — every dispatch is logged.

```javascript
// Throw a test error to verify errors telemetry
setTimeout(() => {
    throw new Error('rum-verify');
}, 0);
```

## Documentation

Start at **[docs/README.md](docs/README.md)** for the full index. Common entry points:

-   [Install as a JavaScript module (NPM)](docs/npm_installation.md)
-   [Install as an embedded script (CDN)](docs/cdn_installation.md)
-   [Configuration reference](docs/configuration.md)
-   [Commands / API reference](docs/cdn_commands.md)
-   [Framework guides: React](docs/cdn_react.md) · [Angular](docs/cdn_angular.md)
-   [Troubleshooting](docs/cdn_troubleshooting.md)
-   [Examples](docs/examples.md)

## Getting help

-   [CloudWatch RUM user guide](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)
-   [Amazon CloudWatch forum](https://forums.aws.amazon.com/forum.jspa?forumID=138)
-   [AWS Support](https://docs.aws.amazon.com/awssupport/latest/user/getting-started.html)
-   [File a bug](https://github.com/aws-observability/aws-rum-web/issues/new) — please search [existing issues](https://github.com/aws-observability/aws-rum-web/issues?q=is%3Aissue) first and include the web client version and a repro case.

## Contributing

PRs welcome. See [CONTRIBUTING](./CONTRIBUTING.md).

### Build from source

Requires Node.js 20+.

```bash
npm install
npm run release
```

Outputs:

-   CDN bundle: `./build/assets/cwr.js`, `./build/assets/cwr.map.js`
-   NPM (ES + CJS): `./dist/es/index.js`, `./dist/cjs/index.js` and matching `.d.ts` files

### Run tests

```bash
npm run test           # Jest unit tests
npm run integ          # Playwright integration tests
npm run smoke:headless # Playwright smoke tests
```

Dev server (for exploratory testing at http://localhost:9000):

```bash
npm run server
```

### Pre-commit

```bash
npm run lint:fix
npm run prettier:fix
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications).

## License

Apache-2.0.
