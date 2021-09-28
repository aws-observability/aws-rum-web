/**
 * Stores a cookie.
 * @param name The cookie's name.
 * @param value The cookie's value.
 * @param ttl Time to live -- expiry date is current date + ttl (do not use with {@code expires}).
 * @param domain The domain where the cookie will be stored.
 * @param expires The expiry date for the cookie (do not use with {@code ttl})
 */
export const storeCookie = (
    name: string,
    value: string,
    ttl?: number,
    domain?: string,
    expires?: Date
) => {
    let cookie = name + '=';
    cookie += value || '';
    if (expires !== undefined) {
        cookie +=
            expires !== undefined ? '; Expires=' + expires.toUTCString() : '';
    } else if (ttl !== undefined) {
        cookie += '; Expires=' + getExpiryDate(ttl).toUTCString();
    }
    cookie += '; SameSite=Strict; Secure';
    cookie += domain ? '; Domain=' + domain : '';
    document.cookie = cookie;
};

/**
 * Returns the current date + TTL
 * @param ttl seconds to live
 */
export const getExpiryDate = (ttl: number): Date => {
    return new Date(new Date().getTime() + ttl * 1000);
};

/**
 * Removes a cookie by setting its expiry in the past.
 * @param name The cookie's name.
 */
export const removeCookie = (name: string, domain?: string) => {
    document.cookie =
        name +
        '=; Expires=' +
        new Date(0) +
        '; SameSite=Strict; Secure' +
        (domain ? '; Domain=' + domain : '');
};

/**
 * Get a cookie with a given name
 * @param name The cookie's name.
 */
export const getCookie = (name: string): string => {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const split = cookie.split('=');
        if (split[0] === name) {
            return split[1];
        }
    }
    return '';
};

/**
 * Finds the highest level (non-top-level) domain that can be used to store cookies.
 */
export const getCookieDomain = (): string => {
    if (!document.domain) {
        return '';
    }
    const subdomain = document.domain.split('.');
    for (
        let i = subdomain.length - 1, ts = Date.now().toString();
        i >= 0;
        i--
    ) {
        const cookieDomain = subdomain.slice(i).join('.');
        storeCookie(ts, ts, undefined, cookieDomain);
        if (getCookie(ts)) {
            removeCookie(ts, cookieDomain);
            return cookieDomain;
        }
    }
    return document.domain;
};
