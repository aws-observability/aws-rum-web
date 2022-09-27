import {
    CognitoIdentityClient,
    fromCognitoIdentityPool
} from './CognitoIdentityClient';
import { Config } from '../orchestration/Orchestration';
import { CredentialProvider, Credentials } from '@aws-sdk/types';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import { CRED_KEY, CRED_RENEW_MS } from '../utils/constants';

export class EnhancedAuthentication {
    private cognitoIdentityClient: CognitoIdentityClient;
    private config: Config;
    private credentials: Credentials | undefined;

    constructor(config: Config) {
        const region: string = config.identityPoolId!.split(':')[0];
        this.config = config;
        this.cognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region
        });
    }

    /**
     * A credential provider which provides AWS credentials for an anonymous
     * (guest) user. These credentials are retrieved from the first successful
     * provider in a chain.
     *
     * Credentials are stored in and retrieved from localStorage. This prevents the client from having to
     * re-authenticate every time the client loads, which (1) improves the performance of the RUM web client and (2)
     * reduces the load on AWS services Cognito and STS.
     *
     * While storing credentials in localStorage puts the credential at greater risk of being leaked through an
     * XSS attack, there is no impact if the credentials were to be leaked. This is because (1) the identity pool ID
     * and role ARN are public and (2) the credentials are for an anonymous (guest) user.
     *
     * Regarding (1), the identity pool ID and role ARN are, by necessity, public. These identifiers are shipped with
     * each application as part of Cognito's Basic (Classic) authentication flow. The identity pool ID and role ARN
     * are not secret.
     *
     * Regarding (2), the authentication chain implemented in this file only supports anonymous (guest)
     * authentication. When the Cognito authentication flow is executed, {@code AnonymousCognitoCredentialsProvider}
     * does not communicate with a login provider such as Amazon, Facebook or Google. Instead, it relies on (a) the
     * identity pool supporting unauthenticated identities and (b) the IAM role policy enabling login through the
     * identity pool. If the identity pool does not support unauthenticated identities, this authentication chain
     * will not succeed.
     *
     * Taken together, (1) and (2) mean that if these temporary credentials were to be leaked, the leaked credentials
     * would not allow a bad actor to gain access to anything which they did not already have public access to.
     *
     * Implements CredentialsProvider = Provider<Credentials>
     */
    public ChainAnonymousCredentialsProvider = async (): Promise<Credentials> => {
        return this.AnonymousCredentialsProvider()
            .catch(this.AnonymousStorageCredentialsProvider)
            .catch(this.AnonymousCognitoCredentialsProvider);
    };

    /**
     * Provides credentials for an anonymous (guest) user. These credentials are read from a member variable.
     *
     * Implements CredentialsProvider = Provider<Credentials>
     */
    private AnonymousCredentialsProvider = async (): Promise<Credentials> => {
        return new Promise<Credentials>((resolve, reject) => {
            if (this.renewCredentials()) {
                // The credentials have expired.
                return reject();
            }
            resolve(this.credentials!);
        });
    };

    /**
     * Provides credentials for an anonymous (guest) user. These credentials are read from localStorage.
     *
     * Implements CredentialsProvider = Provider<Credentials>
     */
    private AnonymousStorageCredentialsProvider = async (): Promise<Credentials> => {
        return new Promise<Credentials>((resolve, reject) => {
            let credentials;
            try {
                credentials = JSON.parse(localStorage.getItem(CRED_KEY)!);
            } catch (e) {
                // Error decoding or parsing the cookie -- abort
                reject();
            }
            // The expiration property of Credentials has a date type. Because the date was serialized as a string,
            // we need to convert it back into a date, otherwise the AWS SDK signing middleware
            // (@aws-sdk/middleware-signing) will throw an exception and no credentials will be returned.
            credentials.expiration = new Date(credentials.expiration);
            this.credentials = credentials;
            if (this.renewCredentials()) {
                // The credentials have expired.
                return reject();
            }
            this.credentials = credentials;
            resolve(credentials);
        });
    };

    /**
     * Provides credentials for an anonymous (guest) user. These credentials are retrieved from Cognito's enhanced
     * authflow.
     *
     * See https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html
     *
     * Implements CredentialsProvider = Provider<Credentials>
     */
    private AnonymousCognitoCredentialsProvider = async (): Promise<Credentials> => {
        const credentialProvider: CredentialProvider = fromCognitoIdentityPool({
            client: this.cognitoIdentityClient,
            identityPoolId: this.config.identityPoolId as string
        });

        return credentialProvider().then((credentials) => {
            this.credentials = credentials;
            try {
                localStorage.setItem(CRED_KEY, JSON.stringify(credentials));
            } catch (e) {
                // Ignore
            }
            return credentials;
        });
    };

    private renewCredentials(): boolean {
        if (!this.credentials || !this.credentials.expiration) {
            return true;
        }
        const renewalTime: Date = new Date(
            this.credentials.expiration.getTime() - CRED_RENEW_MS
        );
        return new Date() > renewalTime;
    }
}
