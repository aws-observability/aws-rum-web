# Using the CloudWatch RUM Web Client with Vue 2

## Add the snippet to index.html

To install the web client in a Vue application, add the snippet inside the \<head\> tag of `index.html`.

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

## Instrument Error Handling to Record Errors

Vue has a [global error handler](https://v2.vuejs.org/v2/api/?#errorHandler) that intercepts any unhandled errors/exceptions.
They will not be recorded by the web client by default. This can be fixed by adding the web client's `recordError` command in Vue's error handler in your app's entrypoint (`main.ts`).

```typescript
declare function cwr(operation: string, payload: any): void;

Vue.config.errorHandler = (err: any) => {
  cwr('recordError', err);
};
```
