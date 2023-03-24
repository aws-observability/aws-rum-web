// @ts-nocheck
import { AwsRum, AwsRumConfig } from 'aws-rum-web';
let awsRum;

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        guestRoleArn: $GUEST_ARN,
        identityPoolId: $IDENTITY_POOL,
        endpoint: $ENDPOINT,
        telemetries: ['performance', 'errors', 'http', 'interaction'],
        allowCookies: true,
        enableXRay: true
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
