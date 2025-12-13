import { Config } from '../orchestration/Orchestration';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { StsClient } from './StsClient';
import { Authentication } from './Authentication';
import { InternalLogger } from '../utils/InternalLogger';

export class BasicAuthentication extends Authentication {
    private stsClient: StsClient;

    constructor(config: Config, applicationId: string) {
        super(config, applicationId);
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
                            this.credentialStorageKey,
                            JSON.stringify(credentials)
                        );
                    } catch (e) {
                        // Ignore
                    }

                    if (this.config.debug) {
                        InternalLogger.info(
                            'AWS credentials fetched successfully'
                        );
                    }
                    return credentials;
                } catch (e) {
                    if (retries) {
                        retries--;
                        if (this.config.debug) {
                            InternalLogger.warn(
                                'AWS credential fetch failed, retrying'
                            );
                        }
                    } else {
                        if (this.config.debug) {
                            InternalLogger.error(
                                'AWS credential fetch failed:',
                                e
                            );
                        }
                        throw e;
                    }
                }
            }
        };
}
