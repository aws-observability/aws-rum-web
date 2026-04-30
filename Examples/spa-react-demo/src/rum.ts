// Validation harness — exercise both install modes against the same AppMonitor.
//
// Select which one to run via ?rum=slim (default) or ?rum=full on any URL.
// - slim: @aws-rum/web-slim + BYO auth (Cognito creds + SigV4 factory)
// - full: aws-rum-web with built-in Cognito via identityPoolId config
const REGION = 'us-east-1';
const IDENTITY_POOL_ID = 'us-east-1:295d05fe-a1cb-4ea1-93e0-9c9a7b8460f0';
const APPLICATION_ID = 'c6850c37-b146-4409-b8a9-8d40182ccd4c';
const APPLICATION_VERSION = '1.0.0';
const ENDPOINT = `https://dataplane.rum.${REGION}.amazonaws.com`;

const mode = new URLSearchParams(window.location.search).get('rum') ?? 'slim';

async function initSlim() {
    const [
        {
            AwsRum,
            FetchPlugin,
            NavigationPlugin,
            ResourcePlugin,
            WebVitalsPlugin,
            JsErrorPlugin,
            RRWebPlugin
        },
        { fromCognitoIdentityPool },
        { createSigningConfig }
    ] = await Promise.all([
        import('@aws-rum/web-slim'),
        import('@aws-sdk/credential-providers'),
        import('@aws-rum/web-core')
    ]);

    // Slim has no `telemetries` config — load plugins explicitly. The XRay
    // header is configured directly on FetchPlugin.
    const awsRum = new AwsRum(APPLICATION_ID, APPLICATION_VERSION, REGION, {
        sessionSampleRate: 1,
        sessionEventLimit: 0,
        endpoint: ENDPOINT,
        allowCookies: true,
        enableXRay: true,
        debug: true,
        eventPluginsToLoad: [
            new FetchPlugin({
                recordAllRequests: true,
                addXRayTraceIdHeader: true
            }),
            new WebVitalsPlugin(),
            new ResourcePlugin(),
            new NavigationPlugin(),
            new JsErrorPlugin(),
            new RRWebPlugin()
        ]
    });

    // Slim requires BYO auth: supply the credential provider AND a signing
    // config factory. Slim does not bundle SigV4 — we pass our own.
    const provider = fromCognitoIdentityPool({
        identityPoolId: IDENTITY_POOL_ID,
        clientConfig: { region: REGION }
    });

    awsRum.setSigningConfigFactory(createSigningConfig);
    awsRum.setAwsCredentials(provider);
    console.info(
        '[rum-demo] initialized: @aws-rum/web-slim + BYO Cognito + SigV4'
    );
}

async function initFull() {
    const { AwsRum } = await import('aws-rum-web');

    new AwsRum(APPLICATION_ID, APPLICATION_VERSION, REGION, {
        sessionSampleRate: 1,
        sessionEventLimit: 0,
        identityPoolId: IDENTITY_POOL_ID,
        endpoint: ENDPOINT,
        allowCookies: true,
        enableXRay: true,
        debug: true,
        telemetries: [
            'errors',
            'performance',
            ['http', { addXRayTraceIdHeader: true }]
        ]
    });
    console.info(
        '[rum-demo] initialized: aws-rum-web (full) + built-in Cognito'
    );
}

(async () => {
    try {
        if (mode === 'full') {
            await initFull();
        } else {
            await initSlim();
        }
    } catch (error) {
        console.error(error);
    }
})();
