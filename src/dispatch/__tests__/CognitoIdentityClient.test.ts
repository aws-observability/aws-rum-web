import * as Utils from '../../test-utils/test-utils';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import { advanceTo } from 'jest-date-mock';
import { CognitoIdentityClient } from '../CognitoIdentityClient';
import { Credentials } from '@aws-sdk/types';
import { getReadableStream } from '../../test-utils/test-utils';

const mockCredentials =
    '{ "IdentityId": "a", "Credentials": { "AccessKeyId": "x", "SecretAccessKey": "y", "SessionToken": "z" } }';
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
        const e: Error = new Error('There are no credentials');
        fetchHandler.mockImplementation(() => {
            throw new Error('There are no credentials');
        });

        // Init
        const client: CognitoIdentityClient = new CognitoIdentityClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION
        });

        // Assert
        return expect(
            client.getCredentialsForIdentity('my-fake-identity-id')
        ).rejects.toEqual(e);
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
        const e: Error = new Error('There are no credentials');
        fetchHandler.mockImplementation(() => {
            throw new Error('There are no credentials');
        });

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
        ).rejects.toEqual(e);
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
        const e: Error = new Error('There are no credentials');
        fetchHandler.mockImplementation(() => {
            throw new Error('There are no credentials');
        });

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
        ).rejects.toEqual(e);
    });
});
