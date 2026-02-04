import { AwsRum, type AwsRumConfig } from 'aws-rum-web';

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        sessionEventLimit: 0,
        sessionLengthSeconds: 30,
        // endpoint: 'http://localhost:3000',
        identityPoolId: 'us-east-1:5dbe3029-b8b9-4cb3-b41c-d7730c5ccfd6',
        telemetries: [
            'errors',
            ['performance', { eventLimit: Number.MAX_SAFE_INTEGER }],
            ['http', { recordAllRequests: true }]
            // "sessionreplay",
        ],
        allowCookies: true,
        enableXRay: true,
        debug: true,
        signing: true
    };

    const APPLICATION_ID: string = 'e038dc30-5a71-400c-a79a-2450af52f07c';
    const APPLICATION_VERSION: string = '1.0.0';
    const APPLICATION_REGION: string = 'us-east-1';

    new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
} catch (error) {
    // Ignore errors thrown during CloudWatch RUM web client initialization
    console.error(error);
}
