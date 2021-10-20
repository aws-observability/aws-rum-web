import { Authentication } from '../Authentication';
import { CRED_COOKIE_NAME } from '../../utils/constants';
import { removeCookie, storeCookie } from '../../utils/cookies-utils';
import { DEFAULT_CONFIG } from '../../test-utils/test-utils';

const assumeRole = jest.fn();
const mockGetId = jest.fn();
const mockGetIdToken = jest.fn();

jest.mock('../CognitoIdentityClient', () => ({
    CognitoIdentityClient: jest.fn().mockImplementation(() => ({
        getId: mockGetId,
        getOpenIdToken: mockGetIdToken
    }))
}));

jest.mock('../StsClient', () => ({
    StsClient: jest.fn().mockImplementation(() => ({
        assumeRoleWithWebIdentity: assumeRole
    }))
}));

const IDENTITY_POOL_ID = 'us-west-2:a-b-c-d';
const GUEST_ROLE_ARN = 'arn:aws:iam::123:role/Unauth';

describe('Authentication tests', () => {
    beforeEach(() => {
        // @ts-ignore
        mockGetId.mockReset();
        // @ts-ignore
        mockGetIdToken.mockReset();
        // @ts-ignore
        assumeRole.mockReset();
        mockGetId.mockResolvedValue({
            IdentityId: 'mock'
        });
        mockGetIdToken.mockResolvedValue({
            RoleArn: 'mockArn',
            RoleSessionName: 'mockName',
            WebIdentityToken: 'mockToken'
        });
        assumeRole.mockResolvedValue({
            accessKeyId: 'x',
            secretAccessKey: 'y',
            sessionToken: 'z'
        });
        removeCookie(CRED_COOKIE_NAME, DEFAULT_CONFIG.cookieAttributes);
    });

    // tslint:disable-next-line:max-line-length
    test('when auth cookie is in the store then authentication chain retrieves credentials from cookie', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new Authentication(config);

        storeCookie(
            CRED_COOKIE_NAME,
            btoa(
                JSON.stringify({
                    accessKeyId: 'a',
                    secretAccessKey: 'b',
                    sessionToken: 'c'
                })
            ),
            config.cookieAttributes
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
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new Authentication(config);

        storeCookie(
            CRED_COOKIE_NAME,
            JSON.stringify({
                accessKeyId: 'a',
                secretAccessKey: 'b',
                sessionToken: 'c'
            }),
            config.cookieAttributes
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
        const auth = new Authentication({
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
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
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: false,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new Authentication(config);
        storeCookie(CRED_COOKIE_NAME, 'a:b:c', config.cookieAttributes);

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
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: false,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new Authentication(config);
        storeCookie(
            CRED_COOKIE_NAME,
            'a:b:c',
            config.cookieAttributes,
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
        assumeRole
            .mockResolvedValueOnce({
                accessKeyId: 'a',
                expiration,
                secretAccessKey: 'b',
                sessionToken: 'c'
            })
            .mockResolvedValueOnce({
                accessKeyId: 'x',
                expiration,
                secretAccessKey: 'y',
                sessionToken: 'z'
            });

        const auth = new Authentication({
            ...DEFAULT_CONFIG,
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

    test('when assumeRole fails then throw error', async () => {
        assumeRole.mockImplementation(() => {
            throw new Error('assumeRole error');
        });
        // Init
        const auth = new Authentication({
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect(auth.ChainAnonymousCredentialsProvider()).toThrowError;
    });

    test('when mockGetId fails then throw error', async () => {
        mockGetId.mockImplementation(() => {
            throw new Error('mockGetId error');
        });
        // Init
        const auth = new Authentication({
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect(auth.ChainAnonymousCredentialsProvider()).toThrowError;
    });

    test('when mockGetIdToken fails then throw error', async () => {
        mockGetIdToken.mockImplementation(() => {
            throw new Error('mockGetId error');
        });
        // Init
        const auth = new Authentication({
            ...DEFAULT_CONFIG,
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
