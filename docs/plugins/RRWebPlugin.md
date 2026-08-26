# RRWebPlugin (Session Replay)

> **Status: GA.** RRWebPlugin ships in `aws-rum-web` 3.0 and is enabled by default via the `replay` telemetry group. Privacy masking is enforced and cannot be disabled — review the guarantees below before enabling in production.

Records DOM snapshots and user interactions using [rrweb](https://github.com/rrweb-io/rrweb) so sessions can be replayed in the CloudWatch RUM console. Emits events of type `com.amazon.rum.rrweb_event`.

## Privacy (enforced by default)

The plugin **enforces** the following rrweb options by default and does not allow them to be overridden through `recordOptions`:

| Option             | Value       | Effect                              |
| ------------------ | ----------- | ----------------------------------- |
| `maskAllInputs`    | `true`      | All `<input>` values are masked.    |
| `maskTextSelector` | `'*'`       | All text content is masked.         |
| `maskInputOptions` | `undefined` | Ignored when `maskAllInputs: true`. |

In other words, out of the box the replay will **not** record the text or input content of your page.

### Opt-in: selective masking

Some applications need to retain non-sensitive UI context in replays (e.g. button labels, dashboard headings) while still masking PII fields. For these cases the plugin offers an opt-in `selectiveMaskingAttribute` configuration. When set, **only** elements that carry the configured attribute are masked; everything else is recorded in clear text.

> ⚠️ Turning selective masking on relaxes the default. Review the masking attribute coverage of your DOM with your privacy/legal owner before enabling in production. Even when this option is set, `maskAllInputs` / `maskTextSelector` / `maskInputOptions` / `maskInputFn` cannot be supplied via `recordOptions` — those values are derived from `selectiveMaskingAttribute`.

```typescript
import { RRWebPlugin } from 'aws-rum-web';

const rrweb = new RRWebPlugin({
    // Mask any element carrying [data-rum-mask]; record the rest as text.
    selectiveMaskingAttribute: 'data-rum-mask'
});
```

```html
<!-- masked in replay -->
<input type="email" data-rum-mask />
<p data-rum-mask>SSN: 123-45-6789</p>

<!-- recorded as text -->
<input type="text" placeholder="Search" />
<button>Submit</button>
<h1>Dashboard</h1>
```

## Default behavior

Because `aws-rum-web` enables the `replay` telemetry by default, session replay is recorded for all sampled sessions unless you explicitly disable it:

```javascript
{
    telemetries: ['errors', 'performance', 'http']; // omit 'replay'
}
```

## Configuration

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `additionalSampleRate` | Number (0–1) | `1.0` | Extra sampling applied **on top of** `sessionSampleRate`. Use this to record replays for only a fraction of already-sampled sessions. |
| `batchSize` | Number | `50` | Buffer this many rrweb events before flushing a batch. |
| `flushInterval` | Number (ms) | `5000` | Timer-based flush interval for buffered events. |
| `recordOptions` | Object | See below | Options forwarded to `rrweb.record()`. Privacy fields are managed by the plugin and cannot be overridden. |
| `selectiveMaskingAttribute` | String | _unset_ | Opt-in. When set, only DOM elements carrying this attribute are masked; everything else is recorded in clear text. See [Opt-in: selective masking](#opt-in-selective-masking). |

Production `recordOptions` defaults:

```typescript
{
    slimDOMOptions: 'all',
    inlineStylesheet: true,
    inlineImages: false,           // bandwidth
    collectFonts: true,
    recordCrossOriginIframes: false
}
```

## Example — tune replay sampling

```typescript
import { AwsRum, AwsRumConfig, RRWebPlugin } from 'aws-rum-web';

const rrweb = new RRWebPlugin({
    additionalSampleRate: 0.1, // replay 10% of sampled sessions
    batchSize: 25,
    flushInterval: 3000
});

const config: AwsRumConfig = {
    telemetries: ['errors', 'performance', 'http'], // disable default replay
    eventPluginsToLoad: [rrweb]
};
```

## Lifecycle

1. `enable()` — starts recording if the session is sampled by both `sessionSampleRate` and `additionalSampleRate`.
2. Events are flushed on `batchSize`, `flushInterval`, or page unload.
3. `disable()` stops recording and flushes the remaining buffer.

## Emitted events

-   `com.amazon.rum.rrweb_event` — a batch of rrweb records.

## Notes

-   The plugin imports from `@rrweb/record`, not `rrweb`, to avoid a known package.json issue in `rrweb@2.0.0-alpha.4` that breaks CJS/ESM consumer bundlers.
-   Replay events contribute to the per-session event limit (`sessionEventLimit`). A high replay volume combined with a low limit will drop events.
