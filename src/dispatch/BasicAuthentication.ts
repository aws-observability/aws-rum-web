import { Config } from '../orchestration/Orchestration';
import { Credentials } from '@aws-sdk/types';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import { StsClient } from './StsClient';
import { CRED_KEY } from '../utils/constants';
import { Authentication } from './Authentication';

export class BasicAuthentication extends Authentication {
    private stsClient: StsClient;

    constructor(config: Config) {
        super(config);
        const region: string = config.identityPoolId!.split(':')[0];
        this.stsClient = new StsClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region
        });
    }

    /**
     * Provides credentials for an anonymous (guest) user. These credentials are retrieved from Cognito's basic
     * (classic) authflow.
     *
     * See https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html
     *
     * Implements CredentialsProvider = Provider<Credentials>
     */
    protected AnonymousCognitoCredentialsProvider =
        async (): Promise<Credentials> => {
            return this.cognitoIdentityClient
                .getId({
                    IdentityPoolId: this.config.identityPoolId as string
                })
                .then((getIdResponse) =>
                    this.cognitoIdentityClient.getOpenIdToken(getIdResponse)
                )
                .then((getOpenIdTokenResponse) =>
                    this.stsClient.assumeRoleWithWebIdentity({
                        RoleArn: this.config.guestRoleArn as string,
                        RoleSessionName: 'cwr',
                        WebIdentityToken: getOpenIdTokenResponse.Token
                    })
                )
                .then((credentials: Credentials) => {
                    this.credentials = credentials;
                    try {
                        localStorage.setItem(
                            CRED_KEY,
                            JSON.stringify(credentials)
                        );
                    } catch (e) {
                        // Ignore
                    }

                    return credentials;
                });
        };
}
