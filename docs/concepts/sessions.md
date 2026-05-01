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

## User identity

In addition to the session ID, the web client persists an anonymous **user ID** in the `cwr_u` cookie for `userIdRetentionDays` days (default 30). This lets CloudWatch RUM count returning visitors.

Set `userIdRetentionDays: 0` to disable the user cookie — the client will use the nil UUID (`00000000-0000-0000-0000-000000000000`) for all users.

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
