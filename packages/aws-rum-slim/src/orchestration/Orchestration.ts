import { InternalPluginContext } from '@aws-rum-web/core/plugins/types';
import { PluginManager } from '@aws-rum-web/core/plugins/PluginManager';
import { EventCache } from '@aws-rum-web/core/event-cache/EventCache';
import { Dispatch } from '@aws-rum-web/core/dispatch/Dispatch';
import { PageViewPlugin } from '@aws-rum-web/core/plugins/event-plugins/PageViewPlugin';
import { PageAttributes } from '@aws-rum-web/core/sessions/PageManager';
import { INSTALL_MODULE } from '@aws-rum-web/core/utils/constants';
import EventBus, { Topic } from '@aws-rum-web/core/event-bus/EventBus';
import { InternalLogger } from '@aws-rum-web/core/utils/InternalLogger';
import { Plugin } from '@aws-rum-web/core/plugins/Plugin';
import {
    type Config,
    type PartialConfig,
    type CookieAttributes,
    userAgentDataProvider
} from '@aws-rum-web/core/orchestration/config';

export {
    type Config,
    type PartialConfig,
    type CookieAttributes,
    type PageIdFormat
} from '@aws-rum-web/core/orchestration/config';

export type PartialCookieAttributes = Partial<CookieAttributes>;

export enum PageIdFormatEnum {
    Path = 'PATH',
    Hash = 'HASH',
    PathAndHash = 'PATH_AND_HASH'
}

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

const defaultCookieAttributes = (): CookieAttributes => {
    return {
        unique: false,
        domain: window.location.hostname,
        path: '/',
        sameSite: 'Strict',
        secure: true
    };
};

const defaultConfig = (cookieAttributes: CookieAttributes): Config => {
    return {
        allowCookies: false,
        batchLimit: 100,
        client: INSTALL_MODULE,
        compressionStrategy: { enabled: false },
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
        telemetries: [],
        useBeacon: true,
        userIdRetentionDays: 30,
        enableW3CTraceId: false,
        candidatesCacheSize: 10,
        userAgentProvider: userAgentDataProvider
    };
};

/**
 * Slim orchestrator — no auth/signing dependencies, no built-in telemetry plugins.
 *
 * Only PageViewPlugin loads by default. Pass additional plugins via
 * `eventPluginsToLoad` or call `addPlugin()` at runtime.
 */
export class Orchestration {
    private pluginManager: PluginManager;
    private eventCache: EventCache;
    private dispatchManager: Dispatch;
    private config: Config;
    private eventBus = new EventBus<Topic>();

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

        const cookieAttributes: CookieAttributes = {
            ...defaultCookieAttributes(),
            ...configCookieAttributes
        };

        this.config = {
            ...{ fetchFunction: fetch },
            ...defaultConfig(cookieAttributes),
            ...partialConfig,
            signing: false
        } as Config;

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

        this.dispatchManager = new Dispatch(
            applicationId,
            region,
            this.config.endpointUrl,
            this.eventCache,
            this.config
        );

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

    public addSessionAttributes(sessionAttributes: {
        [key: string]: string | boolean | number;
    }): void {
        this.eventCache.addSessionAttributes(sessionAttributes);
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

    public recordPageView(payload: string | PageAttributes) {
        this.eventCache.recordPageView(payload);
    }

    public recordError(error: any) {
        this.pluginManager.record('com.amazonaws.rum.js-error', error);
    }

    public registerDomEvents(events: any[]) {
        this.pluginManager.updatePlugin('com.amazonaws.rum.dom-event', events);
    }

    public recordEvent(eventType: string, eventData: object) {
        this.eventCache.recordEvent(eventType, eventData);
    }

    private initPluginManager(
        applicationId: string,
        applicationVersion: string
    ) {
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
