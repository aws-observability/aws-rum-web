import {
    type InternalPluginContext,
    PluginManager,
    EventCache,
    Dispatch,
    type SigningConfigFactory,
    PageViewPlugin,
    type PageAttributes,
    type Plugin,
    type Config,
    type PartialConfig as CorePartialConfig,
    type CookieAttributes,
    type EventMetadata,
    type EventMetadataHook,
    INSTALL_MODULE,
    EventBus,
    Topic,
    InternalLogger,
    removeCookie,
    CRED_KEY,
    SESSION_COOKIE_NAME,
    USER_COOKIE_NAME
} from '@aws-rum/web-core';
import {
    AwsCredentialIdentityProvider,
    AwsCredentialIdentity
} from '@aws-sdk/types';

export {
    type Config,
    type CookieAttributes,
    type PageIdFormat
} from '@aws-rum/web-core';

/** Slim config — use `eventPluginsToLoad` for plugins. */
export type PartialConfig = CorePartialConfig;

export type PartialCookieAttributes = Partial<CookieAttributes>;

export enum PageIdFormatEnum {
    Path = 'PATH',
    Hash = 'HASH',
    PathAndHash = 'PATH_AND_HASH'
}

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

export const defaultCookieAttributes = (): CookieAttributes => {
    return {
        unique: false,
        domain: window.location.hostname,
        path: '/',
        sameSite: 'Strict',
        secure: true
    };
};

export const defaultConfig = (cookieAttributes: CookieAttributes): Config => {
    return {
        allowCookies: false,
        batchLimit: 100,
        client: INSTALL_MODULE,
        compressionStrategy: { enabled: true },
        cookieAttributes,
        debug: false,
        disableAutoPageView: false,
        dispatchInterval: 5 * 1000,
        enableRumClient: true,
        enableXRay: false,
        endpoint: DEFAULT_ENDPOINT,
        endpointUrl: new URL(DEFAULT_ENDPOINT),
        eventCacheSize: 1000,
        eventPluginsToLoad: [],
        pageIdFormat: PageIdFormatEnum.Path,
        pagesToExclude: [],
        pagesToInclude: [/.*/],
        signing: false,
        recordResourceUrl: true,
        retries: 2,
        routeChangeComplete: 100,
        routeChangeTimeout: 10000,
        sessionAttributes: {},
        sessionEventLimit: 200,
        sessionLengthSeconds: 60 * 30,
        sessionSampleRate: 1,
        suppressSessionStartEvent: false,
        useBeacon: true,
        userIdRetentionDays: 30,
        enableW3CTraceId: false,
        candidatesCacheSize: 10
    };
};

/**
 * Slim orchestrator — no auth/signing dependencies, no built-in telemetry plugins.
 *
 * Only PageViewPlugin loads by default. Pass additional plugins via
 * `eventPluginsToLoad` or call `addPlugin()` at runtime.
 *
 * Designed as a base class: `aws-rum-web` extends this to add auth,
 * signing, and the telemetries plugin system.
 */
export class Orchestration {
    protected pluginManager: PluginManager;
    protected eventCache: EventCache;
    protected dispatchManager: Dispatch;
    protected config: Config;
    protected eventBus = new EventBus<Topic>();
    protected applicationId: string;

    constructor(
        applicationId: string,
        applicationVersion: string,
        region: string,
        {
            cookieAttributes: configCookieAttributes,
            ...partialConfig
        }: PartialConfig = {}
    ) {
        if (typeof region === 'undefined') {
            region = 'us-west-2';
        }

        this.applicationId = applicationId;

        const cookieAttributes: CookieAttributes = {
            ...defaultCookieAttributes(),
            ...configCookieAttributes
        };

        this.config = {
            ...{ fetchFunction: fetch },
            ...defaultConfig(cookieAttributes),
            ...partialConfig
        } as Config;

        // Seeding sessionId at construction implies the host owns the
        // session lifecycle. Force-suppress session_start so a seeded
        // follower can never emit a duplicate of the leader's start event,
        // even if the caller forgot to set the flag.
        if (this.config.sessionId) {
            this.config.suppressSessionStartEvent = true;
        }

        this.config.endpoint = partialConfig.endpoint
            ? partialConfig.endpoint
            : DEFAULT_ENDPOINT.replace(DEFAULT_REGION, region);

        this.config.endpointUrl = new URL(this.config.endpoint);

        InternalLogger.configure(this.config.debug);

        InternalLogger.info('Initialized RUM Slim');

        this.eventCache = new EventCache(
            { id: applicationId, version: applicationVersion },
            this.config,
            this.eventBus
        );

        this.dispatchManager = this.initDispatch(region, applicationId);

        this.pluginManager = this.initPluginManager(
            applicationId,
            applicationVersion
        );
        this.eventCache.setPluginFlushHook(() => this.pluginManager.flush());

        if (this.config.enableRumClient) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Set the credential provider that will be used to authenticate with the
     * data plane service (AWS auth).
     */
    public setAwsCredentials(
        credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
    ): void {
        this.dispatchManager.setAwsCredentials(credentials);
    }

    /**
     * Set the factory used to create signing configurations.
     * NPM consumers can use this to opt into request signing.
     */
    public setSigningConfigFactory(factory: SigningConfigFactory): void {
        this.dispatchManager.setSigningConfigFactory(factory);
    }

    public addSessionAttributes(sessionAttributes: {
        [key: string]: string | boolean | number;
    }): void {
        this.eventCache.addSessionAttributes(sessionAttributes);
    }

    /**
     * Returns the current session ID, minting a new one if no session
     * exists. Use to read the leader's session ID for broadcast to
     * follower contexts (e.g. webview panels, micro-frontends, multiple
     * BrowserWindows).
     */
    public getSessionId(): string {
        return this.eventCache.getSessionId();
    }

    /**
     * Adopt an externally-minted session ID. Subsequent dispatches use
     * this ID. Already-buffered events inherit it at dispatch time —
     * sessionId rides on UserDetails per batch, not per event.
     *
     * Does NOT emit a session_start event; followers must not duplicate
     * the leader's session_start. Does NOT re-roll sampling. Empty values
     * are ignored with a warning; the existing ID is preserved.
     */
    public setSessionId(sessionId: string): void {
        this.eventCache.setSessionId(sessionId);
    }

    /**
     * Begin a new session immediately. Use at logical session boundaries
     * the SDK can't detect on its own — sign-in, sign-out, kiosk handoff.
     * Returns the new session ID for broadcast to follower contexts.
     *
     * No args: mints a fresh UUID, re-rolls sampling, disengages session
     * manual mode, and emits session_start (subject to
     * suppressSessionStartEvent).
     *
     * Optional `sessionId` adopts a host-chosen ID and engages manual
     * mode. Optional `userId` rotates the user identity in the same call
     * (same stickiness as setUserId). Empty-string overrides are rejected
     * with a warn log; the existing value is preserved.
     */
    public startSession(options?: {
        sessionId?: string;
        userId?: string;
    }): string {
        return this.eventCache.startSession(options);
    }

    /**
     * Returns the current anonymous user ID. Use to read the leader's
     * user ID for broadcast to follower contexts so a single human is
     * not counted as N anonymous users in CloudWatch RUM.
     *
     * Returns NIL_UUID when cookies are disabled and no userId has been
     * seeded or set via setUserId().
     */
    public getUserId(): string {
        return this.eventCache.getUserId();
    }

    /**
     * Adopt an externally-supplied user ID. Subsequent dispatches carry
     * this ID. Engages manual mode: the host becomes the source of truth
     * for the user identity, overriding the userIdRetentionDays:0
     * NIL_UUID default and the useCookies() gate.
     *
     * No event is emitted — there is no user_start analogue to
     * session_start. Empty values are ignored with a warning; the existing
     * ID is preserved.
     */
    public setUserId(userId: string): void {
        this.eventCache.setUserId(userId);
    }

    /**
     * Register a hook that decorates every recorded event's metadata.
     * Replaces any previously set hook. Manual metadata passed to
     * `recordEvent` always wins over hook output.
     */
    public setEventMetadataHook(hook: EventMetadataHook): void {
        this.eventCache.setEventMetadataHook(hook);
    }

    /** Remove a previously registered event metadata hook. */
    public clearEventMetadataHook(): void {
        this.eventCache.clearEventMetadataHook();
    }

    public addPlugin(plugin: Plugin): void {
        this.pluginManager.addPlugin(plugin);
    }

    public dispatch(): void {
        this.dispatchManager.dispatchFetch();
    }

    public dispatchBeacon(): void {
        this.dispatchManager.dispatchBeacon();
    }

    public enable(): void {
        this.eventCache.enable();
        this.pluginManager.enable();
        this.dispatchManager.enable();
    }

    public disable(): void {
        this.dispatchManager.disable();
        this.pluginManager.disable();
        this.eventCache.disable();
    }

    public allowCookies(allow: boolean) {
        this.config.allowCookies = allow;
    }

    /**
     * Purge all RUM cookies for this client (session, user, and cached
     * credentials), including the application-id-suffixed variants used
     * when `cookieAttributes.unique` is set. Intended for test setup so a
     * fresh page load starts a brand-new session.
     */
    public clearCookies(): void {
        const attrs = this.config.cookieAttributes;
        const names = [
            SESSION_COOKIE_NAME,
            USER_COOKIE_NAME,
            CRED_KEY,
            `${SESSION_COOKIE_NAME}_${this.applicationId}`,
            `${USER_COOKIE_NAME}_${this.applicationId}`,
            `${CRED_KEY}_${this.applicationId}`
        ];
        names.forEach((n) => removeCookie(n, attrs));
    }

    public recordPageView(payload: string | PageAttributes) {
        this.eventCache.recordPageView(payload);
    }

    public recordError(error: any) {
        this.pluginManager.record('com.amazonaws.rum.js-error', error);
    }

    public registerDomEvents(events: any[]) {
        this.pluginManager.updatePlugin('com.amazonaws.rum.dom-event', events);
    }

    public recordEvent(
        eventType: string,
        eventData: object,
        metadata?: EventMetadata
    ) {
        this.eventCache.recordEvent(eventType, eventData, metadata);
    }

    protected initDispatch(region: string, applicationId: string): Dispatch {
        return new Dispatch(
            applicationId,
            region,
            this.config.endpointUrl,
            this.eventCache,
            this.config
        );
    }

    protected initPluginManager(
        applicationId: string,
        applicationVersion: string
    ): PluginManager {
        const pluginContext: InternalPluginContext = {
            applicationId,
            applicationVersion,
            config: this.config,
            record: this.eventCache.recordEvent,
            recordCandidate: this.eventCache.recordCandidate,
            recordPageView: this.eventCache.recordPageView,
            getSession: this.eventCache.getSession,
            eventBus: this.eventBus
        };

        const pluginManager: PluginManager = new PluginManager(pluginContext);

        if (!this.config.disableAutoPageView) {
            pluginManager.addPlugin(new PageViewPlugin());
        }

        this.config.eventPluginsToLoad.forEach((p) => {
            pluginManager.addPlugin(p);
        });

        return pluginManager;
    }
}
