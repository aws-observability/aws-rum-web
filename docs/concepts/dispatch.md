# Dispatch and batching

The web client holds events in an in-memory cache and ships them to CloudWatch RUM in batches.

## Batching

| Option | Default | Purpose |
| --- | --- | --- |
| `dispatchInterval` | `5000` ms | How often the timer fires to flush. |
| `batchLimit` | `100` | Max events sent per `PutRumEvents` request. |
| `eventCacheSize` | `1000` | Max events buffered before new events are dropped. |
| `retries` | `2` | Fetch retry count on transport failures. |

On every tick, if the cache is non-empty, the client takes up to `batchLimit` events and POSTs them to `PutRumEvents`. Remaining events wait for the next tick.

## Flush on page hide

When the page is hidden (`visibilitychange` → `hidden` or `pagehide`), the client synchronously flushes the cache. The transport used depends on `useBeacon`:

| `useBeacon`      | On page hide                                     |
| ---------------- | ------------------------------------------------ |
| `true` (default) | Try `navigator.sendBeacon`, fall back to `fetch` |
| `false`          | Try `fetch`, fall back to `sendBeacon`           |

`sendBeacon` is the safer default because browsers guarantee delivery even after the page is gone, but it cannot sign requests with custom headers. If you use custom `headers`, set `useBeacon: false`.

You can also flush manually:

```typescript
awsRum.dispatch(); // uses fetch
awsRum.dispatchBeacon(); // uses sendBeacon, falls back to fetch on failure
```

## Compression

When `compressionStrategy.enabled` is `true` (the default), payloads larger than ~2KB are gzipped before sending. Compression is only used if it achieves ≥20% reduction; otherwise the raw payload is sent. Compressed requests include `Content-Encoding: gzip`. RUM JSON typically compresses 60–80%.

## Error handling

-   **Network failures**: retried up to `retries` times via `RetryHttpHandler`.
-   **403 Forbidden**: credentials cleared from `localStorage.cwr_c`, client rebuilt, request retried once. A second 403 disables the client.
-   **404 Not Found**: disables the client (usually means wrong endpoint/region).
-   **Other 4xx/5xx**: the batch is dropped; the client continues.

## Custom transport

Provide `fetchFunction` to override the global `fetch` (useful for tests). For more advanced cases — custom signing, a different AWS SDK client — provide `clientBuilder` to build your own `DataPlaneClient`.
