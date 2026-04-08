import {
    AwsRum,
    type AwsRumConfig,
    FetchPlugin,
    NavigationPlugin,
    ResourcePlugin,
    WebVitalsPlugin,
    JsErrorPlugin,
    RRWebPlugin
} from '@aws-rum/web-slim';

try {
    const config: AwsRumConfig = {
        sessionSampleRate: 1,
        sessionEventLimit: 0,
        sessionLengthSeconds: 30,
        endpoint: 'http://localhost:3000',
        allowCookies: true,
        enableXRay: false,
        debug: true,
        signing: false,
        compressionStrategy: { enabled: true },
        eventPluginsToLoad: [
            new FetchPlugin({
                recordAllRequests: true
            }),
            new WebVitalsPlugin(),
            new ResourcePlugin(),
            new NavigationPlugin(),
            new JsErrorPlugin(),
            new RRWebPlugin()
        ]
    };

    const APPLICATION_ID: string = '93755407-009b-4396-9280-0104beb732a9';
    const APPLICATION_VERSION: string = '1.0.0';
    const APPLICATION_REGION: string = 'us-east-1';

    new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
} catch (error) {
    // Ignore errors thrown during CloudWatch RUM web client initialization
    console.error(error);
}
