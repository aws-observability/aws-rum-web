# Troubleshooting CDN Installations

## Events are not being sent by the web client to CloudWatch RUM

### Session sample rate is less than one

If `sessionSampleRate` is less than `1`, events may or may not be emitted for a
given session. Try setting `sessionSampleRate: 1` in the web client
configuration.

### No AWS Credentials

The web client requires AWS credentials to sign RUM payloads. When the RUM web
client does not have AWS credentials, it will not attempt to send events to
CloudWatch RUM. Your application must either (1) provide the web client with an
anonymous Cognito identity using `identityPoolId` and `guestRoleArn`, or (2)
provide the web client with AWS credentials using the `cwr('setAwsCredentials',
credentials);` command.

---
## CloudWatch RUM returns 403

CloudWatch RUM's `PutRumEvents` API returns 403 when authentication or
authorization has failed. Since the web client has made the request, we know
that either (a) the Cognito and STS calls have succeeded, (b) the `cwr_c`
localStorage key contains AWS credentials, or (3) the application has forwarded
credentials to the web client using the `cwr('setAwsCredentials', credentials);`
command.

### Incorrect AWS region

Data must be sent to the same region as the CloudWatch RUM AppMonitor was
created. For example, if the AppMonitor was created in `us-east-1`, but the web
client is configured to send data to the endpoint
`'https://dataplane.rum.us-west-2.amazonaws.com'`, authentication will fail.
Verify that (1) the region argument is correct and (2) the `endpoint`
configuration option, if set, is correct.

### Credentials stored in localStorage are for a different AppMonitor

When anonymous authorization is used, the web client stores credentials in
localStorage. If multiple AppMonitors are used within the same domain,
authorization will fail when navigating between pages with different
AppMonitors.

### IAM role is not authorized to call PutRumEvents on AppMonitor

If a new AppMonitor is created and re-uses an existing Cognito Identity Pool and
IAM Role, the IAM Role will not automatically have permissions to call
PutRumEvents on the new AppMonitor. 

Verify the IAM role has the following permission:
 
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "rum:PutRumEvents",
            "Resource": "arn:aws:rum:[region]:[account]:appmonitor/[AppMonitor name]"
        }
    ]
}
```

Verify the IAM role has the following trust relationship:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "[cognito identity pool id]"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      }
    }
  ]
}
```
---

## Content security policy blocks the web client

If your web application uses a content security policy, it likely needs to be
amended to support the RUM web client. By default, a content security policy
blocks unsafe inline scripts such as the code snippet used to install the RUM
web client. You can use a hash or an nonce to allow the snippet. See [MDN Web
Docs: CSP:
script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#sources)
for more information.

The hash method is the recommended method for adding the RUM web client
installation snippet to the `script-src` directive. A complete CSP for the rum
web client will contain the following directives and values:

| Directive | Value |
| --- | --- |
| script-src | `'sha256-[snippet hash]'`<br/>`https://client.rum.us-east-1.amazonaws.com` |
| connect-src | `https://dataplane.rum.[region].amazonaws.com`<br/>`https://cognito-identity.[region].amazonaws.com`<br/>`https://sts.[region].amazonaws.com` |

A hash of the snippet can be generated from the command line using openssl:

```bash
SNIPPET='(function(n,i,v,r,s,c,u,x,z){x=window.AwsRumClient={q:[],n:n,i:i,v:v,r:r,c:c,u:u};window[n]=function(c,p){x.q.push({c:c,p:p});};z=document.createElement('script');z.async=true;z.src=s;document.head.insertBefore(z,document.getElementsByTagName('script')[0]);})('cwr','00000000-0000-0000-0000-000000000000','1.0.0','us-west-2','https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',{sessionSampleRate:1,guestRoleArn:'arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth',identityPoolId:'us-west-2:00000000-0000-0000-0000-000000000000',endpoint:'https://dataplane.rum.us-west-2.amazonaws.com',telemetries:['errors','http','performance'],allowCookies:true});'
echo $SNIPPET | openssl sha256 -binary | openssl base64
```

In this case, the output of this command is the following, however the output for your snippet will differ:
```
dhFqvDHwFpO34BJSlFlEdnhKI/jmMD2Yl50PvxjyLN0=
```
Place the hash in the `'sha256-[snippet hash]'` directive value above. In this
case, the directive will be `script-src
sha256-dhFqvDHwFpO34BJSlFlEdnhKI/jmMD2Yl50PvxjyLN0=`.

---
## X-Ray tracing does not connect client-side trace with server-side trace

To connect client-side and server-side traces, you must set the
`addXRayTraceIdHeader` to `true` in the `http` telemetry configuration. The web
client will then add the `X-Amzn-Trace-Id` header in each HTTP request. The
example below shows what this configuration looks like, with all other
configurations removed for readability.

> :warning: Enabling `addXRayTraceIdHeader` will cause a new header to be added
to all HTTP requests. Adding headers can modify CORS behavior, including causing
the request to fail. Adding headers after SigV4 signing will invalidate the
request signature, causing the request to fail. Test your application with this
header enabled before enabling this option in a production environment.

```html
<script>
    (function(n,i,v,r,s,c,u,x,z){...})(
        'cwr',
        '00000000-0000-0000-0000-000000000000',
        '1.0.0',
        'us-west-2',
        'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
        {
            enableXRay: true,
            telemetries: [ 
                [ 'http', { addXRayTraceIdHeader: true } ]
            ]
        }
    );
</script>
```