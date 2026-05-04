# `@aws-rum/web-core`

> **Internal-only.** This package is not a standalone SDK and has no supported public API. It is published to npm as an implementation detail of [`aws-rum-web`](https://www.npmjs.com/package/aws-rum-web) and [`@aws-rum/web-slim`](https://www.npmjs.com/package/@aws-rum/web-slim). Exports, types, and behavior may change in any release without notice.

If you are instrumenting a web application with Amazon CloudWatch RUM, install one of the following instead:

-   **[`aws-rum-web`](https://www.npmjs.com/package/aws-rum-web)** — the default full distribution. Cognito auth, SigV4 signing, and default telemetries bundled.
-   **[`@aws-rum/web-slim`](https://www.npmjs.com/package/@aws-rum/web-slim)** — smaller imperative build. Bring your own auth, load plugins explicitly.

See the [packages overview](https://github.com/aws-observability/aws-rum-web/blob/main/docs/concepts/packages.md) for the differences.

## What's in here

`@aws-rum/web-core` contains the shared telemetry engine, plugin base classes, event schemas, dispatcher, session manager, and SigV4 signing helpers that `aws-rum-web` and `@aws-rum/web-slim` are built on top of. It is consumed internally by those packages and is not intended to be imported directly by application code.

## License

Apache-2.0. See [LICENSE](https://github.com/aws-observability/aws-rum-web/blob/main/LICENSE).
