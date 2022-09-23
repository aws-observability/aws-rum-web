import { CRED_KEY } from '../../utils/constants';
import { Credentials } from '@aws-sdk/types';
import { EnhancedAuthentication } from '../EnhancedAuthentication';
import { fromCognitoIdentityPool } from '../CognitoIdentityClient';
import { DEFAULT_CONFIG } from '../../test-utils/test-utils';

const mockGetId = jest.fn();
const getCredentials = jest.fn();

jest.mock('../CognitoIdentityClient', () => ({
    fromCognitoIdentityPool: jest.fn(),
    CognitoIdentityClient: jest.fn().mockImplementation(() => ({
        getId: mockGetId,
        getCredentialsForIdentity: getCredentials
    }))
}));

const IDENTITY_POOL_ID = 'us-west-2:a-b-c-d';
const GUEST_ROLE_ARN = 'arn:aws:iam::123:role/Unauth';

describe('EnhancedAuthentication tests', () => {
    beforeEach(() => {
        mockGetId.mockReset();
        getCredentials.mockReset();
        mockGetId.mockResolvedValue({
            IdentityId: 'mock'
        });
        getCredentials.mockResolvedValue({
            accessKeyId: 'x',
            secretAccessKey: 'y',
            sessionToken: 'z',
            expiration: new Date(Date.now() + 3600 * 1000)
        });
        (fromCognitoIdentityPool as any).mockReset();
        (fromCognitoIdentityPool as any).mockReturnValue(
            () =>
                new Promise<Credentials>((resolve) =>
                    resolve({
                        accessKeyId: 'x',
                        secretAccessKey: 'y',
                        sessionToken: 'z',
                        expiration: new Date(Date.now() + 3600 * 1000)
                    })
                )
        );
        localStorage.removeItem(CRED_KEY);
    });

    test('when credential is in localStorage then authentication chain retrieves credential from localStorage', async () => {
        // Init
        const expiration = new Date(Date.now() + 3600 * 1000);
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID
            }
        };

        const auth = new EnhancedAuthentication(config);

        localStorage.setItem(
            CRED_KEY,
            JSON.stringify({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c',
                expiration
            })
        );

        // Run
        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c'
            })
        );
    });

    test('when credential is corrupt then authentication chain retrieves credential from basic authflow', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };

        const auth = new EnhancedAuthentication(config);

        localStorage.setItem(CRED_KEY, 'corrupt');

        // Run
        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'x',
                secretAccessKey: 'y',
                sessionToken: 'z'
            })
        );
    });

    test('when credential is not in the store authentication chain retrieves credential from basic authflow', async () => {
        // Init
        const auth = new EnhancedAuthentication({
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID
            }
        });

        // Run
        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'x',
                secretAccessKey: 'y',
                sessionToken: 'z'
            })
        );
    });

    test('when credential expires then authentication chain retrieves credentials from basic authflow', async () => {
        // Init
        const expiration = new Date(0);
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };

        const auth = new EnhancedAuthentication(config);

        localStorage.setItem(
            CRED_KEY,
            JSON.stringify({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c',
                expiration
            })
        );

        // Run
        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'x',
                secretAccessKey: 'y',
                sessionToken: 'z'
            })
        );
    });

    test('when credential is retrieved from basic auth then next credential is retrieved from localStorage', async () => {
        // Init
        const expiration = new Date(Date.now() + 3600 * 1000);
        (fromCognitoIdentityPool as any)
            .mockReturnValueOnce(
                () =>
                    new Promise<Credentials>((resolve) =>
                        resolve({
                            accessKeyId: 'a',
                            secretAccessKey: 'b',
                            sessionToken: 'c',
                            expiration
                        })
                    )
            )
            .mockReturnValueOnce(
                () =>
                    new Promise<Credentials>((resolve) =>
                        resolve({
                            accessKeyId: 'x',
                            secretAccessKey: 'y',
                            sessionToken: 'z',
                            expiration
                        })
                    )
            );

        const auth = new EnhancedAuthentication({
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Run
        await auth.ChainAnonymousCredentialsProvider();
        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c',
                expiration
            })
        );
    });

    test('when getCredentialsForIdentity fails then throw an error', async () => {
        // Init
        mockGetId.mockImplementation(() => {
            throw new Error('mockGetId error');
        });

        const auth = new EnhancedAuthentication({
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect((auth: EnhancedAuthentication) => {
            auth.ChainAnonymousCredentialsProvider();
        }).toThrowError();
    });

    test('when getId fails then throw an error', async () => {
        // Init
        getCredentials.mockImplementation(() => {
            throw new Error('mockGetId error');
        });

        const auth = new EnhancedAuthentication({
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect((auth: EnhancedAuthentication) => {
            auth.ChainAnonymousCredentialsProvider();
        }).toThrowError();
    });

    test('when credential is in member then authentication chain retrieves credential from member', async () => {
        // Init
        const expiration = new Date(Date.now() + 3600 * 1000);
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new EnhancedAuthentication(config);

        // Run
        await auth.ChainAnonymousCredentialsProvider();

        localStorage.setItem(
            CRED_KEY,
            JSON.stringify({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c',
                expiration
            })
        );

        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'x',
                secretAccessKey: 'y',
                sessionToken: 'z'
            })
        );
    });

    test('when credentials expire in member variable then authentication chain retrieves credential from basic auth flow', async () => {
        // Init
        getCredentials
            .mockResolvedValueOnce({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c',
                expiration: new Date(0)
            })
            .mockResolvedValueOnce({
                accessKeyId: 'x',
                secretAccessKey: 'y',
                sessionToken: 'z',
                expiration: new Date(0)
            });
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new EnhancedAuthentication(config);

        // Run
        await auth.ChainAnonymousCredentialsProvider();
        const credentials = await auth.ChainAnonymousCredentialsProvider();

        // Assert
        expect(credentials).toEqual(
            expect.objectContaining({
                accessKeyId: 'x',
                secretAccessKey: 'y',
                sessionToken: 'z'
            })
        );
    });
});
