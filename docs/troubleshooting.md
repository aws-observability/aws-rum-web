# Troubleshooting

Indexed by symptom. Applies to both NPM and CDN installs unless noted.

-   [I see no events in the CloudWatch RUM console](#i-see-no-events-in-the-cloudwatch-rum-console)
-   [I see a 403 from `PutRumEvents`](#i-see-a-403-from-putrumevents)
-   [Slim: `PutRumEvents` returns 403 unsigned](#slim-putrumevents-returns-403-unsigned)
-   [Dispatch stays disabled after a single 403](#dispatch-stays-disabled-after-a-single-403)
-   [I see `MissingAuthenticationTokenException`](#i-see-missingauthenticationtokenexception)
-   [Cognito / STS token vending fails](#cognito--sts-token-vending-fails)
-   [My CSP blocks the web client](#my-csp-blocks-the-web-client)
-   [My SPA isn't recording page views for dynamic routes](#my-spa-isnt-recording-page-views-for-dynamic-routes)
-   [My custom event is being dropped](#my-custom-event-is-being-dropped)
-   [Client-side traces don't connect to server-side X-Ray traces](#client-side-traces-dont-connect-to-server-side-x-ray-traces)

---

## I see no events in the CloudWatch RUM console

Three common causes, in order of likelihood:

**1. `sessionSampleRate` is less than 1.** With sampling below 1, any given session may not be recorded. Set `sessionSampleRate: 1` to confirm instrumentation is working, then dial it back.

**2. No AWS credentials.** The web client does not dispatch without credentials. You need one of:

-   `identityPoolId` in the config (Cognito, default path — **full build only; slim silently ignores this field**).
-   `awsRum.setAwsCredentials(provider)` / `cwr('setAwsCredentials', creds)` called at runtime.
-   `signing: false` **and** a signing proxy in front of `PutRumEvents`.

On `@aws-rum/web-slim` there is no built-in auth. Setting `identityPoolId` has no effect, and the first dispatch fires unsigned → 403. See [Slim BYO auth](#slim-put-rum-events-returns-403-unsigned) below.

**3. Session event limit reached.** Default is 200 events per session. If the client sends data then stops, you've hit the limit. Raise or disable it:

```typescript
const config: AwsRumConfig = {
    sessionEventLimit: 0 // 0 = unlimited
};
```

---

## I see a 403 from `PutRumEvents`

The request was signed and sent, but CloudWatch RUM rejected it. Check in order:

**Region mismatch.** The `region` argument and `endpoint` (if set) must match the region the AppMonitor was created in. `us-east-1` AppMonitor with `dataplane.rum.us-west-2.amazonaws.com` → 403.

> **⚠️ The default `endpoint` is hardcoded to us-west-2.** If you omit `endpoint` from your config and your AppMonitor is not in us-west-2, every request will cross-region to us-west-2 and 403. Always set `endpoint: 'https://dataplane.rum.<region>.amazonaws.com'` to match your AppMonitor region.

**Stale credentials in `localStorage`.** When anonymous auth is used, credentials are cached under `cwr_c`. If the same domain hosts multiple AppMonitors, cached credentials from one will fail auth against another. Clear `localStorage` to confirm.

**IAM role missing `rum:PutRumEvents` on this AppMonitor.** Re-using an existing Cognito identity pool and role with a new AppMonitor is the usual cause — the role policy lists the old AppMonitor ARN only.

```json
{
    "Effect": "Allow",
    "Action": "rum:PutRumEvents",
    "Resource": "arn:aws:rum:[region]:[account]:appmonitor/[AppMonitor name]"
}
```

---

## Slim: `PutRumEvents` returns 403 unsigned

Symptom: `@aws-rum/web-slim` demo/app returns 403 on the first dispatch; the request has no `Authorization` header or `X-Amz-Credential` query param.

Cause: slim forces `signing: false` by default. `identityPoolId` has no effect on slim, and `setAwsCredentials` alone doesn't enable signing — you must also install a signing factory.

Fix — BYO SigV4 using the helper exported from core:

```typescript
import { AwsRum, FetchPlugin } from '@aws-rum/web-slim';
import { createSigningConfig } from '@aws-rum/web-core';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const awsRum = new AwsRum(appId, version, region, {
    endpoint: `https://dataplane.rum.${region}.amazonaws.com`,
    eventPluginsToLoad: [new FetchPlugin()]
});

awsRum.setSigningConfigFactory(createSigningConfig);
awsRum.setAwsCredentials(
    fromCognitoIdentityPool({ identityPoolId, clientConfig: { region } })
);
```

Alternative: leave `signing: false` and route traffic through a proxy that terminates SigV4 in front of `PutRumEvents`.

---

## Dispatch stays disabled after a single 403

Symptom: one 403 log, followed by `Dispatch disabled`, and no further requests for the rest of the session.

Behavior: on a signed 403 with valid local creds, the client purges cached credentials and retries _once_ with a fresh set. If the retry also 403s — or if the 403 was unsigned — dispatch disables permanently for that session.

This usually means the 403 is not credential-related: check the [403 causes above](#i-see-a-403-from-putrumevents) (region, IAM policy, AppMonitor ARN). Reload after fixing — dispatch re-enables on init, not retry.

---

## I see `MissingAuthenticationTokenException`

Returned in the `x-amzn-ErrorType` header when the request was unsigned. `PutRumEvents` requires [SigV4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html). Signing is on by default — if you set `signing: false`, you must terminate signing in a proxy.

---

## Cognito / STS token vending fails

**`AssumeRoleWithWebIdentity` fails.** The IAM role is missing a trust relationship for the Cognito identity. The role needs:

```json
{
    "Effect": "Allow",
    "Principal": { "Federated": "cognito-identity.amazonaws.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
        "StringEquals": {
            "cognito-identity.amazonaws.com:aud": "[cognito identity pool id]"
        },
        "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
    }
}
```

**`GetCredentialsForIdentity` returns `InvalidIdentityToken`.** You've set both `identityPoolId` and `guestRoleArn`, which selects Cognito's [basic (classic) authflow](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html) — but the pool has `AllowClassicFlow: false`.

Two fixes:

-   Remove `guestRoleArn` (switches to the enhanced authflow — recommended).
-   Or set `AllowClassicFlow: true` on the pool via console or `aws cognito-identity update-identity-pool`.

---

## My CSP blocks the web client

The default CSP blocks inline scripts, including the CDN snippet. Allow it with a hash (recommended) or nonce. A complete CSP:

| Directive | Value |
| --- | --- |
| `script-src` | `'sha256-[snippet hash]'`<br/>`https://client.rum.us-east-1.amazonaws.com` |
| `connect-src` | `https://dataplane.rum.[region].amazonaws.com`<br/>`https://cognito-identity.[region].amazonaws.com`<br/>`https://sts.[region].amazonaws.com` |

Generate the hash from the exact snippet body you'll serve:

```bash
echo -n "$SNIPPET" | openssl sha256 -binary | openssl base64
```

Place the output in the `'sha256-…'` directive value. See [MDN: CSP script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#sources).

---

## My SPA isn't recording page views for dynamic routes

The default `PageViewPlugin` records on `history.pushState`, but routes like `/user/123` and `/user/456` show up as separate pages. Disable the default and record yourself from the router:

```typescript
// config
{
    disableAutoPageView: true;
}
```

Then call `recordPageView` on route change. Framework-specific examples: [React](./cdn_react.md#record-custom-page-ids-on-route-changes), [Angular](./cdn_angular.md#record-custom-page-ids-on-route-changes).

---

## My custom event is being dropped

Three gates:

1.  **Custom events must be enabled on the AppMonitor.** See [Send custom events](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-custom-events.html).
2.  **Event type must match** `^[a-zA-Z0-9_.-]{1,256}$`.
3.  **Each event must be under 6 KB** serialized (including metadata). Larger events are dropped silently.

See [API reference: Event](./reference/api.md#event).

---

## Client-side traces don't connect to server-side X-Ray traces

Set `addXRayTraceIdHeader: true` on the `http` telemetry. The client adds `X-Amzn-Trace-Id` to outgoing requests so X-Ray can stitch them.

> **⚠️ Enabling `addXRayTraceIdHeader` can break requests.** Adding headers changes CORS preflight behavior and may invalidate a request signature. Test in a non-production environment first.

```typescript
const config: AwsRumConfig = {
    enableXRay: true,
    telemetries: [['http', { addXRayTraceIdHeader: true }]]
};
```

---

## See also

-   [Configuration reference](./configuration.md)
-   [API reference](./reference/api.md)
-   [GitHub issues](https://github.com/aws-observability/aws-rum-web/issues)
