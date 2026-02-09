import * as utils from '../../utils/cookies-utils';

const COOKIE_PREFIX = 'rum_cookies_util_test';

const COOKIE_ATTRIBUTES = {
    unique: false,
    domain: 'amazon.com',
    path: '/',
    sameSite: 'Strict',
    secure: true
};

describe('Cookies utils tests', () => {
    test('storeCookie()', async () => {
        // Init
        const cookieName = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue = new Date().toString();

        // Run
        utils.storeCookie(cookieName, cookieValue, COOKIE_ATTRIBUTES);

        // Assert
        expect(document.cookie).toEqual(cookieName + '=' + cookieValue);

        // Cleanup
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES);
    });

    test('when storeCookie() given ttl=0 then cookie immediately expires', async () => {
        // Init
        const cookieName = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue = 'value';

        // Run
        utils.storeCookie(cookieName, cookieValue, COOKIE_ATTRIBUTES, 0);

        // Assert
        expect(document.cookie).toBeFalsy();

        // Cleanup
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES);
    });

    test('when storeCookie() given ttl > 0 then cookie does not immediately expire', async () => {
        // Init
        const cookieName = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue = 'value';

        // Run
        utils.storeCookie(cookieName, cookieValue, COOKIE_ATTRIBUTES, 3600);

        // Assert
        expect(document.cookie).toBeTruthy();

        // Cleanup
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES);
    });

    test('storeCookie() cookies are stored under the domain', async () => {
        // Init
        const cookieName = COOKIE_PREFIX;
        const cookieValueA = 'valueA';
        const cookieValueB = 'valueB';

        const COOKIE_ATTRIBUTES_A = {
            unique: false,
            domain: 'amazon.com',
            path: '/',
            sameSite: 'Strict',
            secure: true
        };

        const COOKIE_ATTRIBUTES_B = {
            unique: false,
            domain: 'aws.amazon.com',
            path: '/',
            sameSite: 'Strict',
            secure: true
        };

        // Run
        utils.storeCookie(cookieName, cookieValueA, COOKIE_ATTRIBUTES_A, 3600);
        utils.storeCookie(cookieName, cookieValueB, COOKIE_ATTRIBUTES_B, 3600);

        // Assert
        const cookies: string[] = document.cookie.replace(' ', '').split(';');
        expect(cookies).toContain(`${COOKIE_PREFIX}=${cookieValueA}`);
        expect(cookies).toContain(`${COOKIE_PREFIX}=${cookieValueB}`);

        // Cleanup
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES_A);
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES_B);
    });

    test('storeCookie() cookies are stored under the path', async () => {
        // Init
        const cookieName = COOKIE_PREFIX;
        const cookieValueA = 'valueA';
        const cookieValueB = 'valueB';

        const COOKIE_ATTRIBUTES_A = {
            unique: false,
            domain: 'amazon.com',
            path: '/',
            sameSite: 'Strict',
            secure: true
        };

        const COOKIE_ATTRIBUTES_B = {
            unique: false,
            domain: 'amazon.com',
            path: '/console',
            sameSite: 'Strict',
            secure: true
        };

        // Run
        utils.storeCookie(cookieName, cookieValueA, COOKIE_ATTRIBUTES_A, 3600);
        utils.storeCookie(cookieName, cookieValueB, COOKIE_ATTRIBUTES_B, 3600);

        // Assert
        const cookies: string[] = document.cookie.replace(' ', '').split(';');
        expect(cookies).toContain(`${COOKIE_PREFIX}=${cookieValueA}`);
        expect(cookies).toContain(`${COOKIE_PREFIX}=${cookieValueB}`);

        // Cleanup
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES_A);
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES_B);
    });

    test('getCookie() when document.cookie has only one cookie, return the correct cookie value', async () => {
        // Init
        const cookieName = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue = 'value';

        // Run
        utils.storeCookie(cookieName, cookieValue, COOKIE_ATTRIBUTES, 3600);

        // Assert
        expect(utils.getCookie(cookieName)).toEqual(cookieValue);

        // Cleanup
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES);
    });

    test('getCookie() when document.cookie has more than one cookie, return the correct cookie value', async () => {
        // Init
        const cookieName1 = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue1 = new Date().toString();

        const cookieName2 = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue2 = new Date().toString();

        utils.storeCookie(cookieName1, cookieValue1, COOKIE_ATTRIBUTES, 3600);
        utils.storeCookie(cookieName2, cookieValue2, COOKIE_ATTRIBUTES, 3600);

        // Assert
        expect(utils.getCookie(cookieName1)).toEqual(cookieValue1);
        expect(utils.getCookie(cookieName2)).toEqual(cookieValue2);

        // Cleanup
        utils.removeCookie(cookieName1, COOKIE_ATTRIBUTES);
        utils.removeCookie(cookieName2, COOKIE_ATTRIBUTES);
    });

    test('removeCookie()', async () => {
        // Init
        const cookieName = COOKIE_PREFIX + '_' + new Date().getTime();
        const cookieValue = 'value';

        // Run
        utils.storeCookie(cookieName, cookieValue, COOKIE_ATTRIBUTES, 3600);

        // Run
        utils.removeCookie(cookieName, COOKIE_ATTRIBUTES);

        // Assert
        expect(document.cookie).toEqual('');
    });
});
