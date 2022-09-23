import * as Utils from '../../test-utils/test-utils';
import { Credentials } from '@aws-sdk/types';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import { advanceTo } from 'jest-date-mock';
import { getReadableStream } from '../../test-utils/test-utils';
import { StsClient } from '../StsClient';

const mockCredentials =
    '<AccessKeyId>x</AccessKeyId><SecretAccessKey>y</SecretAccessKey><SessionToken>z</SessionToken><Expiration>2020</Expiration>';

const fetchHandler = jest.fn();

jest.mock('@aws-sdk/fetch-http-handler', () => ({
    FetchHttpHandler: jest
        .fn()
        .mockImplementation(() => ({ handle: fetchHandler }))
}));

describe('StsClient tests', () => {
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

    test('when send is called, then credentials are returned', async () => {
        // Init
        fetchHandler.mockResolvedValue({
            response: {
                body: getReadableStream(mockCredentials)
            }
        });

        const client: StsClient = new StsClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION
        });

        // Run
        const creds: Credentials = await client.assumeRoleWithWebIdentity({
            RoleArn: 'mock-role-arn',
            RoleSessionName: 'mock-session-name',
            WebIdentityToken: 'mock-web-identity-token'
        });

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
        expect(creds).toMatchObject({
            accessKeyId: 'x',
            secretAccessKey: 'y',
            sessionToken: 'z',
            expiration: new Date('2020')
        });
    });

    test('when STS fails, error is thrown', async () => {
        const e: Error = new Error('There are no STS credentials');
        fetchHandler.mockImplementation(() => {
            throw e;
        });

        // Init
        const client: StsClient = new StsClient({
            fetchRequestHandler: new FetchHttpHandler(),
            region: Utils.AWS_RUM_REGION
        });

        // Assert
        return expect(
            client.assumeRoleWithWebIdentity({
                RoleArn: 'mock-role-arn',
                RoleSessionName: 'mock-session-name',
                WebIdentityToken: 'mock-web-identity-token'
            })
        ).rejects.toEqual(e);
    });
});
