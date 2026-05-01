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
# 1. Deploy the shared CDK stack (first time) and generate config.local.js
cd ../infra && npm install && npm run deploy && npm run write-configs

# 2. Start this demo
cd ../spa-react-demo && npm install && npm run dev
```

Then open one of the scenarios:

-   <http://localhost:5210/?scenario=noauth-npm-full>
-   <http://localhost:5210/?scenario=noauth-npm-slim>
-   <http://localhost:5210/?scenario=auth-npm-slim> (requires a Cognito user — see "Auth scenarios" below)
-   <http://localhost:5210/?scenario=auth-npm-full>

Inspect telemetry in the CloudWatch RUM console for the corresponding app monitor (`rum-ex-3x-noauth-npm-full`, etc.).

## Dependencies

Uses the **published 3.0.0** RUM packages from npm:

```json
"aws-rum-web": "^3.0.0",
"@aws-rum/web-core": "^3.0.0",
"@aws-rum/web-slim": "^3.0.0"
```

## Auth scenarios

Auth scenarios pick up a Cognito login token before handing credentials to the identity pool. Set credentials via the browser console before reloading an `auth-*` page:

```js
localStorage.setItem('rumExUsername', 'testuser');
localStorage.setItem('rumExPassword', '<password>');
```

The `RumExamples3xStack` creates the user pool + client but does not provision users. Create one via the Cognito console (or `aws cognito-idp admin-create-user`) and confirm it.

**Note on `auth-npm-full`**: the `aws-rum-web` full package's built-in Cognito integration always uses guest credentials. The demo emits a console warning in that case. For true authenticated, use `auth-npm-slim` (BYO Cognito).

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

## Verify telemetry is flowing

Click around the app (or open `/debug` and generate an error), then open the CloudWatch RUM console in the deploying account and inspect the relevant app monitor's events.

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
