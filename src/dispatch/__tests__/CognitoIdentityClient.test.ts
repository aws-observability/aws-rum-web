import * as Utils from '../../test-utils/test-utils';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import { advanceTo } from 'jest-date-mock';
import { CognitoIdentityClient } from '../CognitoIdentityClient';
import { Credentials } from '@aws-sdk/types';
import { getReadableStream } from '../../test-utils/test-utils';
import { IDENTITY_KEY } from '../../utils/constants';

const mockCredentials =
    '{ "IdentityId": "a", "Credentials": { "AccessKeyId": "x", "SecretKey": "y", "SessionToken": "z" } }';
const mockToken = '{"IdentityId": "mockId", "Token": "mockToken"}';
const mockIdCommand = '{"IdentityId": "mockId"}';

const fetchHandler = jest.fn();

jest.mock('@aws-sdk/fetch-http-handler', () => ({
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
            region: Utils.AWS_RUM_REGION
        });

        // Run
        const creds: Credentials = await client.getCredentialsForIdentity(
            'my-fake-identity-id'
        );

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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
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
            region: Utils.AWS_RUM_REGION
        });

        // Assert
        await expect(
            client.getCredentialsForIdentity('my-fake-identity-id')
        ).rejects.toEqual(expected);
    });

    test('when getCredentialsForIdentity returns a ResourceNotFoundException then identity id is removed from localStorage ', async () => {
        localStorage.setItem(IDENTITY_KEY, 'my-fake-identity-id');

        fetchHandler.mockResolvedValueOnce({
            response: {
                body: getReadableStream(
                    '{"__type": "ResourceNotFoundException", "message": ""}'
                )
            }
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION
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
});
