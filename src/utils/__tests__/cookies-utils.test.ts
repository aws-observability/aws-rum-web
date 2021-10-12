import * as utils from '../../utils/cookies-utils';

const COOKIE_FRE_FIX = 'rum_cookies_util_test';

describe('Cookies utils tests', () => {
    test('storeCookie()', async () => {
        // Init
        const cookieName = COOKIE_FRE_FIX + '_' + new Date().getTime();
        const cookieValue = new Date().toString();

        // Run
        utils.storeCookie(cookieName, cookieValue);

        // Assert
        expect(document.cookie).toEqual(cookieName + '=' + cookieValue);

        // Cleanup
        document.cookie =
            cookieName + '=; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    });

    test('when storeCookie() given ttl=0 then cookie immediately expires', async () => {
        // Init
        const cookieName = COOKIE_FRE_FIX + '_' + new Date().getTime();
        const cookieValue = 'value';

        // Run
        utils.storeCookie(cookieName, cookieValue, 0);

        // Assert
        expect(document.cookie).toBeFalsy();

        // Cleanup
        document.cookie =
            cookieName + '=; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    });

    test('when storeCookie() given ttl > 0 then cookie does not immediately expire', async () => {
        // Init
        const cookieName = COOKIE_FRE_FIX + '_' + new Date().getTime();
        const cookieValue = 'value';

        // Run
        utils.storeCookie(cookieName, cookieValue, 3600);

        // Assert
        expect(document.cookie).toBeTruthy();

        // Cleanup
        document.cookie =
            cookieName + '=; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    });

    test('getCookie() when document.cookie has only one cookie, return the correct cookie value', async () => {
        // Init
        const cookieName = COOKIE_FRE_FIX + '_' + new Date().getTime();
        const cookieValue = new Date().toString();
        document.cookie = cookieName + '=' + cookieValue;

        // Assert
        expect(utils.getCookie(cookieName)).toEqual(cookieValue);

        // Cleanup
        document.cookie =
            cookieName + '=; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    });

    test('getCookie() when document.cookie has more than one cookie, return the correct cookie value', async () => {
        // Init
        const cookieName1 = COOKIE_FRE_FIX + '_A';
        const cookieValue1 = new Date().toString();

        const cookieName2 = COOKIE_FRE_FIX + '_B';
        const cookieValue2 = new Date().toString();

        document.cookie = cookieName1 + '=' + cookieValue1;
        document.cookie = cookieName2 + '=' + cookieValue2;

        console.log(document.cookie);

        // Assert
        expect(utils.getCookie(cookieName1)).toEqual(cookieValue1);
        expect(utils.getCookie(cookieName2)).toEqual(cookieValue2);

        // Cleanup
        document.cookie =
            cookieName1 + '=; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie =
            cookieName2 + '=; Expires=Thu, 01 Jan 1970 00:00:01 GMT';
    });

    test('removeCookie()', async () => {
        // Init
        const cookieName = COOKIE_FRE_FIX + '_' + new Date().getTime();
        const cookieValue = new Date().toString();
        document.cookie = cookieName + '=' + cookieValue;

        // Run
        utils.removeCookie(cookieName);

        // Assert
        expect(document.cookie).toEqual('');
    });

    test('getCookieDomain() with root domain returns root domain', async () => {
        jest.spyOn(utils, 'storeCookie').mockImplementation(
            (
                name: string,
                value: string,
                expires?: number,
                domain?: string
            ) => {
                if (domain && domain === 'amazon.com') {
                    document.cookie = name + '=' + value;
                }
            }
        );

        // Init
        document.domain = 'amazon.com';

        // Assert
        expect(utils.getCookieDomain()).toEqual('amazon.com');
    });

    test('getCookieDomain() returns a root domain when given a sub-domain', async () => {
        jest.spyOn(utils, 'storeCookie').mockImplementation(
            (
                name: string,
                value: string,
                expires?: number,
                domain?: string
            ) => {
                if (domain && domain === 'amazon.com') {
                    document.cookie = name + '=' + value;
                }
            }
        );

        // Init
        document.domain = 'docs.aws.amazon.com';

        // Assert
        expect(utils.getCookieDomain()).toEqual('amazon.com');
    });

    test('getCookieDomain() returns localhost when given localhost domain', async () => {
        jest.spyOn(utils, 'storeCookie').mockImplementation(
            (
                name: string,
                value: string,
                expires?: number,
                domain?: string
            ) => {
                if (domain && domain === 'localhost') {
                    document.cookie = name + '=' + value;
                }
            }
        );

        // Init
        document.domain = 'localhost';

        // Assert
        expect(utils.getCookieDomain()).toEqual('localhost');
    });
});
