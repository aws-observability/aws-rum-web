# SPA React Demo

A production-quality Single Page Application (SPA) built with React for testing AWS RUM Web Client.

## Features

-   ✅ All HN story types (Top, New, Best, Ask, Show, Jobs)
-   ✅ Infinite scroll with virtualization
-   ✅ Nested comment threads with tree visualization
-   ✅ Client-side routing with deep links
-   ✅ Pagination with URL state
-   ✅ Responsive design
-   ✅ Error boundaries
-   ✅ Loading states with skeletons

## Tech Stack

-   **React 19** + **TypeScript**
-   **Redux Toolkit** + **RTK Query** - State management & API caching
-   **React Router v6** - Client-side routing
-   **Tailwind CSS v4** - Styling
-   **React Virtuoso** - Virtual scrolling
-   **Lucide React** - Icons
-   **Vite** - Build tool

## Architecture

```
src/
├── api/hn.ts              # RTK Query API definitions
├── store/index.ts         # Redux store configuration
├── routes/
│   ├── Home.tsx           # Story list page
│   └── Story.tsx          # Story detail with comments
├── features/
│   ├── stories/
│   │   ├── StoryList.tsx  # Virtualized story list
│   │   └── StoryCard.tsx  # Individual story card
│   └── comments/
│       ├── CommentTree.tsx # Comment tree container
│       └── CommentNode.tsx # Recursive comment node
├── components/
│   ├── Layout.tsx         # App layout with navigation
│   └── ErrorBoundary.tsx  # Error handling
├── types/hn.ts            # TypeScript interfaces
└── utils/
    ├── constants.ts       # App constants
    └── formatters.ts      # Utility functions
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

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Production Patterns

1. **API Caching**: RTK Query caches all API responses with automatic invalidation
2. **Request Deduplication**: Multiple components requesting same data = single API call
3. **Virtual Scrolling**: Only renders visible items for performance
4. **Code Splitting**: Routes are lazy-loaded (can be added)
5. **Error Boundaries**: Graceful error handling at route level
6. **Loading States**: Skeleton screens during data fetching
7. **Deep Linking**: All state in URL for shareability

## RUM Integration Points

Ready for AWS RUM integration:

-   Page view tracking on route changes
-   Custom events for story/comment clicks
-   Error tracking for API failures
-   Performance monitoring for list rendering
-   Session replay for user interactions
