// @ts-nocheck
const { AwsRum, AwsRumConfig } = require('aws-rum-web');

let awsRum;
const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        identityPoolId: $IDENTITY_POOL,
        endpoint: $ENDPOINT,
        telemetries: ['performance', 'errors', 'http', 'interaction'],
        allowCookies: true,
        enableXRay: true,
        cookieAttributes: {
            unique: true
        },
        headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': 'a1b2c3d4e5f6',
            'content-type': 'application/json'
        },
        useBeacon: false
    };

    const APPLICATION_ID: string = $MONITOR_ID;
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
