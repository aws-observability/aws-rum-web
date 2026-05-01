# SPA React Demo

A Single Page Application (SPA) built with React for locally debugging AWS RUM Web Client telemetry without any dependencies.

## Purpose

This example demonstrates RUM telemetry collection in a React SPA environment, featuring:

-   Client-side routing and navigation tracking
-   API calls and network monitoring
-   Error boundaries and error tracking
-   User interactions and performance metrics

## Quick Start

```bash
# 1. Build the local web client packages (REQUIRED — see "Prerequisite" below)
cd ../../packages/web && npm run build
cd ../../packages/slim && npm run build

# 2. Start this demo
cd ../../Examples/spa-react-demo && npm install && npm run dev
```

Open <http://localhost:5210> to view the app with RUM telemetry enabled. Depends on [`aws-rum-web-ui`](../aws-rum-web-ui) running (server on :3000, UI on :5200).

## Tech Stack

-   **React 19** + **TypeScript**
-   **Redux Toolkit** + **RTK Query** - State management & API caching
-   **React Router v6** - Client-side routing
-   **Tailwind CSS v4** - Styling
-   **Vite** - Build tool

## RUM Integration

The RUM client is configured in [`src/rum.ts`](./src/rum.ts) and initialized in [`src/main.tsx`](./src/main.tsx). Telemetry is sent to the local debug endpoint on `:3000` and can be inspected in the UI on `:5200`.

Captured out of the box:

-   Page views on every route change
-   HTTP requests (fetch) to the HN API
-   JS errors via `JsErrorPlugin` (test via `/debug`)
-   Web vitals and resource timings
-   Session replay via `RRWebPlugin` (text and input values are masked)

### Prerequisite: local web-client build

This example depends on the unbundled packages via `file:` paths in [`package.json`](./package.json):

```json
"@aws-rum/web-slim": "file:../../packages/slim",
"aws-rum-web": "file:../../packages/web"
```

Build those once before `npm install` here, and again any time you change their source:

```bash
cd ../../packages/web && npm run build
cd ../../packages/slim && npm run build
```

## Verify telemetry is flowing

Click around the app (or open `/debug` and generate an error), then:

-   Open <http://localhost:5200/> and filter by session.
-   Or tail the raw capture: `tail -f ../aws-rum-web-ui/server/api/events.jsonl`.

## Project layout

```text
src/
├── rum.ts                 # RUM client config + init
├── main.tsx               # React entry; imports rum.ts
├── store/index.ts         # Redux store configuration
├── routes/
│   ├── Home.tsx           # Story list page
│   └── Story.tsx          # Story detail with comments
├── features/
│   ├── stories/
│   │   ├── StoryList.tsx  # Virtualized story list
│   │   └── StoryCard.tsx  # Individual story card
│   └── comments/
│       ├── CommentTree.tsx
│       └── CommentNode.tsx
├── components/
│   ├── Layout.tsx         # App layout with navigation
│   └── ErrorBoundary.tsx  # Error handling
├── types/hn.ts            # TypeScript interfaces
└── utils/
    ├── constants.ts
    └── formatters.ts
```

## Routes

-   `/` - Redirects to `/top`
-   `/top` - Top stories
-   `/new` - New stories
-   `/best` - Best stories
-   `/ask` - Ask HN
-   `/show` - Show HN
-   `/job` - Job postings
-   `/story/:id` - Story detail with comments
-   `?page=N` - Pagination query param

## Comment Loading Strategy

-   **Initial Load**: Top 3 levels deep, 5 children per level
-   **"Show More" Button**: Load additional replies on demand
-   **Collapsible**: Click username or [−] to collapse threads
-   **Tree Visualization**: Border-left styling shows hierarchy

## Build

```bash
npm run build
npm run preview
```
