import { HttpHandler, HttpRequest } from '@aws-sdk/protocol-http';
import { Credentials } from '@aws-sdk/types';

const METHOD = 'POST';
const CONTENT_TYPE = 'application/x-amz-json-1.1';
const PROTOCOL = 'https:';

// Targets
const GET_ID_TARGET = 'AWSCognitoIdentityService.GetId';
const GET_TOKEN_TARGET = 'AWSCognitoIdentityService.GetOpenIdToken';
const GET_CREDENTIALS_TARGET =
    'AWSCognitoIdentityService.GetCredentialsForIdentity';

interface CognitoProviderParameters {
    /**
     * The unique identifier for the identity pool from which an identity should
     * be retrieved or generated.
     */
    identityPoolId: string;
    /**
     * The SDK client with which the credential provider will contact the Amazon
     * Cognito service.
     */
    client: CognitoIdentityClient;
}

export const fromCognitoIdentityPool = (
    params: CognitoProviderParameters
): (() => Promise<Credentials>) => {
    return () => params.client.getCredentialsForIdentity(params.identityPoolId);
};

export declare type CognitoIdentityClientConfig = {
    fetchRequestHandler: HttpHandler;
    region?: string;
};

export class CognitoIdentityClient {
    private fetchRequestHandler: HttpHandler;
    private hostname: string;

    constructor(config: CognitoIdentityClientConfig) {
        this.hostname = `cognito-identity.${config.region}.amazonaws.com`;
        this.fetchRequestHandler = config.fetchRequestHandler;
    }

    public getId = async (request: { IdentityPoolId: string }) => {
        const requestPayload = JSON.stringify(request);

        const idRequest = this.getHttpRequest(GET_ID_TARGET, requestPayload);
        return this.fetchRequestHandler
            .handle(idRequest)
            .then(({ response }) =>
                response.body
                    .getReader()
                    .read()
                    .then(({ value }: { value: number[] }) =>
                        JSON.parse(String.fromCharCode.apply(null, value))
                    )
            )
            .catch(() => {
                throw new Error('CWR: Failed to retrieve Cognito identity');
            });
    };

    public getOpenIdToken = async (request: { IdentityId: string }) => {
        const requestPayload = JSON.stringify(request);
        const tokenRequest = this.getHttpRequest(
            GET_TOKEN_TARGET,
            requestPayload
        );

        return this.fetchRequestHandler
            .handle(tokenRequest)
            .then(({ response }) =>
                response.body
                    .getReader()
                    .read()
                    .then(({ value }: { value: number[] }) =>
                        JSON.parse(String.fromCharCode.apply(null, value))
                    )
            )
            .catch(() => {
                throw new Error('CWR: Failed to retrieve Cognito OpenId token');
            });
    };

    public getCredentialsForIdentity = async (
        identityId: string
    ): Promise<Credentials> => {
        const requestPayload = JSON.stringify({ IdentityId: identityId });
        const credentialRequest = this.getHttpRequest(
            GET_CREDENTIALS_TARGET,
            requestPayload
        );

        return this.fetchRequestHandler
            .handle(credentialRequest)
            .then(({ response }) => {
                return response.body
                    .getReader()
                    .read()
                    .then(({ value }: { value: number[] }) => {
                        const { IdentityId, Credentials } = JSON.parse(
                            String.fromCharCode.apply(null, value)
                        );

                        const {
                            AccessKeyId,
                            Expiration,
                            SecretAccessKey,
                            SessionToken
                        } = Credentials;

                        return {
                            identityId: IdentityId as string,
                            accessKeyId: AccessKeyId as string,
                            secretAccessKey: SecretAccessKey as string,
                            sessionToken: SessionToken as string,
                            expiration: new Date(Expiration * 1000)
                        };
                    });
            })
            .catch(() => {
                throw new Error(
                    'CWR: Failed to retrieve credentials for Cognito identity'
                );
            });
    };

    private getHttpRequest = (target: string, payload: string) =>
        new HttpRequest({
            method: METHOD,
            headers: {
                'content-type': CONTENT_TYPE,
                'x-amz-target': target
            },
            protocol: PROTOCOL,
            hostname: this.hostname,
            body: payload
        });
}
