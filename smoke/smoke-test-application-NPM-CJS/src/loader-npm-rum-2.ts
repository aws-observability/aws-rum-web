// @ts-nocheck
const { AwsRum, AwsRumConfig } = require('aws-rum-web');

let awsRum;

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        identityPoolId: $IDENTITY_POOL_2,
        endpoint: $ENDPOINT,
        telemetries: ['performance', 'errors', 'http', 'interaction'],
        allowCookies: true,
        enableXRay: true,
        cookieAttributes: {
            unique: true
        },
        useBeacon: false
    };

    const APPLICATION_ID: string = $MONITOR_ID_2;
    const APPLICATION_VERSION: string = '1.0.0';
    const APPLICATION_REGION: string = $REGION;

    awsRum: AwsRum = new AwsRum(
        APPLICATION_ID,
        APPLICATION_VERSION,
        APPLICATION_REGION,
        config
    );
} catch (error) {
    console.log(error);
    throw error;
}
