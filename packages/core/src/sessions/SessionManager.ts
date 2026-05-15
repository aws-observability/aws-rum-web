import { storeCookie, getCookie } from '../utils/cookies-utils';

import { v4 } from 'uuid';
import { Config, userAgentDataProvider } from '../orchestration/config';
import { Page, PageManager } from './PageManager';
import { SESSION_COOKIE_NAME, USER_COOKIE_NAME } from '../utils/constants';
import { AppMonitorDetails } from '../dispatch/dataplane';
import { RecordEvent } from '../plugins/types';
import { SESSION_START_EVENT_TYPE } from '../plugins/utils/constant';
import { InternalLogger } from '../utils/InternalLogger';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const UNKNOWN = 'unknown';
export const DESKTOP_DEVICE_TYPE = 'desktop';
export const WEB_PLATFORM_TYPE = 'web';

export const RUM_SESSION_START = 'rum_session_start';
export const RUM_SESSION_EXPIRE = 'rum_session_expire';

export type Session = {
    sessionId: string;
    record: boolean;
    eventCount: number;
    page?: Page;
};

export type Attributes = {
    // The custom release id, to match a source map
    'aws:releaseId'?: string;
    browserLanguage: string;
    browserName?: string;
    browserVersion?: string;
    osName?: string;
    osVersion?: string;
    // Possible device types include {console, mobile, tablet, smarttv, wearable, embedded}. If the device
    // type is undefined, there was no information indicating the device is anything other than a desktop,
    // so we assume the device is a desktop.
    deviceType: string;
    // This client is used exclusively in web applications.
    platformType: string;
    // The fully qualified domain name (i.e., host name + domain name)
    domain: string;
    // Custom attribute value types are restricted to the types: string | number | boolean | undefined
    [k: string]: string | number | boolean | undefined;
};

/**
 * The session handler handles user id and session id.
 *
 * A session is the {user id, session id} tuple which groups events that occur on a single browser over a continuous
 * period of time. A session begins when no session exists or the last session has expired. If user id does not exist,
 * session handler will assign a new one and store it in cookie. If session id does not exist or has expired, session
 * handler will assign a new one and store it in cookie. Session handler detects user interactions and updates session
 * id expiration time.
 */
export class SessionManager {
    private pageManager: PageManager;

    private appMonitorDetails: AppMonitorDetails;
    private userExpiry!: Date;
    private sessionExpiry!: Date;
    private userId!: string;
    private session: Session;
    private config: Config;
    private recordEvent: RecordEvent;
    private attributes!: Attributes;
    private sessionCookieName: string;
    // Sticky for the life of the instance: when true, the host owns the
    // session ID and the SDK must never auto-mint one. Set when a sessionId
    // is seeded at construction.
    private isSessionIdManual = false;
    // Sticky for the life of the instance: when true, the host owns the
    // user ID. Seeded value wins over userIdRetentionDays:0 and the
    // useCookies() gate in getUserId().
    private isUserIdManual = false;

    constructor(
        appMonitorDetails: AppMonitorDetails,
        config: Config,
        recordEvent: RecordEvent,
        pageManager: PageManager
    ) {
        this.appMonitorDetails = appMonitorDetails;
        this.config = config;
        this.recordEvent = recordEvent;
        this.pageManager = pageManager;

        this.sessionCookieName = this.config.cookieAttributes.unique
            ? `${SESSION_COOKIE_NAME}_${this.appMonitorDetails.id}`
            : SESSION_COOKIE_NAME;

        // Initialize the session to the nil session
        this.session = {
            sessionId: NIL_UUID,
            record: this.sample(),
            eventCount: 0
        };

        // Initialize or restore the user. Skipped when config.userId is
        // seeded — adoptUser() below sets userId/userExpiry/cookie itself,
        // so initializeUser would just generate a discarded UUID and write
        // a cookie that adoptUser immediately overwrites.
        if (!this.config.userId) {
            this.initializeUser();
        }

        // Collect the user agent and domain
        this.collectAttributes();

        // Set custom session attributes
        this.addSessionAttributes(this.config.sessionAttributes);

        // Attempt to restore the previous session
        this.getSessionFromCookie();

        // A construct-time seed wins over any cookie-restored session: the
        // host has explicitly told us which logical session this instance
        // belongs to. Followers in multi-context deployments rely on this.
        // Once seeded, the SDK never auto-mints a session ID for this
        // instance — the host owns rotation via setSessionId().
        if (this.config.sessionId) {
            this.isSessionIdManual = true;
            this.adoptSession(this.config.sessionId);
        }

        // A construct-time seed for userId wins over the result of
        // initializeUser() — including the userIdRetentionDays:0 NIL_UUID
        // default. The host has explicitly named the identity.
        if (this.config.userId) {
            this.isUserIdManual = true;
            this.adoptUser(this.config.userId);
        }
    }

    /**
     * Returns true if the session is sampled, false otherwise.
     */
    public isSampled(): boolean {
        return this.session.record;
    }

    /**
     * Returns the session ID. If no session ID exists, one will be created.
     */
    public getSession(): Session {
        if (this.isSessionIdManual) {
            // Manual mode: host owns the sessionId for the life of the
            // instance. Never auto-mint, never rotate the ID — only the
            // expiry timestamp bumps. eventCount resets so the host-owned
            // session isn't permanently event-capped at sessionEventLimit
            // across long-lived sessions. The host rotates the ID itself
            // via setSessionId() when it wants a new logical session.
            if (new Date() >= this.sessionExpiry) {
                this.session.eventCount = 0;
                this.session.page = this.pageManager.getPage();
                this.sessionExpiry = new Date(
                    new Date().getTime() +
                        this.config.sessionLengthSeconds * 1000
                );
                this.storeSessionAsCookie();
            }
            return this.session;
        }

        if (this.session.sessionId === NIL_UUID) {
            // No session yet — create one.
            // If created before the page view is recorded, the session start
            // event metadata will not have page attributes as the page does
            // not exist yet.
            this.createSession();
        } else if (new Date() >= this.sessionExpiry) {
            this.createSession();
        }
        return this.session;
    }

    public getAttributes(): Attributes {
        return this.attributes;
    }

    /**
     * Adds custom session attributes to the session's attributes
     *
     * @param sessionAttributes object containing custom attribute data in the form of key, value pairs
     */
    public addSessionAttributes(sessionAttributes: {
        [k: string]: string | number | boolean;
    }) {
        this.attributes = { ...this.attributes, ...sessionAttributes };
    }

    /**
     * Adopt an externally-minted session ID. Subsequent events use this ID.
     * Does NOT emit session_start — followers must not duplicate the
     * leader's session_start. Sampling decision is preserved.
     *
     * Engages manual mode for the rest of the instance's lifespan: once a
     * host has called this, the SDK will not auto-mint a new session ID on
     * expiry. The host is the sole source of truth for rotation.
     */
    public setSessionId(sessionId: string): void {
        if (!sessionId) {
            InternalLogger.warn(
                'setSessionId called with empty value; ignoring.'
            );
            return;
        }
        this.isSessionIdManual = true;
        // Idempotent re-seeds (followers receiving periodic broadcasts of the
        // current ID) must not reset eventCount or sessionEventLimit could
        // be silently bypassed.
        if (sessionId === this.session.sessionId) {
            return;
        }
        this.adoptSession(sessionId);
    }

    /**
     * Begin a new session immediately. Use when the host knows a logical
     * session boundary has occurred (sign-in, sign-out, kiosk handoff)
     * and wants the next event to belong to a fresh session.
     *
     * Default behavior (no args) mints a fresh UUID, re-rolls sampling,
     * disengages session manual mode, and emits a session_start event
     * (subject to suppressSessionStartEvent). Returns the new session ID
     * for broadcast to follower contexts.
     *
     * Optional overrides let a leader hand a pre-chosen ID to the SDK and
     * rotate the user identity in the same call. `sessionId` adopts that
     * ID as the new session and engages session manual mode (same
     * stickiness as setSessionId). session_start is still emitted —
     * startSession is the leader-side rotation API; followers should keep
     * using setSessionId for silent adoption. `userId` rotates the user
     * identity (same stickiness as setUserId). No user_start event exists,
     * so the rotation is silent regardless.
     *
     * Empty-string overrides are rejected with a warn log; the existing
     * value is preserved and the rest of the call still proceeds.
     */
    public startSession(options?: {
        sessionId?: string;
        userId?: string;
    }): string {
        if (options?.userId !== undefined) {
            if (!options.userId) {
                InternalLogger.warn(
                    'startSession called with empty userId; ignoring user rotation.'
                );
            } else {
                this.isUserIdManual = true;
                if (options.userId !== this.userId) {
                    this.adoptUser(options.userId);
                }
            }
        }

        if (options?.sessionId !== undefined) {
            if (!options.sessionId) {
                InternalLogger.warn(
                    'startSession called with empty sessionId; minting a fresh session.'
                );
                this.isSessionIdManual = false;
                this.createSession();
            } else {
                this.isSessionIdManual = true;
                this.adoptSession(options.sessionId);
                if (!this.config.suppressSessionStartEvent) {
                    this.recordEvent(SESSION_START_EVENT_TYPE, {
                        version: '1.0.0'
                    });
                }
            }
        } else {
            this.isSessionIdManual = false;
            this.createSession();
        }

        return this.session.sessionId;
    }

    public getUserId(): string {
        if (this.isUserIdManual) {
            // Manual mode: host owns the identity. Return it regardless of
            // cookie availability — a host that explicitly seeded a userId
            // wants that identity even when cookies are disabled.
            return this.userId;
        }
        if (this.useCookies()) {
            return this.userId;
        }
        return NIL_UUID;
    }

    /**
     * Adopt an externally-supplied user ID. Subsequent UserDetails payloads
     * use this ID. Engages manual mode for the rest of the instance's
     * lifespan: once a host has called this, the host is the source of
     * truth for the user identity. No event is emitted (there is no
     * user_start analogue to session_start).
     */
    public setUserId(userId: string): void {
        if (!userId) {
            InternalLogger.warn('setUserId called with empty value; ignoring.');
            return;
        }
        this.isUserIdManual = true;
        // Idempotent re-seeds must be no-ops to avoid pointless cookie writes
        // and userExpiry refreshes when a follower receives the current ID.
        if (userId === this.userId) {
            return;
        }
        this.adoptUser(userId);
    }

    public incrementSessionEventCount() {
        this.session.eventCount++;
        this.renewSession();
    }

    public isLimitExceeded() {
        return (
            this.session.eventCount >= this.config.sessionEventLimit &&
            this.config.sessionEventLimit > 0
        );
    }

    public canRecord() {
        return this.session.record && !this.isLimitExceeded();
    }

    private initializeUser() {
        let userId = '';
        this.userExpiry = new Date();
        this.userExpiry.setDate(
            this.userExpiry.getDate() + this.config.userIdRetentionDays
        );

        if (this.config.userIdRetentionDays <= 0) {
            // Use the 'nil' UUID when the user ID will not be retained
            this.userId = '00000000-0000-0000-0000-000000000000';
        } else if (this.useCookies()) {
            userId = this.getUserIdCookie();
            this.userId = userId ? userId : v4();
            this.createOrRenewUserCookie(userId, this.userExpiry);
        } else {
            this.userId = v4();
        }
    }

    private createOrRenewSessionCookie(session: Session, expires: Date) {
        if (btoa) {
            storeCookie(
                this.sessionCookieName,
                btoa(JSON.stringify(session)),
                this.config.cookieAttributes,
                undefined,
                expires
            );
        }
    }

    private createOrRenewUserCookie(userId: string, expires: Date) {
        storeCookie(
            USER_COOKIE_NAME,
            userId,
            this.config.cookieAttributes,
            undefined,
            expires
        );
    }

    private getUserIdCookie() {
        return getCookie(USER_COOKIE_NAME);
    }

    private getSessionFromCookie() {
        if (this.useCookies()) {
            const cookie: string = getCookie(this.sessionCookieName);
            if (cookie && atob) {
                try {
                    this.session = JSON.parse(atob(cookie)) as Session;
                    this.pageManager.resumeSession(this.session.page);

                    InternalLogger.info(
                        `Restored session: ${this.session.sessionId}`
                    );
                } catch (e) {
                    // Error decoding or parsing the cookie -- ignore
                    InternalLogger.error('Failed to restore session', e);
                }
            }
        }
    }

    private storeSessionAsCookie() {
        if (this.useCookies() && this.config.userIdRetentionDays > 0) {
            this.createOrRenewUserCookie(this.userId, this.userExpiry);
        }

        if (this.useCookies()) {
            // Set the user cookie in case useCookies() has changed from false to true.
            this.createOrRenewSessionCookie(this.session, this.sessionExpiry);
        }
    }

    private createSession() {
        // The semantics of the nil session (created during initialization) are that there is no session.
        // We ensure the nil session and new session created right after initialization have the same sampling decision.
        // Otherwise, we will always reevaluate the sample decision.
        this.session = {
            sessionId: v4(),
            record:
                this.session.sessionId === NIL_UUID
                    ? this.session.record
                    : this.sample(),
            eventCount: 0
        };
        this.session.page = this.pageManager.getPage();
        this.sessionExpiry = new Date(
            new Date().getTime() + this.config.sessionLengthSeconds * 1000
        );
        this.storeSessionAsCookie();

        InternalLogger.info(`Session start: ${this.session.sessionId}`);

        if (!this.session.record) {
            InternalLogger.warn(
                `Session is NOT sampled. Consider increasing sessionSampleRate to avoid data loss (currently ${this.config.sessionSampleRate})`
            );
        }

        if (!this.config.suppressSessionStartEvent) {
            this.recordEvent(SESSION_START_EVENT_TYPE, {
                version: '1.0.0'
            });
        }
    }

    private adoptSession(sessionId: string) {
        this.session = {
            sessionId,
            record: this.session.record,
            eventCount: 0
        };
        this.session.page = this.pageManager.getPage();
        this.sessionExpiry = new Date(
            new Date().getTime() + this.config.sessionLengthSeconds * 1000
        );
        this.storeSessionAsCookie();
        InternalLogger.info(`Adopted session: ${sessionId}`);
    }

    private adoptUser(userId: string) {
        this.userId = userId;
        this.userExpiry = new Date();
        this.userExpiry.setDate(
            this.userExpiry.getDate() + this.config.userIdRetentionDays
        );
        if (this.useCookies() && this.config.userIdRetentionDays > 0) {
            this.createOrRenewUserCookie(this.userId, this.userExpiry);
        }
        InternalLogger.info(`Adopted user: ${userId}`);
    }

    private renewSession() {
        this.sessionExpiry = new Date(
            new Date().getTime() + this.config.sessionLengthSeconds * 1000
        );
        this.session.page = this.pageManager.getPage();
        this.storeSessionAsCookie();
    }

    private collectAttributes() {
        const ua = userAgentDataProvider();
        this.attributes = {
            browserLanguage: navigator.language,
            browserName: ua?.browserName,
            browserVersion: ua?.browserVersion,
            osName: ua?.osName,
            osVersion: ua?.osVersion,
            deviceType: ua?.deviceType ?? DESKTOP_DEVICE_TYPE,
            platformType: WEB_PLATFORM_TYPE,
            domain: window.location.hostname,
            'aws:releaseId': this.config.releaseId
        };
        // When userAgentData is not available (Firefox/Safari), include the
        // raw User-Agent string so the server can parse it.
        if (!ua) {
            this.attributes['aws:userAgent'] = navigator.userAgent;
        }
    }

    /**
     * Returns true when cookies should be used to store user ID and session ID.
     */
    private useCookies() {
        return navigator.cookieEnabled && this.config.allowCookies;
    }

    /**
     * Returns {@code true} when the session has been selected to be recorded.
     */
    private sample(): boolean {
        return Math.random() < this.config.sessionSampleRate;
    }
}
