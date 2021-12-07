# Using the CloudWatch RUM Web Client with Angular 12 

## Add the snippet to index.html

To install the web client in an Angular application, add the snippet inside the \<head\> tag of `index.html`.

```html
<!doctype html>
<html lang="en">
<head>
  <script>
    (function(n,i,v,r,s,c,u,x,z){x=window.AwsRumClient={q:[],n:n,i:i,v:v,r:r,c:c,u:u};window[n]=function(c,p){x.q.push({c:c,p:p});};z=document.createElement('script');z.async=true;z.src=s;document.head.insertBefore(z,document.getElementsByTagName('script')[0]);})('cwr','00000000-0000-0000-0000-000000000000','1.0.0','us-west-2','https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',{sessionSampleRate:1,guestRoleArn:'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-0000000000000-Unauth',identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',telemetries:['errors','http','performance'],allowCookies:true});
  </script>
  ...
</head>
<body>
  ...
</body>
```

## Instrument Routing to Record Page Views

If your application contains arguments in the URL's path, you likely want to
record custom page IDs so that the arguments can be removed and the pages will
be properly aggregated in CloudWatch. For example, if we have two URLs
`https://amazonaws.com/user/123` and `https://amazonaws.com/user/456`, we likely
want to remove the user ID from the path so that the page ID is `/user` for both
URLs.

For Angular applications, we can subscribe to the `NavigationEnd` event, and
record a custom page ID using the URL provided by the router:

```typescript
import { Router, NavigationEnd } from '@angular/router';

declare function cwr(operation: string, payload: any): void;

export class MyComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('this.router.url');
        cwr('recordPageView', this.router.url);
      }
    });
  }

}
```


## Instrument Error Handling to Record Errors

Angular intercepts uncaught JavaScript errors that originate within the
Angular application. Because Angular intercepts these errors, they will not be
recorded by the web client. This can be fixed by creating an error handler that
records uncaught errors using the web client's `recordError` command:

### 1. Create an error handler

`src/app/cwr-error-handler.ts`
```typescript
import { ErrorHandler } from "@angular/core";

declare function cwr(operation: string, payload: any): void;

export class CwrErrorHandler implements ErrorHandler {
  handleError(error: any) {
    cwr('recordError', error);
  }
}
```

### 2. Install the error handler in the root module:

`src/app/app.module.ts`
```typescript
import { RumErrorHandler } from './cwr-error-handler';

@NgModule({
  imports: [
      ...
  ],
  declarations: [
      ...
  ],
  bootstrap: [
      ...
  ],
  providers: [
    {
      provide: ErrorHandler,
      useClass: CwrErrorHandler
    }
  ]
})
export class AppModule { }

```