// Scenario-driven RUM init for the 8-cell matrix:
//   (auth | noauth) x (npm) x (full | slim)
// The CDN matrix lives in Examples/mpa-cdn-demo.
//
// Select via ?scenario=<key> (default: noauth-npm-slim).
//   - *-full    -> aws-rum-web (full) with built-in Cognito guest auth.
//   - *-slim    -> @aws-rum/web-slim + BYO Cognito + @aws-rum/web-core SigV4.
//   - auth-*    -> pre-authenticate against a Cognito User Pool using
//                  localStorage.rumExUsername / rumExPassword, then hand the
//                  Cognito JWT to fromCognitoIdentityPool's `logins` map.
//                  Only meaningful on slim; full's built-in Cognito always
//                  uses guest creds.

type ScenarioConfig = {
    appMonitorId: string;
    identityPoolId: string;
    userPoolId?: string;
    userPoolClientId?: string;
};

type RumConfig = {
    region: string;
    endpoint: string;
    scenarios: Record<string, ScenarioConfig>;
};

declare global {
    interface Window {
        __RUM_CONFIG__?: RumConfig;
    }
}

function getScenario(): {
    key: string;
    scenario: ScenarioConfig;
    region: string;
    endpoint: string;
} {
    const cfg = window.__RUM_CONFIG__;
    if (!cfg) {
        throw new Error(
            '[rum-demo] window.__RUM_CONFIG__ not set. Run Examples/infra/scripts/write-configs.js.'
        );
    }
    const key =
        new URLSearchParams(window.location.search).get('scenario') ??
        'noauth-npm-slim';
    const scenario = cfg.scenarios[key];
    if (!scenario) {
        throw new Error(
            `[rum-demo] unknown scenario "${key}". Available: ${Object.keys(
                cfg.scenarios
            ).join(', ')}`
        );
    }
    return { key, scenario, region: cfg.region, endpoint: cfg.endpoint };
}

async function loginCognitoUser(
    region: string,
    userPoolId: string,
    userPoolClientId: string
): Promise<{ logins: Record<string, string> }> {
    const username = localStorage.getItem('rumExUsername');
    const password = localStorage.getItem('rumExPassword');
    if (!username || !password) {
        throw new Error(
            '[rum-demo] auth-* scenario requires localStorage.rumExUsername / rumExPassword. See README.'
        );
    }
    const { CognitoIdentityProviderClient, InitiateAuthCommand } = await import(
        '@aws-sdk/client-cognito-identity-provider'
    );
    const client = new CognitoIdentityProviderClient({ region });
    const res = await client.send(
        new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: userPoolClientId,
            AuthParameters: { USERNAME: username, PASSWORD: password }
        })
    );
    const idToken = res.AuthenticationResult?.IdToken;
    if (!idToken) {
        throw new Error(
            '[rum-demo] Cognito InitiateAuth succeeded but no IdToken returned.'
        );
    }
    return {
        logins: {
            [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
        }
    };
}

async function initSlim(
    key: string,
    scenario: ScenarioConfig,
    region: string,
    endpoint: string
) {
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

    const awsRum = new AwsRum(scenario.appMonitorId, '1.0.0', region, {
        sessionSampleRate: 1,
        sessionEventLimit: 0,
        endpoint,
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

    const providerOpts: {
        identityPoolId: string;
        clientConfig: { region: string };
        logins?: Record<string, string>;
    } = {
        identityPoolId: scenario.identityPoolId,
        clientConfig: { region }
    };

    if (key.startsWith('auth-')) {
        if (!scenario.userPoolId || !scenario.userPoolClientId) {
            throw new Error(
                `[rum-demo] scenario ${key} missing userPoolId/userPoolClientId in config.`
            );
        }
        const { logins } = await loginCognitoUser(
            region,
            scenario.userPoolId,
            scenario.userPoolClientId
        );
        providerOpts.logins = logins;
    }

    const provider = fromCognitoIdentityPool(providerOpts);

    awsRum.setSigningConfigFactory(createSigningConfig);
    awsRum.setAwsCredentials(provider);
    console.info(
        `[rum-demo] initialized slim: ${key} -> ${scenario.appMonitorId}`
    );
}

async function initFull(
    key: string,
    scenario: ScenarioConfig,
    region: string,
    endpoint: string
) {
    const { AwsRum } = await import('aws-rum-web');

    if (key.startsWith('auth-')) {
        console.warn(
            '[rum-demo] full build uses built-in Cognito with guest creds only — auth-*-full will behave as noauth-*-full. Use auth-*-slim for true authenticated Cognito.'
        );
    }

    new AwsRum(scenario.appMonitorId, '1.0.0', region, {
        sessionSampleRate: 1,
        sessionEventLimit: 0,
        identityPoolId: scenario.identityPoolId,
        endpoint,
        allowCookies: true,
        enableXRay: true,
        debug: true,
        telemetries: [
            'errors',
            'performance',
            ['http', { addXRayTraceIdHeader: true }],
            'replay'
        ]
    });
    console.info(
        `[rum-demo] initialized full: ${key} -> ${scenario.appMonitorId}`
    );
}

(async () => {
    try {
        const { key, scenario, region, endpoint } = getScenario();
        if (key.endsWith('-slim')) {
            await initSlim(key, scenario, region, endpoint);
        } else {
            await initFull(key, scenario, region, endpoint);
        }
    } catch (error) {
        console.error(error);
    }
})();
