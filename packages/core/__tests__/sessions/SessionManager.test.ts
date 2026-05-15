import {
    Attributes,
    NIL_UUID,
    Session,
    SessionManager
} from '@aws-rum/web-core/sessions/SessionManager';
import {
    getCookie,
    removeCookie,
    storeCookie
} from '@aws-rum/web-core/utils/cookies-utils';
import * as uuid from 'uuid';
import { navigationEvent } from '@aws-rum/web-core/test-utils/mock-data';
import { Config } from '@aws-rum/web-core/orchestration/config';
import * as configModule from '@aws-rum/web-core/orchestration/config';
import { mockRandom } from 'jest-mock-random';
import { PageManager } from '@aws-rum/web-core/sessions/PageManager';
import {
    SESSION_COOKIE_NAME,
    USER_COOKIE_NAME
} from '@aws-rum/web-core/utils/constants';
import {
    APPLICATION_ID,
    APP_MONITOR_DETAILS,
    DEFAULT_CONFIG,
    mockFetch
} from '@aws-rum/web-core/test-utils/test-utils';
import { SESSION_START_EVENT_TYPE } from '@aws-rum/web-core/plugins/utils/constant';

global.fetch = mockFetch;
const NAVIGATION = 'navigation';
const SESSION_COOKIE_EXPIRES = 30 * 60;

const MOBILE_USER_AGENT_META_DATA: Attributes = {
    browserLanguage: 'en-US',
    browserName: 'Mobile Safari',
    browserVersion: '13.0.1',
    osName: 'iOS',
    osVersion: '13.1.3',
    deviceType: 'mobile',
    platformType: 'web',
    domain: 'us-east-1.console.aws.amazon.com'
};

const MOBILE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Mobile/15E148 Safari/604.1';

const DESKTOP_USER_AGENT_META_DATA: Attributes = {
    browserLanguage: 'en-US',
    browserName: 'Chrome',
    browserVersion: '20.0.1132.57',
    osName: 'Mac OS',
    osVersion: '10.7.3',
    deviceType: 'desktop',
    platformType: 'web',
    domain: 'us-east-1.console.aws.amazon.com'
};

const DESKTOP_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11';

const mockRecord = jest.fn();

const defaultSessionManager = (config) => {
    return new SessionManager(
        APP_MONITOR_DETAILS,
        config,
        mockRecord,
        new PageManager(config, mockRecord)
    );
};

let navigatorCookieEnabled = true;
Object.defineProperty(window.navigator, 'cookieEnabled', {
    configurable: true,
    get: () => navigatorCookieEnabled
});

describe('SessionManager tests', () => {
    beforeEach(() => {
        window.performance.getEntriesByType = jest
            .fn()
            .mockImplementation((type) => {
                if (type === NAVIGATION) {
                    return [navigationEvent];
                }
            });

        // cookie enabled
        navigatorCookieEnabled = true;
        removeCookie(SESSION_COOKIE_NAME, DEFAULT_CONFIG.cookieAttributes);
        removeCookie(USER_COOKIE_NAME, DEFAULT_CONFIG.cookieAttributes);
        jest.useRealTimers(); // This avoids stack overflow to document.location.toString() in jest's mock browser environment
        mockRecord.mockClear();
    });

    test('When sessionId does not exist in cookie, then new sessionId is assigned', async () => {
        // Init
        const sessionManager = defaultSessionManager(DEFAULT_CONFIG);
        const session = sessionManager.getSession();

        // Assert
        expect(sessionManager.getSession().sessionId).toEqual(
            session.sessionId
        );
    });

    test('When sessionId exists in cookie, then it returns the existing sessionId', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };

        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(JSON.stringify({ sessionId, record: true })),
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );

        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        // Assert
        expect(sessionManager.getSession().sessionId).toEqual(sessionId);
    });

    test('when cookies are not allowed then getSession returns a new session', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: false }
        };
        const sessionManager = defaultSessionManager(config);

        // Assert
        expect(sessionManager.getSession().sessionId).not.toEqual(NIL_UUID);
    });

    test('when cookies are  allowed and existing session does not exist then getSession returns a new session', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };
        const sessionManager = defaultSessionManager(config);

        // Assert
        expect(sessionManager.getSession().sessionId).not.toEqual(NIL_UUID);
    });

    test('when cookies are enabled during runtime then getSession returns same sessionId', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: false }
        };
        const sessionManager = defaultSessionManager(config);

        const sessionA: Session = sessionManager.getSession();
        config.allowCookies = true;
        const sessionB: Session = sessionManager.getSession();

        // Assert
        expect(sessionA.sessionId).not.toEqual(NIL_UUID);
        expect(sessionB.sessionId).toEqual(sessionA.sessionId);
    });

    test('when cookies are disabled during runtime then getSession returns same sessionId', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };
        const sessionManager = defaultSessionManager(config);

        const sessionA: Session = sessionManager.getSession();
        config.allowCookies = false;
        const sessionB: Session = sessionManager.getSession();

        // Assert
        expect(sessionA.sessionId).not.toEqual(NIL_UUID);
        expect(sessionB.sessionId).toEqual(sessionA.sessionId);
    });

    test('when cookies are disabled during runtime and session expires then getSession returns new session', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ sessionLengthSeconds: 0, allowCookies: true }
        };
        const sessionManager = defaultSessionManager(config);

        const sessionA = sessionManager.getSession();
        config.allowCookies = false;
        const sessionB = sessionManager.getSession();

        // Assert
        expect(sessionA.sessionId).not.toEqual(NIL_UUID);
        expect(sessionB.sessionId).not.toEqual(sessionA.sessionId);
    });

    test('when cookies are enabled during runtime and session expires then getSession returns new session', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ sessionLengthSeconds: 0, allowCookies: false }
        };
        const sessionManager = defaultSessionManager(config);

        const sessionA = sessionManager.getSession();
        config.allowCookies = true;
        const sessionB = sessionManager.getSession();

        // Assert
        expect(sessionA.sessionId).not.toEqual(NIL_UUID);
        expect(sessionB.sessionId).not.toEqual(sessionA.sessionId);
    });

    test('when sessionId cookie is corrupt then getSession returns a new sessionId', async () => {
        // Init
        const sessionId = uuid.v4();
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };
        storeCookie(
            SESSION_COOKIE_NAME,
            sessionId,
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );

        const sessionManager = defaultSessionManager(config);

        // Run
        const newSessionId: string = sessionManager.getSession().sessionId;

        // Assert
        expect(newSessionId).toBeTruthy();
        expect(newSessionId).not.toEqual(sessionId);
    });

    test('When cookie is disabled, then sessionId is assigned from sessionManager', async () => {
        // Init
        navigatorCookieEnabled = false;
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        // Assert
        expect(sessionManager.getSession()).toBeTruthy();
    });

    test('When allowCookies is denied, then sessionId is assigned from sessionManager', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        // Assert
        expect(sessionManager.getSession()).toBeTruthy();
    });

    test('when cookies are disabled after being enabled then getSession returns the existing session', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };

        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(JSON.stringify({ sessionId, record: true })),
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );

        const sessionManager = defaultSessionManager(config);

        // Run
        const sessionA = sessionManager.getSession();
        config.allowCookies = false;
        const sessionB = sessionManager.getSession();

        // Assert
        expect(sessionId).toEqual(sessionA.sessionId);
        expect(sessionB.sessionId).toEqual(sessionA.sessionId);
    });

    // start
    test('When userId does not exist in cookie, then new userId is assigned', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ userIdRetentionDays: 90 }
        });
        const userId = sessionManager.getUserId();

        // Assert
        expect(sessionManager.getUserId()).toEqual(userId);
    });

    test('When userId exists in cookie, then it returns the same userId', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        };
        const userId = uuid.v4();
        storeCookie(
            USER_COOKIE_NAME,
            userId,
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        });

        // Assert
        expect(sessionManager.getUserId()).toEqual(userId);
    });

    test('When cookie is disabled, then userId is assigned from sessionManager', async () => {
        // Init
        navigatorCookieEnabled = false;
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ userIdRetentionDays: 90 }
        });

        // Assert
        expect(sessionManager.getUserId()).toBeTruthy();
    });

    test('When allowCookies is denied, then userId is assigned from sessionManager', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        });

        // Assert
        expect(sessionManager.getUserId()).toBeTruthy();
    });

    test('when cookies are disabled after being enabled then the userId reverts to nil', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        };
        const userId = uuid.v4();
        storeCookie(
            USER_COOKIE_NAME,
            userId,
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );
        const sessionManager = defaultSessionManager(config);

        // Run
        const userIdFromCookie = sessionManager.getUserId();
        config.allowCookies = false;
        const userIdFromTracker = sessionManager.getUserId();

        // Assert
        expect(userId).toEqual(userIdFromCookie);
        expect(userIdFromTracker).toEqual(NIL_UUID);
    });

    test('when the sessionId cookie expires then a new sessionId is created', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionLengthSeconds: 0, allowCookies: true }
        });

        const sessionOne = sessionManager.getSession();
        const sessionTwo = sessionManager.getSession();

        // Assert
        expect(sessionOne.sessionId).not.toEqual(sessionTwo.sessionId);
    });

    test('When the sessionId cookie does not expire, sessionId remains the same', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            ...{ sessionLengthSeconds: 3600, allowCookies: true }
        };
        const sessionManager = new SessionManager(
            APP_MONITOR_DETAILS,
            config,
            mockRecord,
            new PageManager(config, mockRecord)
        );

        const sessionOne = sessionManager.getSession();
        const sessionTwo = sessionManager.getSession();

        // Assert
        expect(sessionOne.sessionId).toEqual(sessionTwo.sessionId);
    });

    test('when a new session starts then the session start event is emitted', async () => {
        // init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        sessionManager.getSession();

        // Assert
        expect(mockRecord).toHaveBeenCalledTimes(1);
        expect(mockRecord).toHaveBeenCalledWith(SESSION_START_EVENT_TYPE, {
            version: '1.0.0'
        });
    });

    test('when a session is resumed then the session start event is not emitted', async () => {
        // init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };
        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(
                JSON.stringify({
                    sessionId,
                    record: true,
                    eventCount: 1,
                    page: {
                        pageId: '/console/home',
                        interaction: 1
                    }
                })
            ),
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );
        const sessionManager = defaultSessionManager(config);

        sessionManager.getSession();

        // Assert
        expect(mockRecord).toHaveBeenCalledTimes(0);
    });

    test('when sessionSampleRate is one then session.record is true', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 1, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeTruthy();
        expect(sessionManager.isSampled()).toBeTruthy();
    });

    test('when sessionSampleRate is zero then session.record is false', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 0, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeFalsy();
        expect(sessionManager.isSampled()).toBeFalsy();
    });

    test('when sessionId is nil then create new session with same sampling decision', async () => {
        mockRandom([0.01]);
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 0.5, allowCookies: true }
        });

        // Ensure isSampled() returns a different value
        mockRandom([0.99]);
        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeTruthy();
        expect(sessionManager.isSampled()).toBeTruthy();
    });

    test('when sessionId is not nil then create new session with different sampling decision', async () => {
        const dateNow = new Date();
        mockRandom([0.01]);
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 0.5 }
        });

        // create new session
        // new session should have same sampling decision as nil session
        let session = sessionManager.getSession();
        expect(session.sessionId).not.toEqual(NIL_UUID);
        expect(session.record).toBeTruthy();
        expect(sessionManager.isSampled()).toBeTruthy();

        // create new session after previous has expired
        jest.useFakeTimers();
        jest.setSystemTime(new Date(dateNow.getTime() + 86400000)); // set to 24 hours from current date

        // new session should have different sampling decision as previous session
        mockRandom([0.99]);
        session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeFalsy();
        expect(sessionManager.isSampled()).toBeFalsy();
    });

    test('when random value equals sessionSampleRate then session.record is false', async () => {
        // Init
        mockRandom([0.5]);
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 0.5, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeFalsy();
    });

    test('when when random value is less than sessionSampleRate then session.record is true', async () => {
        // Init
        mockRandom([0.4]);
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 0.5, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeTruthy();
    });

    test('when random value is greater than sessionSampleRate then session.record is false', async () => {
        // Init
        mockRandom([0.6]);
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ sessionSampleRate: 0.5, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeFalsy();
    });

    test('when getSession creates a new session then session.eventCount is zero', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.eventCount).toEqual(0);
    });

    test('when cookies are allowed then incrementSessionEventCount increments session.eventCount in cookie', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };
        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(JSON.stringify({ sessionId, record: true, eventCount: 1 })),
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );
        const sessionManager = defaultSessionManager(config);

        sessionManager.getSession();
        sessionManager.incrementSessionEventCount();
        const session = JSON.parse(atob(getCookie(SESSION_COOKIE_NAME)));

        // Assert
        expect(session.eventCount).toEqual(2);
    });

    test('when cookies are not allowed then incrementSessionEventCount increments session.eventCount in member', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: false }
        });

        sessionManager.getSession();
        sessionManager.incrementSessionEventCount();
        const session = sessionManager.getSession();

        // Assert
        expect(session.eventCount).toEqual(1);
    });

    test('session attributes include user agent', async () => {
        // Init
        jest.spyOn(configModule, 'userAgentDataProvider').mockReturnValue({
            browserName: 'Mobile Safari',
            browserVersion: '13.0.1',
            osName: 'iOS',
            osVersion: '13.1.3',
            deviceType: 'mobile'
        });

        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: false
        });

        // Run
        sessionManager.getSession();
        const attributes: Attributes = sessionManager.getAttributes();

        // Assert
        expect(attributes).toEqual(MOBILE_USER_AGENT_META_DATA);
    });

    test("when user agent has no device type, then device type is 'desktop'", async () => {
        // Init
        jest.spyOn(configModule, 'userAgentDataProvider').mockReturnValue({
            browserName: 'Chrome',
            browserVersion: '20.0.1132.57',
            osName: 'Mac OS',
            osVersion: '10.7.3',
            deviceType: 'desktop'
        });

        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: false
        });

        // Run
        sessionManager.getSession();
        const attributes: Attributes = sessionManager.getAttributes();

        // Assert
        expect(attributes).toEqual(DESKTOP_USER_AGENT_META_DATA);
    });

    test('when no userAgentData available, UA fields are undefined and raw userAgent is set', async () => {
        // Init
        jest.spyOn(configModule, 'userAgentDataProvider').mockReturnValue(
            undefined
        );

        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: false
        });

        // Run
        sessionManager.getSession();
        const attributes: Attributes = sessionManager.getAttributes();

        // Assert
        expect(attributes.browserName).toBeUndefined();
        expect(attributes.browserVersion).toBeUndefined();
        expect(attributes.osName).toBeUndefined();
        expect(attributes.osVersion).toBeUndefined();
        expect(attributes.deviceType).toEqual('desktop');
        expect(attributes['aws:userAgent']).toEqual(navigator.userAgent);
    });

    test('when userAgentData is available, uses userAgentData', async () => {
        // Init
        jest.spyOn(configModule, 'userAgentDataProvider').mockReturnValue({
            browserName: 'Google Chrome',
            browserVersion: '144',
            osName: 'macOS',
            deviceType: 'desktop'
        });

        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: false
        });

        // Run
        sessionManager.getSession();
        const attributes: Attributes = sessionManager.getAttributes();

        // Assert
        expect(attributes.browserName).toEqual('Google Chrome');
        expect(attributes.browserVersion).toEqual('144');
        expect(attributes.osName).toEqual('macOS');
        expect(attributes.osVersion).toBeUndefined();
        expect(attributes.deviceType).toEqual('desktop');
        expect(attributes['aws:userAgent']).toBeUndefined();
    });

    test('userIdRetentionDays defaults to zero and the the nil UUID', async () => {
        // Init
        const sessionManager = defaultSessionManager(DEFAULT_CONFIG);

        // Assert
        expect(sessionManager.getUserId()).toEqual(NIL_UUID);
    });

    test('when userIdRetentionDays is zero then the user ID is the nil UUID', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ userIdRetentionDays: 0 }
        });

        // Assert
        expect(sessionManager.getUserId()).toEqual(NIL_UUID);
    });

    test('when userIdRetentionDays is zero then the user ID is not read from or written to a cookie', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, userIdRetentionDays: 0 }
        };
        const userId = uuid.v4();
        storeCookie(
            USER_COOKIE_NAME,
            userId,
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );

        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, userIdRetentionDays: 0 }
        });

        const userIdFromCookie = getCookie(USER_COOKIE_NAME);

        // Assert
        expect(sessionManager.getUserId()).toEqual(NIL_UUID);
        expect(userId).toEqual(userIdFromCookie);
    });

    test('when cookies are enabled after initialization then renewing the session stores user ID cookie', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: false, userIdRetentionDays: 1 }
        };

        const sessionManager = defaultSessionManager(config);

        sessionManager.getSession();
        const userIdFromCookie1 = getCookie(USER_COOKIE_NAME);
        config.allowCookies = true;
        sessionManager.incrementSessionEventCount();
        const userIdFromCookie2 = getCookie(USER_COOKIE_NAME);

        // Assert
        expect(userIdFromCookie1).toEqual('');
        expect(userIdFromCookie2).toEqual(sessionManager.getUserId());
    });

    test('when unique cookie names are used then the application id is appended to the cookie names', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                userIdRetentionDays: 1,
                cookieAttributes: {
                    ...DEFAULT_CONFIG.cookieAttributes,
                    ...{ unique: true }
                }
            }
        };

        const sessionManager = defaultSessionManager(config);

        sessionManager.getSession();
        const sessionIdFromCookie = JSON.parse(
            atob(getCookie(`${SESSION_COOKIE_NAME}_${APPLICATION_ID}`))
        ).sessionId;

        // Assert
        expect(sessionIdFromCookie).toEqual(
            sessionManager.getSession().sessionId
        );
    });

    test('when custom session attributes are set at initialization then custom session attributes are added to the session attributes', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{
                sessionAttributes: {
                    customAttributeString: 'customPageAttributeValue',
                    customAttributeNumber: 1,
                    customAttributeBoolean: true
                }
            }
        });

        const sessionAttributes = sessionManager.getAttributes();

        // Assert
        expect(sessionAttributes.customAttributeString).toEqual(
            'customPageAttributeValue'
        );
        expect(sessionAttributes.customAttributeNumber).toEqual(1);
        expect(sessionAttributes.customAttributeBoolean).toEqual(true);
    });

    test('when custom session attributes are set at runtime then custom session attributes are added to the session attributes', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG
        });

        const sessionAttributes = {
            customAttributeString: 'customPageAttributeValue',
            customAttributeNumber: 1,
            customAttributeBoolean: true
        };

        sessionManager.addSessionAttributes(sessionAttributes);

        const actualSessionAttributes = sessionManager.getAttributes();

        // Assert
        expect(actualSessionAttributes.customAttributeString).toEqual(
            'customPageAttributeValue'
        );
        expect(actualSessionAttributes.customAttributeNumber).toEqual(1);
        expect(actualSessionAttributes.customAttributeBoolean).toEqual(true);
    });

    test('when domain is in custom session attributes then domain is overridden', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG
        });

        const sessionAttributes = {
            domain: 'preferred.domain'
        };

        sessionManager.addSessionAttributes(sessionAttributes);

        const actualSessionAttributes = sessionManager.getAttributes();

        // Assert
        expect(actualSessionAttributes.domain).toEqual(
            sessionAttributes.domain
        );
    });

    test('when custom session attributes have the same key as built in attributies then custom session attributes are used', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG
        });

        const sessionAttributes = {
            title: 'override'
        };

        sessionManager.addSessionAttributes(sessionAttributes);

        const actualSessionAttributes = sessionManager.getAttributes();

        // Assert
        expect(actualSessionAttributes.title).toEqual(sessionAttributes.title);
    });

    test('when initiated with aws:releaseId then it is in the attributes', async () => {
        const releaseId = '2.1.7';
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            releaseId
        });

        const actualSessionAttributes = sessionManager.getAttributes();
        expect(actualSessionAttributes['aws:releaseId']).toBe(releaseId);
    });

    test('when initiated without aws:releaseId then it is NOT in the attributes', async () => {
        const sessionManager = defaultSessionManager(DEFAULT_CONFIG);

        const actualSessionAttributes = sessionManager.getAttributes();
        expect(actualSessionAttributes['aws:releaseId']).toBeUndefined();
    });

    test('when config.sessionId is set then getSession returns the seeded id and does not emit session_start', async () => {
        const seeded = 'seeded-session-id';
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            sessionId: seeded
        });

        expect(sessionManager.getSession().sessionId).toEqual(seeded);
        expect(mockRecord).not.toHaveBeenCalled();
    });

    test('when config.sessionId is set with a stale cookie then the seed wins', async () => {
        const config = {
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        };
        const cookieSessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(
                JSON.stringify({
                    sessionId: cookieSessionId,
                    record: true,
                    eventCount: 0
                })
            ),
            config.cookieAttributes,
            SESSION_COOKIE_EXPIRES
        );

        const seeded = 'seeded-session-id';
        const sessionManager = defaultSessionManager({
            ...config,
            sessionId: seeded
        });

        expect(sessionManager.getSession().sessionId).toEqual(seeded);
    });

    test('setSessionId mutates sessionId, resets eventCount, and does not emit session_start', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        sessionManager.getSession();
        sessionManager.incrementSessionEventCount();
        expect(mockRecord).toHaveBeenCalledTimes(1); // initial session_start
        mockRecord.mockClear();

        const adopted = 'adopted-session-id';
        sessionManager.setSessionId(adopted);

        const session = sessionManager.getSession();
        expect(session.sessionId).toEqual(adopted);
        expect(session.eventCount).toEqual(0);
        expect(mockRecord).not.toHaveBeenCalled();
    });

    test('setSessionId persists the adopted id to cookie when cookies are allowed', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        const adopted = 'adopted-session-id';
        sessionManager.setSessionId(adopted);

        const cookie = getCookie(SESSION_COOKIE_NAME);
        expect(cookie).toBeTruthy();
        const persisted = JSON.parse(atob(cookie));
        expect(persisted.sessionId).toEqual(adopted);
    });

    test('setSessionId with empty string is a no-op', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true }
        });

        const before = sessionManager.getSession().sessionId;
        mockRecord.mockClear();

        sessionManager.setSessionId('');

        expect(sessionManager.getSession().sessionId).toEqual(before);
        expect(mockRecord).not.toHaveBeenCalled();
    });

    test('when suppressSessionStartEvent is true then session_start is not emitted', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            ...{ allowCookies: true, suppressSessionStartEvent: true }
        });

        sessionManager.getSession();

        expect(mockRecord).not.toHaveBeenCalled();
    });

    test('when seeded session expires then sessionId stays the same', async () => {
        const dateNow = new Date();
        const seeded = 'seeded-session-id';
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            sessionId: seeded,
            sessionLengthSeconds: 1
        });

        const sessionA = sessionManager.getSession();
        expect(sessionA.sessionId).toEqual(seeded);

        // Advance past expiry.
        jest.useFakeTimers();
        jest.setSystemTime(new Date(dateNow.getTime() + 60000));

        const sessionB = sessionManager.getSession();
        expect(sessionB.sessionId).toEqual(seeded);
        // Frozen renewal must not fire session_start.
        expect(mockRecord).not.toHaveBeenCalled();
        jest.useRealTimers();
    });

    test('when seeded host calls setSessionId then subsequent getSession returns the new id', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            sessionId: 'first-id'
        });

        expect(sessionManager.getSession().sessionId).toEqual('first-id');

        sessionManager.setSessionId('second-id');

        expect(sessionManager.getSession().sessionId).toEqual('second-id');
    });

    test('when seeded then session_start is never emitted across construction, expiry, and rotation', async () => {
        const dateNow = new Date();
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            sessionId: 'seeded',
            sessionLengthSeconds: 1
        });

        sessionManager.getSession();

        jest.useFakeTimers();
        jest.setSystemTime(new Date(dateNow.getTime() + 60000));
        sessionManager.getSession();

        sessionManager.setSessionId('rotated');
        sessionManager.getSession();

        expect(mockRecord).not.toHaveBeenCalled();
        jest.useRealTimers();
    });

    test('when seeded session expires then eventCount resets so sessionEventLimit applies per logical session', async () => {
        const dateNow = new Date();
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            sessionId: 'seeded',
            sessionLengthSeconds: 1
        });

        sessionManager.getSession();
        sessionManager.incrementSessionEventCount();
        sessionManager.incrementSessionEventCount();
        expect(sessionManager.getSession().eventCount).toEqual(2);

        jest.useFakeTimers();
        jest.setSystemTime(new Date(dateNow.getTime() + 60000));

        expect(sessionManager.getSession().eventCount).toEqual(0);
        jest.useRealTimers();
    });

    test('when config.userId is set then getUserId returns the seeded id', async () => {
        const seeded = 'seeded-user-id';
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            userId: seeded
        });

        expect(sessionManager.getUserId()).toEqual(seeded);
    });

    test('when config.userId is set then it overrides userIdRetentionDays:0 NIL_UUID', async () => {
        const seeded = 'seeded-user-id';
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            userId: seeded,
            userIdRetentionDays: 0
        });

        expect(sessionManager.getUserId()).toEqual(seeded);
    });

    test('when config.userId is set with cookies allowed then it is persisted to cookie', async () => {
        const seeded = 'seeded-user-id';
        defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: true,
            userIdRetentionDays: 30,
            userId: seeded
        });

        expect(getCookie(USER_COOKIE_NAME)).toEqual(seeded);
    });

    test('when config.userId is set then getUserId returns it even with allowCookies false', async () => {
        const seeded = 'seeded-user-id';
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: false,
            userId: seeded
        });

        expect(sessionManager.getUserId()).toEqual(seeded);
    });

    test('setUserId mutates the user id and is reflected by getUserId', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: true,
            userIdRetentionDays: 30
        });

        const before = sessionManager.getUserId();
        const adopted = 'adopted-user-id';
        sessionManager.setUserId(adopted);

        expect(sessionManager.getUserId()).toEqual(adopted);
        expect(sessionManager.getUserId()).not.toEqual(before);
    });

    test('setUserId persists the adopted id to cookie when cookies are allowed', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: true,
            userIdRetentionDays: 30
        });

        const adopted = 'adopted-user-id';
        sessionManager.setUserId(adopted);

        expect(getCookie(USER_COOKIE_NAME)).toEqual(adopted);
    });

    test('setUserId with empty string is a no-op', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: true,
            userIdRetentionDays: 30
        });

        const before = sessionManager.getUserId();
        sessionManager.setUserId('');

        expect(sessionManager.getUserId()).toEqual(before);
    });

    test('manual user mode is sticky: setUserId then disabling cookies still returns the manual id', async () => {
        const sessionManager = defaultSessionManager({
            ...DEFAULT_CONFIG,
            allowCookies: true,
            userIdRetentionDays: 30
        });

        const adopted = 'adopted-user-id';
        sessionManager.setUserId(adopted);

        // Flip cookies off after manual mode is engaged.
        navigatorCookieEnabled = false;

        expect(sessionManager.getUserId()).toEqual(adopted);
    });
});
