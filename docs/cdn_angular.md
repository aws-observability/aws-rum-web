# Angular

Install and initialize per **[Getting started](./getting_started.md)** (both NPM and CDN work the same). This page covers the three Angular-specific integration points.

For NPM installs, wrap the client in an injectable service so it can be reused across components:

```typescript
// src/app/rum.service.ts
import { Injectable } from '@angular/core';
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

@Injectable({ providedIn: 'root' })
export class RumService {
    readonly awsRum: AwsRum | undefined;

    constructor() {
        try {
            const config: AwsRumConfig = {
                sessionSampleRate: 1,
                identityPoolId:
                    'us-west-2:00000000-0000-0000-0000-000000000000',
                endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
                telemetries: ['errors', 'performance', 'http', 'replay'],
                allowCookies: true
            };
            this.awsRum = new AwsRum(
                '00000000-0000-0000-0000-000000000000',
                '1.0.0',
                'us-west-2',
                config
            );
        } catch (error) {
            // ignore — don't let RUM init crash the app
        }
    }
}
```

## Record custom page IDs on route changes

SPA routes often contain dynamic segments (`/user/123`, `/user/456`). Subscribe to `NavigationEnd` and record page IDs yourself so the RUM console can aggregate them.

Set `disableAutoPageView: true` in the config so the web client doesn't also record `history.pushState` events.

```typescript
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RumService } from './rum.service';

@Component({
    /* ... */
})
export class AppComponent implements OnInit {
    constructor(private router: Router, private rum: RumService) {}

    ngOnInit(): void {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.rum.awsRum?.recordPageView(this.router.url);
            }
        });
    }
}
```

CDN equivalent: replace `this.rum.awsRum?.recordPageView(...)` with `cwr('recordPageView', this.router.url)`.

## Forward errors caught by Angular

Angular intercepts uncaught errors thrown from components and they never reach `window.onerror`, so `JsErrorPlugin` can't see them. Install a custom `ErrorHandler`:

```typescript
// src/app/rum-error-handler.ts
import { ErrorHandler, Injectable } from '@angular/core';
import { RumService } from './rum.service';

@Injectable()
export class RumErrorHandler implements ErrorHandler {
    constructor(private rum: RumService) {}

    handleError(error: any): void {
        this.rum.awsRum?.recordError(error);
    }
}
```

Register it in the root module:

```typescript
import { ErrorHandler, NgModule } from '@angular/core';
import { RumErrorHandler } from './rum-error-handler';

@NgModule({
    providers: [{ provide: ErrorHandler, useClass: RumErrorHandler }]
})
export class AppModule {}
```

CDN equivalent: replace `this.rum.awsRum?.recordError(error)` with `cwr('recordError', error)`.

## See also

-   [API reference](./reference/api.md)
-   [Configuration](./configuration.md)
