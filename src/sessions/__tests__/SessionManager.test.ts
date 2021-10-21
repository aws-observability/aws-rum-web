// tslint:disable:max-line-length
import {
    Attributes,
    NIL_UUID,
    SessionManager,
    SESSION_START_EVENT_TYPE
} from '../SessionManager';
import {
    getCookie,
    removeCookie,
    storeCookie
} from '../../utils/cookies-utils';
import * as uuid from 'uuid';
import { navigationEvent } from '../../test-utils/mock-data';
import { APPLICATION_ID } from '../../test-utils/test-utils';
import { Config, defaultConfig } from '../../orchestration/Orchestration';
import { mockRandom } from 'jest-mock-random';
import { PageManager, PAGE_VIEW_TYPE } from '../PageManager';
import { SESSION_COOKIE_NAME, USER_COOKIE_NAME } from '../../utils/constants';

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
        APPLICATION_ID,
        config,
        mockRecord,
        new PageManager(config, mockRecord)
    );
};

describe('SessionManager tests', () => {
    beforeEach(async () => {
        window.performance.getEntriesByType = jest
            .fn()
            .mockImplementation((type) => {
                if (type === NAVIGATION) {
                    return [navigationEvent];
                }
            });

        // cookie enabled
        setNavigatorCookieEnabled(true);

        removeCookie(SESSION_COOKIE_NAME);
        removeCookie(USER_COOKIE_NAME);

        mockRecord.mockClear();
    });

    const setNavigatorCookieEnabled = (isEnabled: boolean) => {
        Object.defineProperty(window.navigator, 'cookieEnabled', {
            writable: true,
            value: isEnabled
        });
    };

    test('When sessionId does not exist in cookie, then new sessionId is assigned', async () => {
        // Init
        const sessionManager = defaultSessionManager(defaultConfig);
        const session = sessionManager.getSession();

        // Assert
        expect(sessionManager.getSession().sessionId).toEqual(
            session.sessionId
        );
    });

    test('When sessionId exists in cookie, then it returns the existing sessionId', async () => {
        // Init
        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(JSON.stringify({ sessionId, record: true })),
            SESSION_COOKIE_EXPIRES
        );

        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        // Assert
        expect(sessionManager.getSession().sessionId).toEqual(sessionId);
    });

    test('when sessionId cookie is corrupt then getSession returns a new sessionId', async () => {
        // Init
        const sessionId = uuid.v4();
        storeCookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_EXPIRES);

        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        // Run
        const newSessionId: string = sessionManager.getSession().sessionId;

        // Assert
        expect(newSessionId).toBeTruthy();
        expect(newSessionId).not.toEqual(sessionId);
    });

    test('When cookie is disabled, then sessionId is assigned from sessionManager', async () => {
        // Init
        setNavigatorCookieEnabled(false);
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        // Assert
        expect(sessionManager.getSession()).toBeTruthy();
    });

    test('When allowCookies is denied, then sessionId is assigned from sessionManager', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        // Assert
        expect(sessionManager.getSession()).toBeTruthy();
    });

    test('when cookies are disabled after being enabled then sessionId remains the same', async () => {
        // Init
        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(JSON.stringify({ sessionId, record: true })),
            SESSION_COOKIE_EXPIRES
        );

        const config: Config = {
            ...defaultConfig,
            ...{ allowCookies: true }
        };
        const sessionManager = defaultSessionManager(config);
        const sessionFromCookie = sessionManager.getSession();

        // Assert
        expect(sessionId).toEqual(sessionFromCookie.sessionId);

        // disallow
        config.allowCookies = false;

        const sessionFromRumClient = sessionManager.getSession();

        // Assert
        expect(sessionFromRumClient.sessionId).toEqual(
            sessionFromCookie.sessionId
        );
    });

    // start
    test('When userId does not exist in cookie, then new userId is assigned', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ userIdRetentionDays: 90 }
        });
        const userId = sessionManager.getUserId();

        // Assert
        expect(sessionManager.getUserId()).toEqual(userId);
    });

    test('When userId exists in cookie, then it returns the same userId', async () => {
        // Init
        const userId = uuid.v4();
        storeCookie(USER_COOKIE_NAME, userId, SESSION_COOKIE_EXPIRES);
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        });

        // Assert
        expect(sessionManager.getUserId()).toEqual(userId);
    });

    test('When cookie is disabled, then userId is assigned from sessionManager', async () => {
        // Init
        setNavigatorCookieEnabled(false);
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ userIdRetentionDays: 90 }
        });

        // Assert
        expect(sessionManager.getUserId()).toBeTruthy();
    });

    test('When allowCookies is denied, then userId is assigned from sessionManager', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        });

        // Assert
        expect(sessionManager.getUserId()).toBeTruthy();
    });

    test('When cookie is disabled or enabled, then userId value is consistent', async () => {
        // Init
        const userId = uuid.v4();
        storeCookie(USER_COOKIE_NAME, userId, SESSION_COOKIE_EXPIRES);
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        });

        let userIdFromCookie = sessionManager.getUserId(); // get value from cookie

        // Assert
        expect(userId).toEqual(userIdFromCookie);

        // disable cookie
        setNavigatorCookieEnabled(false);

        const userIdFromRumClient = sessionManager.getUserId(); // has to get value from RUM web client

        // Assert
        expect(userIdFromRumClient).toEqual(userIdFromCookie);

        // enableCookie
        setNavigatorCookieEnabled(true);

        userIdFromCookie = sessionManager.getUserId();

        // cookie and client should store same values
        expect(userIdFromCookie).toEqual(userIdFromRumClient);
    });

    test('when cookies are disabled after being enabled then the userId remains the same', async () => {
        // Init
        const userId = uuid.v4();
        storeCookie(USER_COOKIE_NAME, userId, SESSION_COOKIE_EXPIRES);
        const config: Config = {
            ...defaultConfig,
            ...{ allowCookies: true, userIdRetentionDays: 90 }
        };
        const sessionManager = defaultSessionManager(config);

        // Run
        const userIdFromCookie = sessionManager.getUserId();
        config.allowCookies = false;
        const userIdFromRumClient = sessionManager.getUserId();

        // Assert
        expect(userId).toEqual(userIdFromCookie);
        expect(userIdFromRumClient).toEqual(userIdFromCookie);
    });

    test('when the sessionId cookie expires then a new sessionId is created', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ sessionLengthSeconds: 0, allowCookies: true }
        });

        const sessionOne = sessionManager.getSession();
        // Wait a little extra time in case polyfill has added extra steps
        await new Promise((resolve) => setTimeout(resolve, 10));
        const sessionTwo = sessionManager.getSession();

        // Assert
        expect(sessionOne.sessionId).not.toEqual(sessionTwo.sessionId);
    });

    test('When the sessionId cookie does not expire, sessionId remains the same', async () => {
        // Init
        const config: Config = {
            ...defaultConfig,
            ...{ sessionLengthSeconds: 3600, allowCookies: true }
        };
        const sessionManager = new SessionManager(
            APPLICATION_ID,
            config,
            mockRecord,
            new PageManager(config, mockRecord)
        );

        const sessionOne = sessionManager.getSession();
        const sessionTwo = sessionManager.getSession();

        // Assert
        expect(sessionOne.sessionId).toEqual(sessionTwo.sessionId);
    });

    test('when a new session starts then the session start event and page view event are emitted', async () => {
        // init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        sessionManager.getSession();

        // Assert
        expect(mockRecord).toHaveBeenCalledTimes(2);
        expect(mockRecord.mock.calls[0][1]).toEqual(SESSION_START_EVENT_TYPE);
        expect(mockRecord.mock.calls[1][1]).toEqual(PAGE_VIEW_TYPE);
    });

    test('when a session is resumed then the session start event is not emitted', async () => {
        // init
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
            SESSION_COOKIE_EXPIRES
        );
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        sessionManager.getSession();

        // Assert
        expect(mockRecord).toHaveBeenCalledTimes(1);
        expect(mockRecord.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
    });

    test('when sessionSampleRate is one then session.record is true', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ sessionSampleRate: 1, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeTruthy();
    });

    test('when sessionSampleRate is zero then session.record is false', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ sessionSampleRate: 0, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeFalsy();
    });

    test('when random value equals sessionSampleRate then session.record is false', async () => {
        // Init
        mockRandom([0.5]);
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
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
            ...defaultConfig,
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
            ...defaultConfig,
            ...{ sessionSampleRate: 0.5, allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.record).toBeFalsy();
    });

    test('when getSession creates a new session then session.eventCount is zero', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        const session = sessionManager.getSession();

        // Assert
        expect(session.eventCount).toEqual(0);
    });

    test('when cookies are allowed then incrementSessionEventCount increments session.eventCount in cookie', async () => {
        // Init
        const sessionId = uuid.v4();
        storeCookie(
            SESSION_COOKIE_NAME,
            btoa(JSON.stringify({ sessionId, record: true, eventCount: 1 })),
            SESSION_COOKIE_EXPIRES
        );
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: true }
        });

        // tslint:disable:no-empty
        sessionManager.getSession();
        sessionManager.incrementSessionEventCount();
        const session = JSON.parse(atob(getCookie(SESSION_COOKIE_NAME)));

        // Assert
        expect(session.eventCount).toEqual(2);
    });

    test('when cookies are not allowed then incrementSessionEventCount increments session.eventCount in member', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
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
        Object.defineProperty(navigator, 'userAgent', {
            get() {
                return MOBILE_USER_AGENT;
            },
            configurable: true
        });

        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: false }
        });

        // Run
        sessionManager.getSession();
        const attributes: Attributes = sessionManager.getAttributes();

        // Assert
        expect(attributes).toEqual(MOBILE_USER_AGENT_META_DATA);
    });

    test("when user agent has no device type, then device type is 'desktop'", async () => {
        // Init
        Object.defineProperty(navigator, 'userAgent', {
            get() {
                return DESKTOP_USER_AGENT;
            },
            configurable: true
        });

        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ allowCookies: false }
        });

        // Run
        sessionManager.getSession();
        const attributes: Attributes = sessionManager.getAttributes();

        // Assert
        expect(attributes).toEqual(DESKTOP_USER_AGENT_META_DATA);
    });

    test('userIdRetentionDays defaults to zero and the the nil UUID', async () => {
        // Init
        const sessionManager = defaultSessionManager(defaultConfig);

        // Assert
        expect(sessionManager.getUserId()).toEqual(NIL_UUID);
    });

    test('when userIdRetentionDays is zero then the user ID is the nil UUID', async () => {
        // Init
        const sessionManager = defaultSessionManager({
            ...defaultConfig,
            ...{ userIdRetentionDays: 0 }
        });

        // Assert
        expect(sessionManager.getUserId()).toEqual(NIL_UUID);
    });

    test('when userIdRetentionDays is zero then the user ID is not read from or written to a cookie', async () => {
        // Init
        const userId = uuid.v4();
        storeCookie(USER_COOKIE_NAME, userId, SESSION_COOKIE_EXPIRES);

        const sessionManager = defaultSessionManager({
            ...defaultConfig,
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
            ...defaultConfig,
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
});
