/* eslint-disable no-underscore-dangle */
import { HttpHandler, HttpRequest } from '@aws-sdk/protocol-http';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { responseToJson } from './utils';
import { IDENTITY_KEY } from '../utils/constants';

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
    SecretKey: string;
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
        let getIdResponse: GetIdResponse | null = null;

        try {
            getIdResponse = JSON.parse(
                localStorage.getItem(IDENTITY_KEY)!
            ) as GetIdResponse | null;
        } catch (e) {
            // Ignore -- we will get a new identity Id from Cognito
        }

        if (getIdResponse && getIdResponse.IdentityId) {
            return Promise.resolve(getIdResponse);
        }

        try {
            const requestPayload = JSON.stringify(request);
            const idRequest = this.getHttpRequest(
                GET_ID_TARGET,
                requestPayload
            );
            const getIdResponse = (await responseToJson(
                (
                    await this.fetchRequestHandler.handle(idRequest)
                ).response
            )) as GetIdResponse;
            try {
                localStorage.setItem(
                    IDENTITY_KEY,
                    JSON.stringify({ IdentityId: getIdResponse.IdentityId })
                );
            } catch (e) {
                // Ignore
            }
            return getIdResponse;
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
    ): Promise<AwsCredentialIdentity> => {
        try {
            const requestPayload = JSON.stringify({ IdentityId: identityId });
            const credentialRequest = this.getHttpRequest(
                GET_CREDENTIALS_TARGET,
                requestPayload
            );
            const { response } = await this.fetchRequestHandler.handle(
                credentialRequest
            );
            const credentialsResponse = (await responseToJson(
                response
            )) as CredentialsResponse;
            this.validateCredenentialsResponse(credentialsResponse);
            const Credentials = credentialsResponse.Credentials;
            const { AccessKeyId, Expiration, SecretKey, SessionToken } =
                Credentials;
            return {
                accessKeyId: AccessKeyId as string,
                secretAccessKey: SecretKey as string,
                sessionToken: SessionToken as string,
                expiration: new Date(Expiration * 1000)
            };
        } catch (e) {
            throw new Error(
                `CWR: Failed to retrieve credentials for Cognito identity: ${e}`
            );
        }
    };

    private validateCredenentialsResponse = (cr: any) => {
        if (
            cr &&
            cr.__type &&
            (cr.__type === 'ResourceNotFoundException' ||
                cr.__type === 'ValidationException')
        ) {
            // The request may have failed because of ValidationException or
            // ResourceNotFoundException, which means the identity Id is bad. In
            // any case, we invalidate the identity Id so the entire process can
            // be re-tried.
            localStorage.removeItem(IDENTITY_KEY);
            throw new Error(`${cr.__type}: ${cr.message}`);
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
