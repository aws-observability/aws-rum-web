# Installing as a JavaScript Module

The CloudWatch RUM web client can be built into the application's JavaScript
bundle using the provided CommonJS or ES modules. The recommended method to
consume and manage the web client dependency is to use the web client's [NPM
package](https://www.npmjs.com/package/aws-rum-web).

## Install the package from NPM

```bash
npm install --save aws-rum-web
```

## Instrument the application

The following code shows an example of how to instrument an application. This code should run as early as possible in the application's lifecycle.

```typescript
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

try {
  const config: AwsRumConfig = {
    allowCookies: true,
    endpoint: "https://dataplane.rum.us-west-2.amazonaws.com",
    guestRoleArn: "arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth",
    identityPoolId: "us-west-2:00000000-0000-0000-0000-000000000000",
    sessionSampleRate: 1,
    telemetries: ['errors', 'performance']
  };

  const APPLICATION_ID: string = '00000000-0000-0000-0000-000000000000';
  const APPLICATION_VERSION: string = '1.0.0';
  const APPLICATION_REGION: string = 'us-west-2';

  const awsRum: AwsRum = new AwsRum(
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    config
  );
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
}
```

Modify the `AwsRum` constructor arguments to match your AppMonitor. See [Arguments](#arguments) for details.

Modify the `config` object to configure how the web client should behave. For
example, you should minimally configure (1) how the data will be authenticated,
and (2) what aspects of the application will be monitored. See
[Configuration](#configuration) for details.

## Arguments

| Argument&nbsp;Name | Type | Description |
| --- | --- | --- |
| AppMonitor ID | String | A globally unique identifier for the CloudWatch RUM AppMonitor which monitors your application. |
| Application Version | String | The application's semantic version. If you do not wish to use this field then add any placeholder, such as `'0.0.0'`. |
| Region | String | The AWS region of the AppMonitor. For example, `'us-east-1'` or '`eu-west-2'`. |
| Configuration | [Configuration](#configuration) | The application-specific configuration for the web client. |

## Configuration

The application-specific web client configuration is a JavaScript object whose fields are all optional. While these fields are optional, depending on your application the web client may not function properly if certain fields are omitted. For example, `identityPoolId` and `guestRoleArn` are both required unless your application performs its own AWS authentication and passes the credentials to the web client using the command `awsRum.setAwsCredentials({...});`.

To get started, we recommend using the following configuration. The
`guestRoleArn` and `identityPoolId` shown are dummy values. Modify these to
match the resources created when setting up the AppMonitor:

```typescript
const config: AwsRumConfig = {
    allowCookies: true,
    endpoint: "https://dataplane.rum.us-west-2.amazonaws.com",
    guestRoleArn: "arn:aws:iam::000000000000:role/RUM-Monitor-us-west-2-000000000000-00xx-Unauth",
    identityPoolId: "us-west-2:00000000-0000-0000-0000-000000000000",
    sessionSampleRate: 1,
    telemetries: ['errors', 'performance']
};
```

For a complete list of configuration options, see [Application-specific Configurations](configuration.md).
