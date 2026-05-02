# CDN installation — details

> **New here?** Start with **[Getting started](./getting_started.md)** for the 3-step install. This page covers the snippet reference, arguments, and advanced setup (self-hosting `cwr.js`, ad-blocker mitigations).

The CloudWatch RUM web client can be dynamically loaded into the application using a code snippet. The code snippet is a self-executing function created by the CloudWatch RUM console. The snippet (1) asynchronously downloads the web client from a content delivery network (CDN) or the application server and (2) configures the web client for the application it is monitoring.

## Generate a code snippet

Use the CloudWatch RUM console to generate a code snippet. See the [CloudWatch RUM documentation ](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html) for instructions on how to create an AppMonitor and generate a code snippet.

The snippet will look similar to the following:

```html
<script>
    (function (n, i, v, r, s, c, u, x, z) {
        x = window.AwsRumClient = { q: [], n: n, i: i, v: v, r: r, c: c, u: u };
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
            telemetries: ['errors', 'http', 'performance'],
            allowCookies: true
        }
    );
</script>
```

## CDN bundle URLs

The web client is published to the CDN as two bundles:

| Bundle | URL (major-pinned, recommended) |
| --- | --- |
| `cwr.js` (full) | `https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js` |
| `cwr-slim.js` (slim) | `https://client.rum.us-east-1.amazonaws.com/3.x/cwr-slim.js` |

### Version pinning

The CDN hosts every published version and supports three levels of precision. Pin at the level that matches your update tolerance:

| Pin | Example | Resolves to |
| --- | --- | --- |
| Major (`N.x`) | `https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js` | Latest `3.*.*` release. **Recommended** — picks up backwards-compatible fixes and features automatically. |
| Minor (`N.M.x`) | `https://client.rum.us-east-1.amazonaws.com/3.0.x/cwr.js` | Latest `3.0.*` patch. Use when you want patches but not new minor-version features. |
| Exact (`N.M.P`) | `https://client.rum.us-east-1.amazonaws.com/3.0.0/cwr.js` | That exact release only. Use for reproducibility; you must manually bump to get fixes. |

The same three levels apply to `cwr-slim.js` (e.g. `3.x/cwr-slim.js`, `3.0.x/cwr-slim.js`, `3.0.0/cwr-slim.js`).

> **:warning: `*.x` URLs update automatically on every new release**
>
> `3.x` and `3.0.x` are floating pointers. The moment a new matching version is published to the CDN, every page that loads that URL begins serving the new bundle on its next cache-miss — no action from you, no rollout window, no canary. For most apps this is desirable (you get fixes for free), but it also means:
>
> -   Regressions introduced in a new release reach your users automatically.
> -   Two browsers loading your page minutes apart may run different web-client versions.
> -   The `3.x` bundle will eventually cross a minor-version boundary (e.g. `3.0.x` → `3.1.0`), bringing new features and any behavior changes allowed under semver-minor.
>
> If you need change control — staged rollouts, QA sign-off per version, or byte-for-byte reproducibility across users — pin to an **exact** version (`3.0.0/cwr.js`) and bump it deliberately in your own deploy pipeline.

## Instrument the application

Copy the code snippet into the `<head>` tag of each HTML file in the web application.

Modify the arguments to match your AppMonitor. See [Arguments](#arguments) for details.

> **:warning: Ad blockers may block the default CDN**
>
> For convenience, AWS distributes a copy of the CloudWatch RUM web client through a content delivery network (CDN). The generated code snippet uses this CDN by default. However, ad blockers may block this CDN's domain. This disables application monitoring for users with ad blockers.
>
> To mitigate this we recommend one of the following:
>
> 1. Have the web application host the CloudWatch RUM web client:<br/> a) Copy [`cwr.js`](https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js) to the assets directory of the web application<br/> b) Modify the code snippet to use the copy of `cwr.js` from (a).
> 2. Install the CloudWatch RUM web client as a [JavaScript module](https://www.npmjs.com/package/aws-rum-web).

Modify the `config` object to configure how the web client should behave. At a minimum, configure the following: (1) how the data will be authenticated, and (2) what aspects of the application will be monitored. See [Application-specific Configurations](configuration.md) for details.

## Arguments

The code snippet accepts six arguments. The snippet below shows these arguments with the body of the snippet's function omitted for readability:

```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js',
        { /* configuration */ }
    );
</script>
```

| Position | Argument&nbsp;Name | Type | Description |
| --- | --- | --- | --- |
| 1 | Namespace | String | The name of the global variable that the application will use to execute commands on the web client. This will typically be `'cwr'`. |
| 2 | AppMonitor ID | String | A globally unique identifier for the CloudWatch RUM AppMonitor which monitors your application. |
| 3 | Application Version | String | Your application's semantic version. If you do not wish to use this field then add any placeholder, such as `'0.0.0'`. |
| 4 | Region | String | The AWS region of the AppMonitor. For example, `'us-east-1'` or '`eu-west-2'`. |
| 5 | Web Client URL | String | The URL of the web client bundle. For example, `'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js'` |
| 6 | Configuration | [Configuration](configuration.md) | An application-specific configuration for the web client. |

## Configuring the CloudWatch RUM web client

The application-specific web client configuration is a JavaScript object whose fields are all optional. While these fields are optional, depending on your application the web client may not function properly if certain fields are omitted. For example, `identityPoolId` is required unless your application performs its own AWS authentication and passes the credentials to the web client using the command `cwr('setAwsCredentials', {...});`.

The snippet below shows several configuration options with the body of the snippet's function omitted for readability:

```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js',
        {
            sessionSampleRate:1,
            identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',
            endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',
            telemetries:['errors','http','performance'],
            allowCookies:true
        }
    );
</script>
```

For a complete list of configuration options, see [Application-specific Configurations](configuration.md).

## Next steps

-   [Configuration reference](./configuration.md)
-   [CDN commands (`cwr(...)`) reference](./cdn_commands.md)
-   [Troubleshooting](./cdn_troubleshooting.md)
