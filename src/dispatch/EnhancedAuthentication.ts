import { Config } from '../orchestration/Orchestration';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { Authentication } from './Authentication';
import { InternalLogger } from '../utils/InternalLogger';

export class EnhancedAuthentication extends Authentication {
    constructor(config: Config, applicationId: string) {
        super(config, applicationId);
    }
    /**
     * Provides credentials for an anonymous (guest) user. These credentials are retrieved from Cognito's enhanced
     * authflow.
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

                    const credentials =
                        await this.cognitoIdentityClient.getCredentialsForIdentity(
                            getIdResponse.IdentityId
                        );

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
