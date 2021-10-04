import { CRED_COOKIE_NAME } from '../../utils/constants';
import { Credentials } from '@aws-sdk/types';
import { EnhancedAuthentication } from '../EnhancedAuthentication';
import { defaultConfig } from '../../orchestration/Orchestration';
import { fromCognitoIdentityPool } from '../CognitoIdentityClient';
import { removeCookie, storeCookie } from '../../utils/cookies-utils';

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
        // @ts-ignore
        mockGetId.mockReset();
        // @ts-ignore
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
        // @ts-ignore
        fromCognitoIdentityPool.mockReset();
        // @ts-ignore
        fromCognitoIdentityPool.mockReturnValue(
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
        removeCookie(CRED_COOKIE_NAME);
    });

    // tslint:disable-next-line:max-line-length
    test('when auth cookie is in the store then authentication chain retrieves credentials from cookie', async () => {
        // Init
        const auth = new EnhancedAuthentication({
            ...defaultConfig,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID
            }
        });

        storeCookie(
            CRED_COOKIE_NAME,
            btoa(
                JSON.stringify({
                    accessKeyId: 'a',
                    secretAccessKey: 'b',
                    sessionToken: 'c'
                })
            )
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

    // tslint:disable-next-line:max-line-length
    test('when auth cookie corrupt then authentication chain retrieves credentials from basic authflow', async () => {
        // Init
        const auth = new EnhancedAuthentication({
            ...defaultConfig,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        storeCookie(
            CRED_COOKIE_NAME,
            JSON.stringify({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c'
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

    // tslint:disable-next-line:max-line-length
    test('when auth cookie is not in the store authentication chain retrieves credentials from basic authflow', async () => {
        // Init
        const auth = new EnhancedAuthentication({
            ...defaultConfig,
            ...{
                allowCookies: true,
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

    // tslint:disable-next-line:max-line-length
    test('when cookies are not allowed then authentication chain retrieves credentials from basic authflow', async () => {
        // Init
        const auth = new EnhancedAuthentication({
            ...defaultConfig,
            ...{
                allowCookies: false,
                identityPoolId: IDENTITY_POOL_ID
            }
        });
        storeCookie(CRED_COOKIE_NAME, 'a:b:c');

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

    // tslint:disable-next-line:max-line-length
    test('when cookie expires then authentication chain retrieves credentials from basic authflow', async () => {
        // Init
        const auth = new EnhancedAuthentication({
            ...defaultConfig,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });
        storeCookie(
            CRED_COOKIE_NAME,
            'a:b:c',
            undefined,
            undefined,
            new Date(0)
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

    // tslint:disable-next-line:max-line-length
    test('when credential is retrieved from basic auth then next credential is retrieved from cookie store', async () => {
        // Init
        const expiration = new Date(Date.now() + 3600 * 1000);
        fromCognitoIdentityPool
            // @ts-ignore
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
            ...defaultConfig,
            ...{
                allowCookies: true,
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
            ...defaultConfig,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect(auth.ChainAnonymousCredentialsProvider()).toThrowError;
    });

    test('when getId fails then throw an error', async () => {
        // Init
        getCredentials.mockImplementation(() => {
            throw new Error('mockGetId error');
        });

        const auth = new EnhancedAuthentication({
            ...defaultConfig,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect(auth.ChainAnonymousCredentialsProvider()).toThrowError;
    });
});
