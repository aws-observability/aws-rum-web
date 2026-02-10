import { InternalPluginContext } from '@aws-rum-web/core/plugins/types';
import { InternalPlugin } from '@aws-rum-web/core/plugins/InternalPlugin';
import { PluginManager } from '@aws-rum-web/core/plugins/PluginManager';
import {
    DomEventPlugin,
    DOM_EVENT_PLUGIN_ID,
    TargetDomEvent
} from '@aws-rum-web/core/plugins/event-plugins/DomEventPlugin';
import {
    JsErrorPlugin,
    JS_ERROR_EVENT_PLUGIN_ID
} from '@aws-rum-web/core/plugins/event-plugins/JsErrorPlugin';
import { EventCache } from '@aws-rum-web/core/event-cache/EventCache';
import { Dispatch } from '@aws-rum-web/core/dispatch/Dispatch';
import { NavigationPlugin } from '@aws-rum-web/core/plugins/event-plugins/NavigationPlugin';
import { ResourcePlugin } from '@aws-rum-web/core/plugins/event-plugins/ResourcePlugin';
import { WebVitalsPlugin } from '@aws-rum-web/core/plugins/event-plugins/WebVitalsPlugin';
import { XhrPlugin } from '@aws-rum-web/core/plugins/event-plugins/XhrPlugin';
import { FetchPlugin } from '@aws-rum-web/core/plugins/event-plugins/FetchPlugin';
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
    type Telemetry,
    type PageIdFormat
} from '@aws-rum-web/core/orchestration/config';

export {
    type Config,
    type PartialConfig,
    type CookieAttributes,
    type Telemetry,
    type PageIdFormat
} from '@aws-rum-web/core/orchestration/config';

export type PartialCookieAttributes = Partial<CookieAttributes>;

export enum TelemetryEnum {
    Errors = 'errors',
    Performance = 'performance',
    Interaction = 'interaction',
    Http = 'http'
}

export enum PageIdFormatEnum {
    Path = 'PATH',
    Hash = 'HASH',
    PathAndHash = 'PATH_AND_HASH'
}

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

type PluginInitializer = (config: object) => InternalPlugin[];

interface TelemetriesFunctor {
    [key: string]: PluginInitializer;
}

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
        signing: false, // Slim: always unsigned
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
        legacySPASupport: false,
        candidatesCacheSize: 10
    };
};

/**
 * Slim orchestrator — no auth/signing dependencies.
 * Use with a proxy endpoint (signing: false).
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
            signing: false // Force unsigned — slim has no signing support
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
        // No auth or signing injection — slim distribution

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
        this.pluginManager.record(JS_ERROR_EVENT_PLUGIN_ID, error);
    }

    public registerDomEvents(events: TargetDomEvent[]) {
        this.pluginManager.updatePlugin<TargetDomEvent[]>(
            DOM_EVENT_PLUGIN_ID,
            events
        );
    }

    public recordEvent(eventType: string, eventData: object) {
        this.eventCache.recordEvent(eventType, eventData);
    }

    private initPluginManager(
        applicationId: string,
        applicationVersion: string
    ) {
        const BUILTIN_PLUGINS: InternalPlugin[] =
            this.constructBuiltinPlugins();
        const PLUGINS: Plugin[] = [
            ...BUILTIN_PLUGINS,
            ...this.config.eventPluginsToLoad
        ];

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

        PLUGINS.forEach((p) => {
            pluginManager.addPlugin(p);
        });

        return pluginManager;
    }

    private constructBuiltinPlugins(): InternalPlugin[] {
        let plugins: InternalPlugin[] = [];
        const functor: TelemetriesFunctor = this.telemetryFunctor();

        this.config.telemetries.forEach((type) => {
            if (typeof type === 'string' && functor[type.toLowerCase()]) {
                plugins = [...plugins, ...functor[type.toLowerCase()]({})];
            } else if (
                Array.isArray(type) &&
                functor[(type[0] as string).toLowerCase()]
            ) {
                plugins = [
                    ...plugins,
                    ...functor[(type[0] as string).toLowerCase()](
                        type[1] as object
                    )
                ];
            }
        });

        return plugins;
    }

    private telemetryFunctor(): TelemetriesFunctor {
        return {
            [TelemetryEnum.Errors]: (config: object): InternalPlugin[] => {
                return [new JsErrorPlugin(config)];
            },
            [TelemetryEnum.Performance]: (config: object): InternalPlugin[] => {
                return [
                    new NavigationPlugin(config),
                    new ResourcePlugin(config),
                    new WebVitalsPlugin(config)
                ];
            },
            [TelemetryEnum.Interaction]: (config: object): InternalPlugin[] => {
                return [new DomEventPlugin(config)];
            },
            [TelemetryEnum.Http]: (config: object): InternalPlugin[] => {
                return [new XhrPlugin(config), new FetchPlugin(config)];
            }
        };
    }
}
