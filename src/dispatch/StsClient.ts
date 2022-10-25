import { HttpHandler, HttpRequest } from '@aws-sdk/protocol-http';
import { CognitoIdentityClientConfig } from './CognitoIdentityClient';
import { Credentials } from '@aws-sdk/types';
import { responseToString } from './utils';

const METHOD = 'POST';
const CONTENT_TYPE = 'application/x-www-form-urlencoded';
const PROTOCOL = 'https:';
const ACTION = 'AssumeRoleWithWebIdentity';
const VERSION = '2011-06-15';

export interface STSSendRequest {
    RoleArn: string;
    RoleSessionName: string;
    WebIdentityToken: string;
}

export class StsClient {
    private fetchRequestHandler: HttpHandler;
    private hostname: string;

    constructor(config: CognitoIdentityClientConfig) {
        this.hostname = `sts.${config.region}.amazonaws.com`;
        this.fetchRequestHandler = config.fetchRequestHandler;
    }

    public assumeRoleWithWebIdentity = async (
        request: STSSendRequest
    ): Promise<Credentials> => {
        try {
            const requestObject = {
                ...request,
                Action: ACTION,
                Version: VERSION
            };
            const encodedBody = new URLSearchParams(
                Object.entries(requestObject)
            ).toString();
            const STSRequest = new HttpRequest({
                method: METHOD,
                headers: {
                    'content-type': CONTENT_TYPE,
                    host: this.hostname
                },
                protocol: PROTOCOL,
                hostname: this.hostname,
                body: encodedBody
            });
            const { response } = await this.fetchRequestHandler.handle(
                STSRequest
            );
            const xmlResponse = await responseToString(response);
            return {
                accessKeyId: xmlResponse
                    .split('<AccessKeyId>')[1]
                    .split('</AccessKeyId>')[0],
                secretAccessKey: xmlResponse
                    .split('<SecretAccessKey>')[1]
                    .split('</SecretAccessKey>')[0],
                sessionToken: xmlResponse
                    .split('<SessionToken>')[1]
                    .split('</SessionToken>')[0],
                expiration: new Date(
                    xmlResponse
                        .split('<Expiration>')[1]
                        .split('</Expiration>')[0]
                )
            } as Credentials;
        } catch (e) {
            throw new Error(
                `CWR: Failed to retrieve credentials from STS: ${e}`
            );
        }
    };
}
