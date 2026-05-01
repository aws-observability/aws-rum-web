# CloudWatch RUM Web Client — Documentation

JavaScript library for real user monitoring on web apps. Captures page load timing, Web Vitals, JS errors, HTTP requests, session replays, and custom events, then ships them to [Amazon CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html).

## Start here

-   **[Getting started](./getting_started.md)** — install (NPM or CDN), initialize, and verify in 3 steps.

## Reference

-   **[Configuration](./configuration.md)** — every config option with type, default, and description.
-   **[API reference](./reference/api.md)** — every method on `AwsRum` with slim/full build notes.
-   **[CDN commands](./cdn_commands.md)** — `cwr(...)` command queue signatures.

## Concepts

-   **[Packages](./concepts/packages.md)** — `aws-rum-web` vs `@aws-rum/web-slim` vs `@aws-rum/web-core`.
-   **[Sessions and sampling](./concepts/sessions.md)** — lifecycle, identity, cookies vs localStorage.
-   **[Authentication](./concepts/auth.md)** — Cognito enhanced/basic, custom credentials, unsigned.
-   **[Dispatch and batching](./concepts/dispatch.md)** — batching, flushing, compression.
-   **[Plugins](./concepts/plugins.md)** — architecture and writing your own.

## Framework guides

-   [React](./cdn_react.md)
-   [Angular](./cdn_angular.md)

## Plugins

Built-in plugins ship as part of the default telemetry groups. See **[Plugin reference](./plugins/README.md)** for details.

| Plugin | Telemetry group | Default |
| --- | --- | --- |
| JsErrorPlugin | `errors` | ✅ |
| NavigationPlugin | `performance` | ✅ |
| ResourcePlugin | `performance` | ✅ |
| WebVitalsPlugin | `performance` | ✅ |
| XhrPlugin | `http` | ✅ |
| FetchPlugin | `http` | ✅ |
| [RRWebPlugin](./plugins/RRWebPlugin.md) | `replay` | ✅ (text/input masked) |
| DomEventPlugin | `interaction` | opt-in |
| TTIPlugin | — | opt-in |
| PageViewPlugin | — | always on (unless `disableAutoPageView`) |

Defaults apply to the full build. The slim build has no default telemetries — see [Packages](./concepts/packages.md).

## Troubleshooting

-   **[Troubleshooting](./cdn_troubleshooting.md)** — 403s, CSP, ad blockers, SPA routing, region mismatch, CORS.
-   First thing to try: enable `debug: true` and watch the browser console.

## Migrating from 2.x

-   **[2.x → 3.x migration guide](./migration_v2_to_v3.md)** — monorepo split, ES2017 target, replay-on-by-default, other breaking changes.

## Contributing

See [CONTRIBUTING](../CONTRIBUTING.md).
