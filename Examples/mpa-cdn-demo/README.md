# MPA CDN Demo

A plain multi-page Hacker News reader that loads the CloudWatch RUM web client via the embedded CDN snippet. This is the MPA counterpart to [`spa-react-demo`](../spa-react-demo) — same HN content, same `/debug` error-generator page, but each route is a separate HTML document served by Express (no SPA routing, no bundler).

## What this exercises

-   The `<script>` CDN snippet pattern (not the NPM module)
-   Loads the **published 3.0.0 CDN bundle** from `https://client.rum.us-east-1.amazonaws.com/3.0.0/cwr.js` (full) or `.../cwr-slim.js` (slim)
-   Hard navigations across routes (`/top.html`, `/story.html?id=…`, `/user.html?id=…`, `/debug.html`) rather than SPA routing
-   The `cwr(...)` command queue — the story and debug pages call `cwr('recordEvent', …)` to emit custom events (`story_viewed`, `debug_custom_event`)
-   Session continuity across page loads via the shared `cwr_s` cookie
-   Uncaught errors captured by `JsErrorPlugin`
-   HN API calls captured by the fetch/http telemetry
-   Session replay via `RRWebPlugin` (enabled through the `replay` telemetry group, full scenario only)

## Scenarios

Pick one via `?scenario=<key>`:

| Scenario | Bundle | Notes |
| --- | --- | --- |
| `noauth-cdn-full` (default) | `cwr.js` | Guest Cognito, full client, replay enabled |
| `noauth-cdn-slim` | `cwr-slim.js` | Guest Cognito, slim client, no replay |
| `auth-cdn-full` | `cwr.js` | Built-in Cognito path uses guest creds only — auth is a misnomer in plain snippet mode |
| `auth-cdn-slim` | `cwr-slim.js` | Same caveat |

For true authenticated scenarios use [`spa-react-demo`](../spa-react-demo) which does BYO Cognito via the slim package.

## Pages

| Page | Mirrors SPA route | Purpose |
| --- | --- | --- |
| `/` (`index.html`) | — | Redirects to `/top.html` |
| `/top.html` | `/top` | Top stories, paginated (`?page=N`) with Top/New/Best sort dropdown |
| `/new.html` | `/new` | Newest stories |
| `/best.html` | `/best` | Best stories |
| `/ask.html` | `/ask` | Ask HN |
| `/show.html` | `/show` | Show HN |
| `/job.html` | `/job` | Jobs |
| `/story.html?id=<id>` | `/story/:id` | Story detail with recursive threaded comments |
| `/user.html?id=<id>` | `/user/:id` | User profile + first 30 submissions |
| `/debug.html` | `/debug` | Error generator with 8 JS error types + custom-event button |

## Ports

-   **`5220`** — this demo (Express, static HTML)

## Quick start

```bash
# 1. Deploy the shared CDK stack (first time) and generate config.local.js
cd ../infra && npm install && npm run deploy && npm run write-configs

# 2. Start the MPA
cd ../mpa-cdn-demo && npm install && npm run dev
```

Then open any of:

-   <http://localhost:5220/?scenario=noauth-cdn-full>
-   <http://localhost:5220/?scenario=noauth-cdn-slim>

Inspect telemetry in the CloudWatch RUM console for the corresponding app monitor (`rum-ex-3x-noauth-cdn-full`, etc.).

## How it works

Every HTML page loads two shared scripts in order:

1.  `/config.local.js` — sets `window.__RUM_CONFIG__` with the region, endpoint, and scenarios map (app monitor IDs + identity pool) populated by `write-configs.js`.
2.  [`public/rum-snippet.js`](./public/rum-snippet.js) — reads the scenario query param, picks `cwr.js` vs `cwr-slim.js`, and invokes the CDN loader.

[`server.js`](./server.js) just serves the `public/` tree. The CDN bundle itself comes from the real CloudWatch RUM CDN — no local mount.

See [`docs/configuration.md`](../../docs/configuration.md) for the full options list and [`docs/cdn_installation.md`](../../docs/cdn_installation.md) for the snippet reference.
