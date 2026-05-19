# CDN commands

The CDN command queue (`cwr(...)`) and the NPM `AwsRum` methods share a single reference page.

**→ See [API reference](./reference/api.md)** for every command with NPM and CDN call signatures side by side, plus the [PageView](./reference/api.md#pageview) and [Event](./reference/api.md#event) schemas.

Quick link:

```html
<script>
    cwr('recordPageView', '/home');
    cwr('recordError', e);
    cwr('recordEvent', { type: 'my_event', data: { k: 'v' } });
    cwr('recordEvent', {
        type: 'my_event',
        data: { k: 'v' },
        metadata: { tier: 'beta' }
    });
    cwr('addSessionAttributes', { appVersion: '1.2.3' });
    cwr('clearEventMetadataHook');
    cwr('pinSessionId', 'shared-uuid');
    cwr('pinUserId', 'shared-uuid');
    cwr('startSession');
    cwr('startSession', { sessionId: 'shared-uuid' });
</script>
```
