/* eslint-disable no-underscore-dangle */
import { HttpHandler, HttpRequest } from '@smithy/protocol-http';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { responseToJson } from './utils';
import { IDENTITY_KEY } from '../utils/constants';
import { Config } from '../orchestration/Orchestration';
import { InternalLogger } from '../utils/InternalLogger';

const METHOD = 'POST';
const CONTENT_TYPE = 'application/x-amz-json-1.1';
const PROTOCOL = 'https:';

// Targets
const GET_ID_TARGET = 'AWSCognitoIdentityService.GetId';
const GET_TOKEN_TARGET = 'AWSCognitoIdentityService.GetOpenIdToken';
const GET_CREDENTIALS_TARGET =
    'AWSCognitoIdentityService.GetCredentialsForIdentity';

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
    clientConfig?: Config;
    applicationId?: string;
};

export class CognitoIdentityClient {
    private fetchRequestHandler: HttpHandler;
    private hostname: string;
    private identityStorageKey: string;
    private config?: Config;

    constructor(config: CognitoIdentityClientConfig) {
        this.hostname = `cognito-identity.${config.region}.amazonaws.com`;
        this.fetchRequestHandler = config.fetchRequestHandler;
        this.config = config.clientConfig;
        this.identityStorageKey = config.clientConfig?.cookieAttributes.unique
            ? `${IDENTITY_KEY}_${config.applicationId}`
            : IDENTITY_KEY;
    }

    public getId = async (request: { IdentityPoolId: string }) => {
        let getIdResponse: GetIdResponse | null = null;

        try {
            getIdResponse = JSON.parse(
                localStorage.getItem(this.identityStorageKey)!
            ) as GetIdResponse | null;
        } catch (e) {
            if (this.config?.debug) {
                InternalLogger.error('Failed to parse stored identity:', e);
            }
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
                    this.identityStorageKey,
                    JSON.stringify({ IdentityId: getIdResponse.IdentityId })
                );
            } catch (e) {
                InternalLogger.error('Failed to store identity:', e);
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
            return this.validateOpenIdTokenResponse(
                await responseToJson(response)
            );
        } catch (e) {
            localStorage.removeItem(this.identityStorageKey);
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
            const { AccessKeyId, Expiration, SecretKey, SessionToken } =
                this.validateCredenentialsResponse(
                    await responseToJson(response)
                );
            return {
                accessKeyId: AccessKeyId as string,
                secretAccessKey: SecretKey as string,
                sessionToken: SessionToken as string,
                expiration: new Date(Expiration * 1000)
            };
        } catch (e) {
            localStorage.removeItem(this.identityStorageKey);
            throw new Error(
                `CWR: Failed to retrieve credentials for Cognito identity: ${e}`
            );
        }
    };

    private validateOpenIdTokenResponse = (r: any): OpenIdTokenResponse => {
        if ('IdentityId' in r && 'Token' in r) {
            return r as OpenIdTokenResponse;
        } else if (r && '__type' in r && 'message' in r) {
            // The request may have failed because of ValidationException or
            // ResourceNotFoundException, which means the identity Id is bad. In
            // any case, we invalidate the identity Id so the entire process can
            // be re-tried.
            throw new Error(`${r.__type}: ${r.message}`);
        } else {
            // We don't recognize ths response format.
            throw new Error('Unknown OpenIdToken response');
        }
    };

    private validateCredenentialsResponse = (r: any): CognitoCredentials => {
        if ('IdentityId' in r && 'Credentials' in r) {
            return (r as CredentialsResponse).Credentials;
        } else if (r && '__type' in r && 'message' in r) {
            // The request may have failed because of ValidationException or
            // ResourceNotFoundException, which means the identity Id is bad. In
            // any case, we invalidate the identity Id so the entire process can
            // be re-tried.
            throw new Error(`${r.__type}: ${r.message}`);
        } else {
            // We don't recognize ths response format.
            throw new Error('Unknown Credentials response');
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
