# Installing as an Embedded Script

The CloudWatch RUM web client can be dynamically loaded into the application
using a code snippet. The code snippet is a self-executing function created by
the CloudWatch RUM console. The snippet (1) asynchronously downloads the web
client from a content delivery network (CDN) or the application server and (2)
configures the web client for the application it is monitoring.

## Generate a code snippet

Use the CloudWatch RUM console to generate a code snippet. See the [CloudWatch
RUM documentation
](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)
for instructions on how to create an AppMonitor and generate a code snippet.

The snippet will look similar to the following:

```html
<script>
(function(n,i,v,r,s,c,u,x,z){x=window.AwsRumClient={q:[],n:n,i:i,v:v,r:r,c:c,u:u};window[n]=function(c,p){x.q.push({c:c,p:p});};z=document.createElement('script');z.async=true;z.src=s;document.head.insertBefore(z,document.getElementsByTagName('script')[0]);})('cwr','00000000-0000-0000-0000-000000000000','1.0.0','us-west-2','https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',{sessionSampleRate:1,guestRoleArn:'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth',identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',telemetries:['errors','http','performance'],allowCookies:true});
</script>
```

## Instrument the application

Copy the code snippet into the `<head>` tag of each HTML file in the web
application.

Modify the arguments to match your AppMonitor. See [Arguments](#arguments) for details.

> **:warning: Ad blockers may block the default CDN**
>
> For convenience, AWS distributes a copy of the CloudWatch RUM web client
through a content delivery network (CDN). The generated code snippet uses this
CDN by default. However, ad blockers may block this CDN's domain. This disables
application monitoring for users with ad blockers.
>
> To mitigate this we recommend one of the following:
> 1. Have the web application host the CloudWatch RUM web client:<br/>
>    a) Copy [`cwr.js`](https://client.rum.us-east-1.amazonaws.com/1.x/cwr.js) to the assets directory of the web application<br/>
>    b) Modify the code snippet to use the copy of `cwr.js` from (a).
> 2. Install the CloudWatch RUM web client as a [JavaScript module](https://www.npmjs.com/package/aws-rum-web).

Modify the `config` object to configure how the web client should behave. At a
minimum, configure the following: (1) how the data will be authenticated, and
(2) what aspects of the application will be monitored. See
[Application-specific Configurations](configuration.md) for details.

## Arguments

The code snippet accepts six arguments. The snippet below shows these arguments with the body of the snippet's function omitted for readability:
```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
        { /* configuration */ }
    );
</script>
```

| Position | Argument&nbsp;Name | Type | Description |
| --- | --- | --- | --- |
| 1 | Namespace | String | The name of the global variable that the application will use to execute commands on the web client. This will typically be `'cwr'`. |
| 2 | AppMonitor ID | String | A globally unique identifier for the CloudWatch RUM AppMonitor which monitors your application. |
| 3 | Application Version | String | Your application's semantic version. If you do not wish to use this field then add any placeholder, such as `'0.0.0'`. |
| 4 | Region | String |  The AWS region of the AppMonitor. For example, `'us-east-1'` or '`eu-west-2'`. |
| 5 | Web Client URL | String |  The URL of the web client bundle. For example, `'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js'`|
| 6 | Configuration | [Configuration](configuration.md) | An application-specific configuration for the web client. |

## Configuring the CloudWatch RUM web client

The application-specific web client configuration is a JavaScript object whose fields are all optional. While these fields are optional, depending on your application the web client may not function properly if certain fields are omitted. For example, `identityPoolId` and `guestRoleArn` are both required unless your application performs its own AWS authentication and passes the credentials to the web client using the command `cwr('setAwsCredentials', {...});`.

The snippet below shows several configuration options with the body of the snippet's function omitted for readability:
```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
        {
            sessionSampleRate:1,
            guestRoleArn:'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth',
            identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',
            endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',
            telemetries:['errors','http','performance'],
            allowCookies:true
        }
    );
</script>
```

For a complete list of configuration options, see [Application-specific Configurations](configuration.md).
