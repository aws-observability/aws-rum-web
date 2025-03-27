import * as Utils from '../../test-utils/test-utils';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { advanceTo } from 'jest-date-mock';
import { CognitoIdentityClient } from '../CognitoIdentityClient';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import {
    APPLICATION_ID,
    getReadableStream,
    DEFAULT_CONFIG
} from '../../test-utils/test-utils';
import { IDENTITY_KEY } from '../../utils/constants';

const mockCredentials =
    '{ "IdentityId": "a", "Credentials": { "AccessKeyId": "x", "SecretKey": "y", "SessionToken": "z" } }';
const mockToken = '{"IdentityId": "mockId", "Token": "mockToken"}';
const mockIdCommand = '{"IdentityId": "mockId"}';

const uniqueIdentityCookie = `${IDENTITY_KEY}_${APPLICATION_ID}`;

const fetchHandler = jest.fn();

jest.mock('@smithy/fetch-http-handler', () => ({
    FetchHttpHandler: jest
        .fn()
        .mockImplementation(() => ({ handle: fetchHandler }))
}));

describe('CognitoIdentityClient tests', () => {
    beforeEach(() => {
        advanceTo(0);
        fetchHandler.mockClear();
        localStorage.clear();

        // @ts-ignore
        FetchHttpHandler.mockImplementation(() => {
            return {
                handle: fetchHandler
            };
        });
    });

    test('when getCredentialsForIdentity called then credentials are returned', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(mockCredentials)
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        const creds: AwsCredentialIdentity =
            await client.getCredentialsForIdentity('my-fake-identity-id');

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
        expect(creds).toMatchObject({
            accessKeyId: 'x',
            secretAccessKey: 'y',
            sessionToken: 'z'
        });
    });

    test('when getCredentialsForIdentity error, then an error is thrown', async () => {
        const e: Error = new Error('Something went wrong');
        fetchHandler.mockImplementation(() => {
            throw e;
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve credentials for Cognito identity: ${e}`
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        await expect(
            client.getCredentialsForIdentity('my-fake-identity-id')
        ).rejects.toEqual(expected);
    });

    test('when getOpenIdToken is called, then token command is returned', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(mockToken)
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        const tokenCommand = await client.getOpenIdToken({
            IdentityId: 'my-fake-identity-id'
        });

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
        expect(tokenCommand).toMatchObject({
            IdentityId: 'mockId',
            Token: 'mockToken'
        });
    });

    test('when getOpenIdToken error, then an error is thrown', async () => {
        const e: Error = new Error('Something went wrong');
        fetchHandler.mockImplementation(() => {
            throw e;
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve Cognito OpenId token: ${e}`
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        expect(
            client.getOpenIdToken({
                IdentityId: 'my-fake-identity-id'
            })
        ).rejects.toEqual(expected);
    });

    test('when getId is called, then token command is returned', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(mockIdCommand)
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        const idCommand = await client.getId({
            IdentityPoolId: 'my-fake-identity-pool-id'
        });

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
        expect(idCommand).toMatchObject({
            IdentityId: 'mockId'
        });
    });

    test('when getId error, then an error is thrown', async () => {
        const e = new Error('Something went wrong');
        fetchHandler.mockImplementation(() => {
            throw e;
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve Cognito identity: ${e}`
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        return expect(
            client.getId({
                IdentityPoolId: 'my-fake-identity-pool-id'
            })
        ).rejects.toEqual(expected);
    });

    test('when identity Id is retrieved from Cognito then next identity Id is retrieved from localStorage', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(mockIdCommand)
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        await client.getId({ IdentityPoolId: 'my-fake-identity-pool-id' });
        const idCommand = await client.getId({
            IdentityPoolId: 'my-fake-identity-pool-id'
        });

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
        expect(idCommand).toMatchObject({
            IdentityId: 'mockId'
        });
    });

    test('when getCredentialsForIdentity returns a ResourceNotFoundException then an error is thrown', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(
                    '{"__type": "ResourceNotFoundException", "message": ""}'
                )
            }
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve credentials for Cognito identity: Error: ResourceNotFoundException: `
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        await expect(
            client.getCredentialsForIdentity('my-fake-identity-id')
        ).rejects.toEqual(expected);
    });

    test('when getCredentialsForIdentity returns a ValidationException then an error is thrown', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(
                    '{"__type": "ValidationException", "message": ""}'
                )
            }
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve credentials for Cognito identity: Error: ValidationException: `
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        await expect(
            client.getCredentialsForIdentity('my-fake-identity-id')
        ).rejects.toEqual(expected);
    });

    test('when getCredentialsForIdentity returns bad response then an error is thrown', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream('{}')
            }
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve credentials for Cognito identity: Error: Unknown Credentials response`
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        await expect(
            client.getCredentialsForIdentity('my-fake-identity-id')
        ).rejects.toEqual(expected);
    });

    test('when getCredentialsForIdentity returns bad response then identity id is removed from localStorage ', async () => {
        localStorage.setItem(IDENTITY_KEY, 'my-fake-identity-id');

        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream('not-json')
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        try {
            await client.getCredentialsForIdentity('my-fake-identity-id');
        } catch (e) {
            // Ignore
        }

        // Assert
        expect(localStorage.getItem(IDENTITY_KEY)).toBe(null);
    });

    test('when getOpenIdToken returns a ResourceNotFoundException then an error is thrown', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(
                    '{"__type": "ResourceNotFoundException", "message": ""}'
                )
            }
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve Cognito OpenId token: Error: ResourceNotFoundException: `
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        await expect(
            client.getOpenIdToken({ IdentityId: 'my-fake-identity-id' })
        ).rejects.toEqual(expected);
    });

    test('when getOpenIdToken returns a bad response then an error is thrown', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream('{}')
            }
        });
        const expected: Error = new Error(
            `CWR: Failed to retrieve Cognito OpenId token: Error: Unknown OpenIdToken response`
        );

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Assert
        await expect(
            client.getOpenIdToken({ IdentityId: 'my-fake-identity-id' })
        ).rejects.toEqual(expected);
    });

    test('when getOpenIdToken returns a bad response then identity id is removed from localStorage ', async () => {
        localStorage.setItem(IDENTITY_KEY, 'my-fake-identity-id');

        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream('not-json')
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: false
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        try {
            await client.getOpenIdToken({ IdentityId: 'my-fake-identity-id' });
        } catch (e) {
            // Ignore
        }

        // Assert
        expect(localStorage.getItem(IDENTITY_KEY)).toBe(null);
    });

    test('when unique cookie names are used then cookie name with application id appended is stored', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(mockIdCommand)
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: true,
                    cookieAttributes: {
                        ...DEFAULT_CONFIG.cookieAttributes,
                        ...{ unique: true }
                    }
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        await client.getId({
            IdentityPoolId: 'my-fake-identity-pool-id'
        });

        // Assert
        const credentials = JSON.parse(
            localStorage.getItem(uniqueIdentityCookie)!
        );

        expect(credentials).toEqual(
            expect.objectContaining({
                IdentityId: 'mockId'
            })
        );
    });

    test('when unique cookie names are used then cookie name with application id appended is retrieved', async () => {
        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(mockIdCommand)
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: true,
                    cookieAttributes: {
                        ...DEFAULT_CONFIG.cookieAttributes,
                        ...{ unique: true }
                    }
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        const idCommand = await client.getId({
            IdentityPoolId: 'my-fake-identity-pool-id'
        });

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
        expect(idCommand).toMatchObject({
            IdentityId: 'mockId'
        });
    });

    test('when unique cookie names and getOpenIdToken returns a bad response then identity id is removed from localStorage', async () => {
        localStorage.setItem(uniqueIdentityCookie, 'my-fake-identity-id');

        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream('not-json')
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: true,
                    cookieAttributes: {
                        ...DEFAULT_CONFIG.cookieAttributes,
                        ...{ unique: true }
                    }
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        try {
            await client.getOpenIdToken({ IdentityId: 'my-fake-identity-id' });
        } catch (e) {
            // Ignore
        }

        // Assert
        expect(localStorage.getItem(uniqueIdentityCookie)).toBe(null);
    });

    test('when unique cookie names and getCredentialsForIdentity returns bad response then identity id is removed from localStorage ', async () => {
        localStorage.setItem(uniqueIdentityCookie, 'my-fake-identity-id');

        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream('not-json')
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION,
            clientConfig: {
                ...DEFAULT_CONFIG,
                ...{
                    allowCookies: true,
                    cookieAttributes: {
                        ...DEFAULT_CONFIG.cookieAttributes,
                        ...{ unique: true }
                    }
                }
            },
            applicationId: APPLICATION_ID
        });

        // Run
        try {
            await client.getCredentialsForIdentity('my-fake-identity-id');
        } catch (e) {
            // Ignore
        }

        // Assert
        expect(localStorage.getItem(uniqueIdentityCookie)).toBe(null);
    });
});
