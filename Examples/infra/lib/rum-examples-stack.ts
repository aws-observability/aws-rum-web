import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rum from 'aws-cdk-lib/aws-rum';

// The 8-scenario test matrix: (auth | noauth) x (npm | cdn) x (full | slim).
// Each scenario gets its own CloudWatch RUM AppMonitor so we can attribute
// events in the RUM console unambiguously.
const SCENARIOS = [
    { key: 'noauth-npm-full', auth: 'noauth', source: 'npm', variant: 'full' },
    { key: 'noauth-npm-slim', auth: 'noauth', source: 'npm', variant: 'slim' },
    { key: 'noauth-cdn-full', auth: 'noauth', source: 'cdn', variant: 'full' },
    { key: 'noauth-cdn-slim', auth: 'noauth', source: 'cdn', variant: 'slim' },
    { key: 'auth-npm-full', auth: 'auth', source: 'npm', variant: 'full' },
    { key: 'auth-npm-slim', auth: 'auth', source: 'npm', variant: 'slim' },
    { key: 'auth-cdn-full', auth: 'auth', source: 'cdn', variant: 'full' },
    { key: 'auth-cdn-slim', auth: 'auth', source: 'cdn', variant: 'slim' }
] as const;

const PROJECT = 'rum-examples-3x';

export class RumExamples3xStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ─────────── Cognito User Pool (used by auth-* scenarios) ───────────
        const userPool = new cognito.CfnUserPool(this, 'UserPool', {
            userPoolName: `${PROJECT}-users`,
            adminCreateUserConfig: { allowAdminCreateUserOnly: true },
            accountRecoverySetting: {
                recoveryMechanisms: [{ name: 'admin_only', priority: 1 }]
            },
            policies: {
                passwordPolicy: {
                    minimumLength: 12,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSymbols: true,
                    requireUppercase: true
                }
            }
        });

        const userPoolClient = new cognito.CfnUserPoolClient(
            this,
            'UserPoolClient',
            {
                userPoolId: userPool.ref,
                clientName: `${PROJECT}-client`,
                generateSecret: false,
                explicitAuthFlows: [
                    'ALLOW_USER_PASSWORD_AUTH',
                    'ALLOW_USER_SRP_AUTH',
                    'ALLOW_REFRESH_TOKEN_AUTH'
                ],
                allowedOAuthFlows: ['implicit', 'code'],
                allowedOAuthFlowsUserPoolClient: true,
                allowedOAuthScopes: [
                    'profile',
                    'phone',
                    'email',
                    'openid',
                    'aws.cognito.signin.user.admin'
                ],
                callbackUrLs: ['https://example.com'],
                supportedIdentityProviders: ['COGNITO'],
                preventUserExistenceErrors: 'ENABLED'
            }
        );

        // ─────────── Cognito Identity Pool (all scenarios) ───────────
        const identityPool = new cognito.CfnIdentityPool(
            this,
            'ExamplesIdentityPool',
            {
                identityPoolName: `${PROJECT}_identity_pool`,
                allowUnauthenticatedIdentities: true,
                cognitoIdentityProviders: [
                    {
                        clientId: userPoolClient.ref,
                        providerName: userPool.attrProviderName,
                        serverSideTokenCheck: false
                    }
                ]
            }
        );

        // ─────────── IAM roles for the Identity Pool ───────────
        const rumPutEventsPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['rum:PutRumEvents'],
                    resources: [
                        `arn:aws:rum:${this.region}:${this.account}:appmonitor/${PROJECT}-*`
                    ]
                })
            ]
        });

        const guestRole = new iam.CfnRole(this, 'GuestRole', {
            roleName: `${PROJECT}-guest-role`,
            assumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: {
                            Federated: 'cognito-identity.amazonaws.com'
                        },
                        Action: 'sts:AssumeRoleWithWebIdentity',
                        Condition: {
                            StringEquals: {
                                'cognito-identity.amazonaws.com:aud':
                                    identityPool.ref
                            },
                            'ForAnyValue:StringLike': {
                                'cognito-identity.amazonaws.com:amr':
                                    'unauthenticated'
                            }
                        }
                    }
                ]
            },
            policies: [
                {
                    policyName: 'RumPutEvents',
                    policyDocument: rumPutEventsPolicy.toJSON()
                }
            ]
        });

        const authRole = new iam.CfnRole(this, 'AuthenticatedRole', {
            roleName: `${PROJECT}-auth-role`,
            assumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: {
                            Federated: 'cognito-identity.amazonaws.com'
                        },
                        Action: 'sts:AssumeRoleWithWebIdentity',
                        Condition: {
                            StringEquals: {
                                'cognito-identity.amazonaws.com:aud':
                                    identityPool.ref
                            },
                            'ForAnyValue:StringLike': {
                                'cognito-identity.amazonaws.com:amr':
                                    'authenticated'
                            }
                        }
                    }
                ]
            },
            policies: [
                {
                    policyName: 'RumPutEvents',
                    policyDocument: rumPutEventsPolicy.toJSON()
                }
            ]
        });

        new cognito.CfnIdentityPoolRoleAttachment(
            this,
            'IdentityPoolRoleAttachment',
            {
                identityPoolId: identityPool.ref,
                roles: {
                    unauthenticated: guestRole.attrArn,
                    authenticated: authRole.attrArn
                }
            }
        );

        // ─────────── One AppMonitor per scenario ───────────
        // CwLogEnabled + EnableXRay are both ON so the RUM Console's "Logs"
        // and "Traces" tabs have data — these are required for support
        // debugging and were manually toggled in the live stack before being
        // codified here.
        //
        // noauth-* monitors pass GuestRoleArn so the RUM web client can
        // assume the guest role via the Identity Pool. auth-* monitors omit
        // it: those scenarios either use an authenticated Cognito user
        // (auth-*-slim via BYO auth) or fall back to guest creds (auth-*-full
        // has no BYO auth hook).
        for (const sc of SCENARIOS) {
            const name = `${PROJECT}-${sc.key}`;
            const config: rum.CfnAppMonitor.AppMonitorConfigurationProperty = {
                allowCookies: true,
                enableXRay: true,
                identityPoolId: identityPool.ref,
                sessionSampleRate: 1,
                telemetries: ['errors', 'performance', 'http'],
                ...(sc.auth === 'noauth'
                    ? { guestRoleArn: guestRole.attrArn }
                    : {})
            };

            const monitor = new rum.CfnAppMonitor(
                this,
                `AppMonitor-${sc.key}`,
                {
                    name,
                    domain: 'localhost',
                    cwLogEnabled: true,
                    appMonitorConfiguration: config,
                    tags: [
                        { key: 'project', value: PROJECT },
                        { key: 'scenario', value: sc.key },
                        { key: 'auth', value: sc.auth },
                        { key: 'source', value: sc.source },
                        { key: 'variant', value: sc.variant }
                    ]
                }
            );

            new cdk.CfnOutput(this, `AppMonitorId-${sc.key}`, {
                value: monitor.attrId,
                exportName: `${PROJECT}-app-monitor-id-${sc.key}`
            });

            // Resource-based policy on the two *-cdn-slim monitors — these
            // use the CDN script with no BYO auth and no Identity Pool
            // plumbing, so PutRumEvents must be allowed unsigned via a
            // resource policy rather than via IAM on the guest role.
            if (sc.key === 'noauth-cdn-slim' || sc.key === 'auth-cdn-slim') {
                new rum.CfnResourcePolicy(this, `ResourcePolicy-${sc.key}`, {
                    name,
                    policyDocument: JSON.stringify({
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Sid: 'AllowUnsignedPutRumEvents',
                                Effect: 'Allow',
                                Principal: '*',
                                Action: 'rum:PutRumEvents',
                                Resource: `arn:aws:rum:${this.region}:${this.account}:appmonitor/${name}`,
                                Condition: {
                                    StringEquals: {
                                        'aws:SourceAccount': this.account
                                    }
                                }
                            }
                        ]
                    })
                });
            }
        }

        new cdk.CfnOutput(this, 'IdentityPoolId', { value: identityPool.ref });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.ref });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.ref
        });
        new cdk.CfnOutput(this, 'Region', { value: this.region });
    }
}
