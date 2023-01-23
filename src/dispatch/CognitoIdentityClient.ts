import { HttpHandler, HttpRequest } from '@aws-sdk/protocol-http';
import { Credentials } from '@aws-sdk/types';
import { responseToJson } from './utils';

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

interface CognitoCredentials {
    AccessKeyId: string;
    Expiration: number;
    SecretAccessKey: string;
    SessionToken: string;
}

interface OpenIdTokenResponse {
    IdentityId: string;
    Token: string;
}

interface CredentialsResponse {
    IdentityId: string;
    Credentials: CognitoCredentials;
}

interface GetIdResponse {
    IdentityId: string;
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
        try {
            const requestPayload = JSON.stringify(request);
            const idRequest = this.getHttpRequest(
                GET_ID_TARGET,
                requestPayload
            );
            const { response } = await this.fetchRequestHandler.handle(
                idRequest
            );
            return (await responseToJson(response)) as GetIdResponse;
        } catch (e) {
            throw new Error(`CWR: Failed to retrieve Cognito identity: ${e}`);
        }
    };

    public getOpenIdToken = async (request: { IdentityId: string }) => {
        try {
            const requestPayload = JSON.stringify(request);
            const tokenRequest = this.getHttpRequest(
                GET_TOKEN_TARGET,
                requestPayload
            );
            const { response } = await this.fetchRequestHandler.handle(
                tokenRequest
            );
            return (await responseToJson(response)) as OpenIdTokenResponse;
        } catch (e) {
            throw new Error(
                `CWR: Failed to retrieve Cognito OpenId token: ${e}`
            );
        }
    };

    public getCredentialsForIdentity = async (
        identityId: string
    ): Promise<Credentials> => {
        try {
            const requestPayload = JSON.stringify({ IdentityId: identityId });
            const credentialRequest = this.getHttpRequest(
                GET_CREDENTIALS_TARGET,
                requestPayload
            );
            const { response } = await this.fetchRequestHandler.handle(
                credentialRequest
            );
            const { Credentials } = (await responseToJson(
                response
            )) as CredentialsResponse;
            const { AccessKeyId, Expiration, SecretAccessKey, SessionToken } =
                Credentials;
            return {
                accessKeyId: AccessKeyId as string,
                secretAccessKey: SecretAccessKey as string,
                sessionToken: SessionToken as string,
                expiration: new Date(Expiration * 1000)
            };
        } catch (e) {
            throw new Error(
                `CWR: Failed to retrieve credentials for Cognito identity: ${e}`
            );
        }
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
