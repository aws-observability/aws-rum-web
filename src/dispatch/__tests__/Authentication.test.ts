import { Authentication } from '../Authentication';
import { CRED_COOKIE_NAME } from '../../utils/constants';
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
        mockGetId.mockReset();
        mockGetIdToken.mockReset();
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
        localStorage.removeItem(CRED_COOKIE_NAME);
    });

    // tslint:disable-next-line:max-line-length
    test('when credential is in localStorage then authentication chain retrieves credential from localStorage', async () => {
        // Init
        const expiration = new Date(Date.now() + 3600 * 1000);
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new Authentication(config);

        localStorage.setItem(
            CRED_COOKIE_NAME,
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

    // tslint:disable-next-line:max-line-length
    test('when credential is corrupt then authentication chain retrieves credential from basic authflow', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };
        const auth = new Authentication(config);

        localStorage.setItem(CRED_COOKIE_NAME, 'corrupt');

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
    test('when credential is not in localStorage then authentication chain retrieves credential from basic authflow', async () => {
        // Init
        const auth = new Authentication({
            ...DEFAULT_CONFIG,
            ...{
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
    test('when credential expires then authentication chain retrieves credential from basic authflow', async () => {
        // Init
        const expiration = new Date(0);
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        };

        const auth = new Authentication(config);

        localStorage.setItem(
            CRED_COOKIE_NAME,
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

    // tslint:disable-next-line:max-line-length
    test('when credential is retrieved from basic auth then next credential is retrieved from localStorage', async () => {
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
                identityPoolId: IDENTITY_POOL_ID,
                guestRoleArn: GUEST_ROLE_ARN
            }
        });

        // Assert
        expect(auth.ChainAnonymousCredentialsProvider()).toThrowError;
    });
});
