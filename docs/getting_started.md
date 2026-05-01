# Getting started

Instrument a web application with CloudWatch RUM in three steps: install, initialize, and verify.

Before you start, create an AppMonitor in the [CloudWatch RUM console](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-get-started.html). You will need:

-   **Application ID** — a UUID.
-   **Region** — e.g. `us-west-2`.
-   **Cognito identity pool ID** — optional, only if you use Cognito-based auth.

Pick an install method below. The rest of the docs apply to both.

---

## Option A — NPM (for apps with a bundler)

Use NPM if your app is built with webpack, Vite, Rollup, esbuild, or similar.

### 1. Install

```bash
npm install aws-rum-web
```

### 2. Initialize

Run this as early as possible in the application lifecycle — typically at the top of your entry file.

```typescript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
        endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
        telemetries: ['errors', 'performance', 'http', 'replay'],
        allowCookies: true
    };

    new AwsRum(
        '00000000-0000-0000-0000-000000000000', // application ID
        '1.0.0', // application version
        'us-west-2', // region
        config
    );
} catch (error) {
    // Errors during initialization are non-fatal; swallow them so they
    // never take down the host app.
}
```

### 3. Verify

Open your app, then throw a test error:

```javascript
setTimeout(() => {
    throw new Error('rum-verify');
}, 0);
```

Open the CloudWatch RUM console — the error appears within ~1 minute. If nothing shows up, see [Troubleshooting](./cdn_troubleshooting.md).

→ For installation details (slim build, custom bundling), see [NPM installation](./npm_installation.md).

---

## Option B — CDN script (no bundler)

Use the CDN snippet if you're pasting into server-rendered HTML, a CMS, or any app without a bundler.

### 1. Generate the snippet

In the CloudWatch RUM console, create an AppMonitor and copy the generated `<script>` snippet. It looks like this:

```html
<script>
    (function (n, i, v, r, s, c, u, x, z) {
        x = window.AwsRumClient = {
            q: [],
            n: n,
            i: i,
            v: v,
            r: r,
            c: c,
            u: u
        };
        window[n] = function (c, p) {
            x.q.push({ c: c, p: p });
        };
        z = document.createElement('script');
        z.async = true;
        z.src = s;
        document.head.insertBefore(
            z,
            document.getElementsByTagName('script')[0]
        );
    })(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js',
        {
            sessionSampleRate: 1,
            identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
            endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
            telemetries: ['errors', 'performance', 'http', 'replay'],
            allowCookies: true
        }
    );
</script>
```

The `3.x` in the bundle URL is a **major-pinned** pointer — it auto-updates to the latest `3.*.*` release. If you need change control, pin to a minor (`3.0.x`) or exact (`3.0.0`) version instead. See [CDN bundle URLs](./cdn_installation.md#cdn-bundle-urls).

### 2. Install

Paste the snippet into the `<head>` of every HTML document you want to monitor — as early as possible, ideally before any other `<script>` tag.

### 3. Verify

Open your app and trigger a test error from the browser console:

```javascript
setTimeout(() => {
    throw new Error('rum-verify');
}, 0);
```

The error appears in the CloudWatch RUM console within ~1 minute.

→ For installation details (self-hosted cwr.js, CSP, ad-blocker mitigations), see [CDN installation](./cdn_installation.md).

---

## What gets captured by default

With `telemetries: ['errors', 'performance', 'http', 'replay']`:

-   **Errors** — uncaught JS errors and promise rejections ([JsErrorPlugin](./plugins/README.md)).
-   **Performance** — page load timing, resource timing, and Web Vitals (LCP, FID, CLS, INP).
-   **HTTP** — fetch and XHR requests, including status codes and latency.
-   **Replay** — DOM snapshots for session replay, with text and input values masked ([RRWebPlugin](./plugins/RRWebPlugin.md)).

Page views are always recorded unless you set `disableAutoPageView: true`.

## Next steps

-   **[Configuration](./configuration.md)** — sampling rates, cookies, custom endpoints, every option.
-   **[API reference](./reference/api.md)** — recording custom events, page views, user IDs, and session attributes.
-   **Framework guides** — [React](./cdn_react.md) · [Angular](./cdn_angular.md).
-   **[Troubleshooting](./cdn_troubleshooting.md)** — symptoms and fixes for common install issues.
