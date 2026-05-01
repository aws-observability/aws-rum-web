# Authentication

The web client must send signed (SigV4) requests to the CloudWatch RUM `PutRumEvents` API. There are four supported ways to get credentials.

## 1. Cognito enhanced authflow (recommended)

Set `identityPoolId` only.

```javascript
{
    identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000';
}
```

The web client calls `GetId` and then `GetCredentialsForIdentity` against the identity pool. This is the simplest flow and uses one fewer network call than the basic flow.

## 2. Cognito basic (classic) authflow

Set both `identityPoolId` and `guestRoleArn`.

```javascript
{
    identityPoolId: 'us-west-2:00000000-0000-0000-0000-000000000000',
    guestRoleArn: 'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-0000000000000-Unauth'
}
```

The web client calls `GetId`, then `GetOpenIdToken`, then `AssumeRoleWithWebIdentity` against STS. Use this when you need the IAM role to be explicit (for example, to scope policies with specific role ARNs).

## 3. Custom credentials

Leave `identityPoolId` unset and forward credentials to the client yourself.

```typescript
awsRum.setAwsCredentials(credentials); // AwsCredentialIdentity or provider
```

Use this when you mint credentials via your own backend (e.g. your app is already authenticated and your backend vends short-lived RUM credentials).

## 4. Unsigned proxy

Set `signing: false` and route traffic through an authenticated proxy that signs on your behalf.

```javascript
{
    signing: false,
    endpoint: 'https://your-proxy.example.com/rum/'
}
```

> ⚠️ **Never set `signing: false` when pointing directly at `dataplane.rum.*.amazonaws.com`.** Unsigned direct requests will 403.

## Credential caching

When using Cognito, credentials are cached in `localStorage.cwr_c` and the identity ID in `localStorage.cwr_i`. On a 403, the web client automatically clears these and re-fetches. A second consecutive 403 disables the client for the rest of the page.

## Choosing between flows

|  | Enhanced | Basic |
| --- | --- | --- |
| Round trips | 2 | 3 |
| Requires `guestRoleArn` | No | Yes |
| Works with role session tags | Yes | Yes |
| Recommended | ✅ | Only if you need explicit role control |

See also: [`troubleshooting`](../cdn_troubleshooting.md) for common 403 causes.
