import { Config } from '../orchestration/Orchestration';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { CRED_KEY } from '../utils/constants';
import { Authentication } from './Authentication';

export class EnhancedAuthentication extends Authentication {
    constructor(config: Config) {
        super(config);
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
            return this.cognitoIdentityClient
                .getId({ IdentityPoolId: this.config.identityPoolId as string })
                .then((getIdResponse) =>
                    this.cognitoIdentityClient.getCredentialsForIdentity(
                        getIdResponse.IdentityId
                    )
                )
                .then((credentials: AwsCredentialIdentity) => {
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
