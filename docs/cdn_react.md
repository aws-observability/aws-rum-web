# React

Install and initialize per **[Getting started](./getting_started.md)** (both NPM and CDN work the same). This page covers the three React-specific integration points.

1. [Record custom page IDs on route changes](#record-custom-page-ids-on-route-changes)
2. [Forward errors caught by error boundaries](#forward-errors-caught-by-error-boundaries)
3. [Avoid double-init under `StrictMode`](#avoid-double-init-under-strictmode)

## Record custom page IDs on route changes

SPA routes often contain dynamic segments (`/user/123`, `/user/456`). To aggregate those into a single page in the RUM console, disable the default automation and record page IDs from your router.

Set `disableAutoPageView: true` in the config so the web client doesn't also record `history.pushState` events.

```typescript
import { useLocation } from 'react-router-dom';
import { awsRum } from './rum'; // NPM — the module you created in Getting started

const Container = () => {
    const location = useLocation();
    useEffect(() => {
        awsRum.recordPageView(location.pathname);
    }, [location]);

    return <MyComponent />;
};
```

CDN equivalent: `cwr('recordPageView', location.pathname)`.

## Forward errors caught by error boundaries

React catches errors thrown during render and they never reach `window.onerror`, so `JsErrorPlugin` can't see them. Use an [error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) to forward them:

```typescript
import { awsRum } from './rum';

class ErrorBoundary extends React.Component {
    componentDidCatch(error: Error) {
        awsRum.recordError(error);
    }
    // ...render fallback
}
```

CDN equivalent: `cwr('recordError', error)`.

## Avoid double-init under `StrictMode`

`<React.StrictMode>` intentionally runs side effects twice in development. If you initialize RUM inside a component effect, you'll get two instances. Keep the init in a module-scope file (e.g. `src/rum.ts`) that runs exactly once per document load — not inside a `useEffect`.

## See also

-   [`Examples/spa-react-demo`](../Examples/spa-react-demo) — runnable React + RUM demo.
-   [API reference](./reference/api.md)
-   [Configuration](./configuration.md)
