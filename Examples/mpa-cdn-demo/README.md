# MPA CDN Demo

A plain multi-page Hacker News reader that loads the CloudWatch RUM web client via the embedded CDN snippet. This is the MPA counterpart to [`spa-react-demo`](../spa-react-demo) — same HN content, same `/debug` error-generator page, but each route is a separate HTML document served by Express (no SPA routing, no bundler).

## What this exercises

-   The `<script>` CDN snippet pattern (not the NPM module)
-   Hard navigations across routes (`/top.html`, `/story.html?id=…`, `/user.html?id=…`, `/debug.html`) rather than SPA routing
-   The `cwr(...)` command queue — the story and debug pages call `cwr('recordEvent', …)` to emit custom events (`story_viewed`, `debug_custom_event`)
-   Session continuity across page loads via the shared `cwr_s` cookie
-   Uncaught errors captured by `JsErrorPlugin`
-   HN API calls captured by the fetch/http telemetry
-   Session replay via `RRWebPlugin` (enabled through the `replay` telemetry group)

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
| `/story.html?id=<id>` | `/story/:id` | Story detail with recursive threaded comments (depth/breadth expansion) |
| `/user.html?id=<id>` | `/user/:id` | User profile + first 30 submissions |
| `/debug.html` | `/debug` | Error generator with 8 JS error types + custom-event button |

## Ports

-   **`5220`** — this demo (Express, static HTML)
-   Depends on [`aws-rum-web-ui`](../aws-rum-web-ui) running on **`3000`** (data plane) and **`5200`** (UI)

## Quick start

```bash
# 1. In one terminal: start the local debug server + UI
cd Examples/aws-rum-web-ui && npm install && npm run dev

# 2. Build the CDN bundle (cwr.js) — REQUIRED. This demo's Express server
#    serves it at /cdn/cwr.js from packages/web/build/assets/cwr.js.
#    Skipping this step → 404 on /cdn/cwr.js and nothing loads.
#    Re-run whenever you change packages/web source.
cd ../../packages/web && npm run build

# 3. In another terminal: start the MPA
cd Examples/mpa-cdn-demo && npm install && npm run dev
```

Then open:

-   <http://localhost:5220/> — the demo
-   <http://localhost:5200/> — the RUM UI to inspect captured events

## Verify telemetry is flowing

Trigger some activity (click around, open `/debug.html` and generate an error), then:

-   Open <http://localhost:5200/> and filter by session — you should see page views, HTTP spans, JS errors, and replay segments.
-   Or tail the raw capture: `tail -f ../aws-rum-web-ui/server/api/events.jsonl`

## How it works

The Express server in [`server.js`](./server.js) does two things:

1. Serves `packages/web/build/assets/cwr.js` at `/cdn/cwr.js`, so the snippet can point at it (the 5th argument). In production this argument is the real CloudWatch RUM CDN URL.
2. Serves everything in [`public/`](./public) as static files.

Every HTML page is a thin wrapper that loads the same four shared assets (re-executed on each hard navigation):

-   [`public/rum-snippet.js`](./public/rum-snippet.js) — the embedded CDN snippet (the same one you'd paste into production HTML)
-   [`public/app.js`](./public/app.js) — shared page initializers (`initStoriesPage`, `initStoryPage`, `initUserPage`, `initDebugPage`) and HN rendering helpers
-   [`public/header.js`](./public/header.js) — renders the shared HN-style nav header and highlights the active link
-   [`public/styles.css`](./public/styles.css) — shared styles

## Tweaking the config

Edit the options object at the bottom of [`public/rum-snippet.js`](./public/rum-snippet.js) — since all pages load the same snippet file, a single edit affects every page. See [`docs/configuration.md`](../../docs/configuration.md) for the full list and [`docs/cdn_installation.md`](../../docs/cdn_installation.md) for the snippet reference.
