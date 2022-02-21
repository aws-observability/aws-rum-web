# Using the CloudWatch RUM Web Client with React 17

## Add the snippet to index.html

To install the web client in a React application, add the snippet inside the \<head\> tag of `index.html`.

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

For React applications, we can use a [React Router
hook](https://reactrouter.com/web/api/Hooks/uselocation) to record a custom page
ID:

```typescript
import { useLocation } from "react-router-dom";

declare function cwr(operation: string, payload: any): void;

const Container = () => {

  let location = useLocation();
  React.useEffect(() => {
    console.log(location.pathname);
    cwr("recordPageView", location.pathname);
  }, [location]);

  return (
    <div>
      {<MyComponent />}
    </div>
  );
};

export default Container;
```


## Instrument Error Handling to Record Errors

React intercepts uncaught JavaScript errors that originate within the React
application. Because React intercepts these errors, they will not be recorded by
the web client. This can be fixed by adding [error
boundaries](https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html)
that record uncaught errors using the web client's `recordError` command:

```typescript
declare function cwr(operation: string, payload: any): void;

class App extends Component {
...
  componentDidCatch(error, info) {
    console.log(error);
    cwr('recordError', error);
  };
...
}
```
