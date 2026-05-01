# Authentication

The CloudWatch RUM `PutRumEvents` API accepts events over HTTPS. By default it requires a signed (SigV4) request, but you can opt an individual AppMonitor into unauthenticated ingestion by attaching a **resource-based policy**. Five supported approaches, in order of simplicity:

| # | Approach | Signing | Credentials in browser |
| --- | --- | --- | --- |
| 1 | Resource-based policy (public) | Off | None |
| 2 | Cognito enhanced authflow | On | Fetched via Cognito |
| 3 | Cognito basic (classic) authflow | On | Fetched via STS |
| 4 | Custom credentials | On | Supplied by your backend |
| 5 | Unsigned proxy | Off (to proxy) | None (proxy signs) |

## 1. Resource-based policy (recommended for public apps)

Attach a resource-based policy to the AppMonitor granting `rum:PutRumEvents` to `Principal: "*"`. The web client then sends unsigned requests — no Cognito pool, no IAM role, no credentials in the browser. This is the simplest setup and pairs naturally with `@aws-rum/web-slim`.

**Web client config:**

```javascript
{
    signing: false,
    endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com'
}
```

**AppMonitor resource policy** (attach via the CloudWatch RUM console, CLI `put-resource-policy`, or CloudFormation):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicPutRumEvents",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "rum:PutRumEvents",
            "Resource": "arn:aws:rum:us-west-2:000000000000:appmonitor/MyAppMonitor",
            "Condition": {
                "StringLike": {
                    "aws:referer": ["https://www.example.com/*"]
                }
            }
        }
    ]
}
```

The policy grants a **single action on a single resource**. Blast radius is bounded to this AppMonitor — compromise of the policy cannot reach other services or other AppMonitors.

### What the referer condition does (and doesn't) do

The optional `aws:referer` condition restricts requests to the browsers claiming to come from your domain(s). It is enforced by AWS, but the `Referer` header is set by the browser and can be forged by any HTTP client. Treat it as a **speed bump against casual scraping**, not a security control.

Also consider these conditions depending on your threat model:

-   `aws:UserAgent` — similarly spoofable, but filters out trivial curl-based abuse.
-   `aws:SourceIp` — useful if your traffic is regionally concentrated and you want to rate-limit by IP range. Not appropriate for global consumer web apps.

### Tradeoffs

-   **Anyone can send events.** A determined third party who discovers the AppMonitor ARN can write arbitrary events. You pay for the ingestion.
-   **No caller identity.** You cannot attribute events back to an authenticated user via AWS credentials. Put user/session info into event metadata or attributes instead.
-   **No egress controls.** You cannot `Deny` specific users the way you can with IAM roles. Rotation means creating a new AppMonitor.

### When to pick something else

-   Your app is behind a login wall and you already have a way to identify the user → use flow 2, 3, or 4 and include user identity in the signed request context.
-   You have strict compliance or cost controls that require per-caller attribution → use Cognito (flow 2 or 3).
-   You are behind a reverse proxy that can sign on your behalf → use flow 5.

## 2. Cognito enhanced authflow

Set `identityPoolId` only.

```javascript
{
    identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000';
}
```

The web client calls `GetId` then `GetCredentialsForIdentity` against the identity pool. Simpler than the basic flow and uses one fewer network call.

Use this when you want managed credentials for anonymous browser users and the resource-policy flow isn't a fit.

## 3. Cognito basic (classic) authflow

Set both `identityPoolId` and `guestRoleArn`.

```javascript
{
    identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
    guestRoleArn: 'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-0000000000000-Unauth'
}
```

The web client calls `GetId`, then `GetOpenIdToken`, then `AssumeRoleWithWebIdentity` against STS. Use this when you need the IAM role to be explicit (for example, to scope policies with specific role ARNs).

## 4. Custom credentials

Leave `identityPoolId` unset and forward credentials to the client yourself.

```typescript
awsRum.setAwsCredentials(credentials); // AwsCredentialIdentity or provider
```

Use this when your app mints credentials via your own backend (your app is already authenticated and vends short-lived RUM credentials per session). Required on `@aws-rum/web-slim` when you want signing.

## 5. Unsigned proxy

Set `signing: false` and route traffic through an authenticated proxy that signs on your behalf.

```javascript
{
    signing: false,
    endpoint: 'https://your-proxy.example.com/rum/'
}
```

> ⚠️ **Never set `signing: false` when pointing directly at `dataplane.rum.*.amazonaws.com` _without_ a resource-based policy on the AppMonitor.** Unsigned direct requests will 403.

## Credential caching

When using Cognito (flows 2 and 3), credentials are cached in `localStorage.cwr_c` and the identity ID in `localStorage.cwr_i`. On a 403, the web client automatically clears these and re-fetches. A second consecutive 403 disables the client for the rest of the page.

The resource-policy flow and the unsigned proxy flow don't cache anything — there's nothing to cache.

## Choosing between Cognito flows

|  | Enhanced | Basic |
| --- | --- | --- |
| Round trips | 2 | 3 |
| Requires `guestRoleArn` | No | Yes |
| Works with role session tags | Yes | Yes |
| Recommended | ✅ | Only if you need explicit role control |

## See also

-   [`troubleshooting`](../cdn_troubleshooting.md) — 403 causes and fixes.
-   [`packages/slim.md`](../packages/slim.md) — the resource-policy flow pairs naturally with the slim distribution: unsigned + no Cognito = the smallest possible bundle.
-   [Attach a resource-based policy to an AppMonitor](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-resource-policy.html) — AWS user guide.
