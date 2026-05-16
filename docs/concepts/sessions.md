# Sessions and sampling

A **session** is a period of activity by a single anonymous user. Every RUM event is tagged with a session ID so the CloudWatch RUM service can compute sessionized metrics (errors per session, sessions with errors, etc.).

## Lifecycle

1. When the web client initializes, it calls `getSession()`.
2. If a valid session exists in the `cwr_s` cookie (and cookies are allowed), it is reused.
3. Otherwise a new session is created:
    - A UUID v4 is generated.
    - The session is sampled: included if `Math.random() < sessionSampleRate`, else marked as not recording.
    - A `com.amazon.rum.session_start_event` is emitted.
4. The session expires after `sessionLengthSeconds` (default 1800s = 30 min) of inactivity. The next `getSession()` call rotates it.

## Sampling

`sessionSampleRate` (default `1`) is the probability that a given session's events are recorded.

-   `1` — record every session.
-   `0.1` — record 10% of sessions. Sampling is decided **once per session**, not per event.
-   `0` — record no sessions. Useful for kill-switching the client without removing the snippet.

Sampling is applied to the session, not to individual events. Once a session is in, all of its events are recorded up to `sessionEventLimit` (default 200). Set `sessionEventLimit: 0` to disable the per-session cap.

## Starting a session at runtime

Most hosts let the SDK manage session boundaries automatically — a session expires after `sessionLengthSeconds` of inactivity and the next event mints a new one. Some hosts, however, know about boundaries the SDK can't detect: a long-lived kiosk page that hands off between users at sign-out, a single-page app that completes an authentication flow mid-session, or a leader instance that wants to rotate the shared session ID across all followers atomically.

`startSession()` begins a new session immediately:

```typescript
// Mint a fresh session — fresh UUID, fresh sampling roll, session_start emitted.
const newId = awsRum.startSession();
```

By default the call mints a new UUID, re-rolls the sampling decision against `sessionSampleRate`, resets `eventCount`, disengages session manual mode (so the SDK resumes auto-rotation on expiry), and emits a `session_start` event subject to `suppressSessionStartEvent`. The new session ID is returned.

Optional overrides let a leader hand the SDK a pre-chosen ID and rotate the user identity in the same call:

```typescript
// Leader-driven rotation: pick the new IDs, then broadcast them to followers.
const newSessionId = awsRum.startSession({
    sessionId: 'host-chosen-uuid',
    userId: 'host-chosen-user-uuid'
});
// host.broadcast({ sessionId: newSessionId, userId: '...' })
```

When `sessionId` is supplied, manual mode engages (same stickiness as `pinSessionId()`) so the SDK never auto-mints again until the host calls `startSession()` without an override. When `userId` is supplied, manual mode engages for the user identity (same stickiness as `pinUserId()`); no `user_start` event exists, so the rotation is silent.

A `session_start` event IS emitted on every `startSession()` call (subject to `suppressSessionStartEvent`) — this is the leader-side rotation API. Followers should keep using `pinSessionId()`, which adopts an ID without emitting `session_start` and so cannot duplicate the leader's start event.

Empty-string overrides are rejected with a warn log; `startSession({ sessionId: '' })` falls back to minting a fresh UUID, and `startSession({ userId: '' })` preserves the existing user identity.

## User identity

In addition to the session ID, the web client persists an anonymous **user ID** in the `cwr_u` cookie for `userIdRetentionDays` days (default 30). This lets CloudWatch RUM count returning visitors.

Set `userIdRetentionDays: 0` to disable the user cookie — the client will use the nil UUID (`00000000-0000-0000-0000-000000000000`) for all users.

### Manual mode

The host can take ownership of the user identity by seeding `userId` at construction or calling `pinUserId(id)` at runtime. Once engaged, manual mode is sticky for the life of the instance:

-   `getUserId()` returns the host-supplied ID even when `allowCookies: false` or `userIdRetentionDays: 0`.
-   No `user_start` event is ever emitted (there is no analogue to `session_start` for users).
-   `pinUserId('')` is rejected with a warn log; the existing ID is preserved.

Use this when the host already knows the user identity (a signed-in account ID, a stable device ID issued by the platform, or a leader instance's anonymous ID — see below).

## Cookies vs localStorage

| Storage      | Key         | Default name | Purpose                        |
| ------------ | ----------- | ------------ | ------------------------------ |
| Cookie       | session     | `cwr_s`      | Session ID + expiry            |
| Cookie       | user        | `cwr_u`      | Long-lived anonymous user ID   |
| localStorage | credentials | `cwr_c`      | Cached Cognito/STS credentials |
| localStorage | identity    | `cwr_i`      | Cognito identity ID            |

When `cookieAttributes.unique: true`, all four names are suffixed `_<AppMonitorId>` so multiple app monitors on the same domain don't collide.

If `allowCookies: false`, no cookies are set — the session and user IDs live only in memory for the life of the page. Credentials in localStorage are unaffected by this flag.

See also: [`configuration.md`](../configuration.md) for the full list of related options.

## Sharing a session across contexts

Some hosts run multiple instances of the web client in separate JavaScript contexts that can't share cookies — for example, VS Code extension webviews, Electron `BrowserWindow`s, or sandboxed micro-frontend iframes. By default each instance mints its own session ID, so one logical user session appears as N separate sessions in CloudWatch RUM with no way to correlate them.

> **Session replay is not supported across shared contexts.** This feature correlates _event_ telemetry (errors, performance, http) under a single session ID. The `replay` telemetry / `RRWebPlugin` is not yet cross-context aware: each instance records its own DOM independently, recordings cannot be stitched together in the CloudWatch RUM console, and follower recordings may drop frames or fail to start depending on adoption timing (see Caveats below). If session replay is a hard requirement, run a single instance per logical session for now.

To share a single session across contexts, elect one instance as the **leader** and the rest as **followers**:

1. The leader constructs the client normally and reads its session ID with `getSessionId()`.
2. The host process broadcasts that ID to follower contexts.
3. Each follower constructs the client with `sessionId` (the seeded ID). Seeding `sessionId` automatically forces `suppressSessionStartEvent: true`, so a follower can never emit a duplicate of the leader's `session_start`.

```typescript
// Leader context
const leader = new AwsRum(appId, version, region, config);
const sharedId = leader.getSessionId();
// host.broadcast(sharedId) — VS Code postMessage, Electron IPC, postMessage, etc.

// Follower context — sessionId implies suppressSessionStartEvent: true
const follower = new AwsRum(appId, version, region, {
    ...config,
    sessionId: sharedId
});
```

If the host needs to rotate the session at runtime (e.g., after sign-out), broadcast the new ID and call `pinSessionId(newId)` on every instance — including the leader.

```typescript
// Any context, after the host broadcasts a new ID
awsRum.pinSessionId(newId);
```

### Renewal policy

When `sessionId` is seeded at construction, the host takes exclusive ownership of the session ID for the life of the instance:

-   The SDK never auto-mints a session ID — not at construction, not on expiry, not on any future event path.
-   On expiry, only the expiry timestamp bumps; the ID never rotates.
-   `suppressSessionStartEvent` is forced to `true`, so no `session_start` is ever emitted by this instance.
-   The host is the sole source of truth for rotation; call `pinSessionId()` to rotate.

When `sessionId` is not seeded, the default renewal behavior applies: expiry mints a new UUID and emits `session_start` (subject to `suppressSessionStartEvent`).

### Caveats

-   `pinSessionId()` does **not** re-roll sampling. Each instance decides `record` at construction — by rolling `sessionSampleRate` afresh, or by restoring from a prior cookie if `allowCookies: true` and a cached session is present. The decision does not cross contexts. A follower whose session resolved to `record: false` drops its events at the cache; only the leader's events reach CloudWatch RUM under the shared ID. To guarantee that all followers record, set `sessionSampleRate: 1` (or coordinate sampling externally in the host).
-   Session replay (`RRWebPlugin` / the `replay` telemetry) is not cross-context aware — see the warning at the top of this section. As a secondary issue, plugins that snapshot `session.record` at enable time won't retroactively start recording when a session is adopted post-construction; pass `sessionId` at construction time rather than calling `pinSessionId()` later.
-   This feature is exposed only on the NPM API (`AwsRum` class). It is not wired into the CDN command queue.
-   **The SDK does not provide a transport between instances.** The host is responsible for broadcasting the leader's session ID to followers (and rotated IDs to every instance). Each transport — VS Code `postMessage`, Electron IPC, `BroadcastChannel`, sandboxed-iframe `postMessage`, micro-frontend event bus — is opinionated about message shape, lifecycle, and trust boundaries, so the SDK leaves the choice to the host. A built-in bridge could be a fast follow if a clear default emerges.
-   **No SDK-side session-change callback yet.** Followers learn about a new ID through the same host channel that delivered it — the SDK does not fire an `onSessionChange` event when `pinSessionId()` is called. If a follower needs to react locally (e.g., clear UI state tied to the old session), wire that off the host broadcast for now. An `onSessionChange(cb)` listener is a natural fast follow if the use case appears.
-   `pinSessionId('')` is rejected with a warn log; the existing ID is preserved. Pass a non-empty UUID or skip the call.

## Sharing a user ID across contexts

The same multi-context problem that motivates session sharing also fragments user identity: by default each instance mints (or restores from its own cookie) a separate `cwr_u` user ID, so a single human appears as N anonymous users in CloudWatch RUM. To pin user identity to match the shared session, broadcast the leader's user ID and seed it on followers — the same leader/follower pattern as session sharing.

1. The leader constructs the client normally and reads its user ID with `getUserId()`.
2. The host process broadcasts that ID to follower contexts (typically alongside the session ID — see [Sharing a session across contexts](#sharing-a-session-across-contexts)).
3. Each follower constructs the client with `userId` (the seeded ID).

```typescript
// Leader context
const leader = new AwsRum(appId, version, region, config);
const sharedSessionId = leader.getSessionId();
const sharedUserId = leader.getUserId();
// host.broadcast({ sessionId: sharedSessionId, userId: sharedUserId })

// Follower context
const follower = new AwsRum(appId, version, region, {
    ...config,
    sessionId: sharedSessionId,
    userId: sharedUserId
});
```

To rotate at runtime (e.g., after the host learns a more authoritative identity), broadcast the new ID and call `pinUserId(newId)` on every instance — including the leader.

```typescript
awsRum.pinUserId(newId);
```

### Caveats

-   No `user_start` event exists, so there is no suppression flag to set on followers — the seed is always silent.
-   Manual mode is sticky for the life of the instance: once a host has seeded `userId` or called `pinUserId()`, the SDK never falls back to the cookie or to a freshly-minted UUID for that instance, even if `allowCookies` is later flipped on or the cookie is cleared.
-   This feature is exposed only on the NPM API (`AwsRum` class). It is not wired into the CDN command queue.
-   **The SDK does not provide a transport between instances.** The same constraints described in the session-sharing caveats apply — broadcasting the user ID is the host's responsibility.
-   **No SDK-side user-change callback yet.** Followers learn about a new ID through the same host channel that delivered it.
