import { Config } from '../orchestration/Orchestration';
import { AwsCredentialIdentity } from '@aws-sdk/types';
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
     * Implements AwsCredentialIdentityProvider = Provider<AwsCredentialIdentity>
     */
    protected AnonymousCognitoCredentialsProvider =
        async (): Promise<AwsCredentialIdentity> => {
            let retries = 1;

            while (true) {
                try {
                    const getIdResponse =
                        await this.cognitoIdentityClient.getId({
                            IdentityPoolId: this.config.identityPoolId as string
                        });

                    const getOpenIdTokenResponse =
                        await this.cognitoIdentityClient.getOpenIdToken(
                            getIdResponse
                        );

                    const credentials =
                        await this.stsClient.assumeRoleWithWebIdentity({
                            RoleArn: this.config.guestRoleArn as string,
                            RoleSessionName: 'cwr',
                            WebIdentityToken: getOpenIdTokenResponse.Token
                        });

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
                } catch (e) {
                    if (retries) {
                        retries--;
                    } else {
                        throw e;
                    }
                }
            }
        };
}
