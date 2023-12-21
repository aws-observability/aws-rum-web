import { Config } from '../orchestration/Orchestration';
import { Credentials } from '@aws-sdk/types';
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
     * Implements CredentialsProvider = Provider<Credentials>
     */
    protected AnonymousCognitoCredentialsProvider =
        async (): Promise<Credentials> => {
            return this.cognitoIdentityClient
                .getId({ IdentityPoolId: this.config.identityPoolId as string })
                .then((getIdResponse) =>
                    this.cognitoIdentityClient.getCredentialsForIdentity(
                        getIdResponse.IdentityId
                    )
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
