import { Plugin, PluginContext } from '../plugins/Plugin';
import { Authentication } from '../dispatch/Authentication';
import { EnhancedAuthentication } from '../dispatch/EnhancedAuthentication';
import { PluginManager } from '../plugins/PluginManager';
import { DomEventPlugin } from '../plugins/event-plugins/DomEventPlugin';
import {
    JsErrorPlugin,
    JS_ERROR_EVENT_PLUGIN_ID
} from '../plugins/event-plugins/JsErrorPlugin';
import { EventCache } from '../event-cache/EventCache';
import { ClientBuilder, Dispatch } from '../dispatch/Dispatch';
import { CredentialProvider, Credentials } from '@aws-sdk/types';
import { NavigationPlugin } from '../plugins/event-plugins/NavigationPlugin';
import { PaintPlugin } from '../plugins/event-plugins/PaintPlugin';
import { ResourcePlugin } from '../plugins/event-plugins/ResourcePlugin';
import { WebVitalsPlugin } from '../plugins/event-plugins/WebVitalsPlugin';
import { XhrPlugin } from '../plugins/event-plugins/XhrPlugin';
import { FetchPlugin } from '../plugins/event-plugins/FetchPlugin';
import { PageViewPlugin } from '../plugins/event-plugins/PageViewPlugin';

const DATA_PLANE_REGION_PLACEHOLDER = '[region]';

const DATA_PLANE_DEFAULT_ENDPOINT =
    'https://dataplane.[region].gamma.rum.aws.dev';

const DEFAULT_DISPATCH_INTERVAL = 5000;

export enum TELEMETRY_TYPES {
    ERRORS = 'errors',
    PERFORMANCE = 'performance',
    INTERACTION = 'interaction',
    HTTP = 'http'
}

type PluginInitializer = () => Plugin[];

interface TelemetriesFunctor {
    [key: string]: PluginInitializer;
}

export enum PAGE_ID_FORMAT {
    PATH = 'PATH',
    HASH = 'HASH',
    PATH_AND_HASH = 'PATH_AND_HASH'
}

export type PartialCookieAttributes = {
    domain?: string;
    path?: string;
    sameSite?: string;
    secure?: boolean;
};

export type PartialConfig = {
    allowCookies?: boolean;
    batchLimit?: number;
    clientBuilder?: ClientBuilder;
    cookieAttributes?: PartialCookieAttributes;
    disableAutoPageView?: boolean;
    dispatchInterval?: number;
    enableRumClient?: boolean;
    endpoint?: string;
    eventCacheSize?: number;
    eventPluginsToLoad?: Plugin[];
    guestRoleArn?: string;
    identityPoolId?: string;
    pageIdFormat?: PAGE_ID_FORMAT;
    pagesToExclude?: RegExp[];
    pagesToInclude?: RegExp[];
    sessionEventLimit?: number;
    sessionLengthSeconds?: number;
    sessionSampleRate?: number;
    /**
     * Application owners think about data collection in terms of the categories
     * of data being collected. For example, JavaScript errors, page load
     * performance, user journeys and user interactions are data collection
     * categories. However, there is not a 1-1 mapping between data collection
     * categories and plugins.
     *
     * This configuration option allows application owners to define the data
     * categories they want to collect without needing to understand and
     * instantiate each plugin themselves. The toolkit will instantiate the
     * plugins which map to the selected categories.
     */
    telemetries?: string[];
    userIdRetentionDays?: number;
};

export const defaultCookieAttributes = (): CookieAttributes => {
    return {
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
        cookieAttributes,
        disableAutoPageView: false,
        dispatchInterval: 5 * 1000,
        enableRumClient: true,
        endpoint: 'https://dataplane.us-west-2.gamma.rum.aws.dev',
        eventCacheSize: 200,
        eventPluginsToLoad: [],
        pageIdFormat: PAGE_ID_FORMAT.PATH,
        pagesToExclude: [],
        pagesToInclude: [],
        sessionEventLimit: 200,
        sessionLengthSeconds: 60 * 30,
        sessionSampleRate: 1,
        telemetries: [
            TELEMETRY_TYPES.ERRORS,
            TELEMETRY_TYPES.PERFORMANCE,
            TELEMETRY_TYPES.INTERACTION
        ],
        userIdRetentionDays: 0
    };
};

export type CookieAttributes = {
    domain: string;
    path: string;
    sameSite: string;
    secure: boolean;
};

export type Config = {
    allowCookies: boolean;
    batchLimit: number;
    clientBuilder?: ClientBuilder;
    cookieAttributes: CookieAttributes;
    disableAutoPageView: boolean;
    dispatchInterval: number;
    enableRumClient: boolean;
    endpoint: string;
    eventCacheSize: number;
    eventPluginsToLoad: Plugin[];
    /*
     * We must remember the fetch function before the HttpFetch plugin
     * overwrites it via monkey patch. We will use the original fetch function
     * so that we do not record requests made by the RUM web client.
     */
    fetchFunction?: (
        input: RequestInfo,
        init?: RequestInit
    ) => Promise<Response>;
    guestRoleArn?: string;
    identityPoolId?: string;
    pageIdFormat: PAGE_ID_FORMAT;
    pagesToExclude: RegExp[];
    pagesToInclude: RegExp[];
    sessionEventLimit: number;
    sessionLengthSeconds: number;
    sessionSampleRate: number;
    telemetries: string[];
    userIdRetentionDays: number;
};

/**
 * An orchestrator which (1) initializes cwr components and (2) provides the API for the application to interact
 * with the RUM web client. Depending on how the RUM web client was loaded, this class may be called directly, or
 * indirectly through the CommandQueue:
 * - If the client was loaded by an HTML script tag, Orchestration is called indirectly through the CommandQueue.
 * - If the client was loaded as an NPM module, Orchestration is called directly by the application.
 */
export class Orchestration {
    private pluginManager: PluginManager;
    private eventCache: EventCache;
    private dispatchManager: Dispatch;
    private config: Config;

    constructor(
        applicationId: string,
        applicationVersion: string,
        region: string,
        partialConfig: PartialConfig = {}
    ) {
        if (typeof region === 'undefined') {
            // Provide temporary backwards compatability if the region was not provided by the loader. This will be
            // removed when internal users have migrated to the new signature.
            region = 'us-west-2';
        }

        const cookieAttributes: CookieAttributes = {
            ...defaultCookieAttributes(),
            ...partialConfig.cookieAttributes
        };
        delete partialConfig.cookieAttributes;

        this.config = {
            ...{ fetchFunction: fetch },
            ...defaultConfig(cookieAttributes),
            ...partialConfig
        } as Config;

        this.config.endpoint = this.getDataPlaneEndpoint(region, partialConfig);

        this.eventCache = this.initEventCache(
            applicationId,
            applicationVersion
        );

        this.dispatchManager = this.initDispatch(region, applicationId);
        this.pluginManager = this.initPluginManager(
            applicationId,
            applicationVersion
        );

        if (this.config.enableRumClient) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Set the credential provider that will be used to authenticate with the
     * data plane service (AWS auth).
     * @param credentials A provider of AWS credentials.
     */
    public setAwsCredentials(
        credentials: Credentials | CredentialProvider
    ): void {
        this.dispatchManager.setAwsCredentials(credentials);
    }

    /**
     * Add an event plugin for collecting telemetry.
     * @param plugin A plugin which adheres to the RUM web client's plugin interface.
     * @param config An initial configuration for the plugin.
     */
    public addPlugin(plugin: Plugin, config?: any): void {
        this.pluginManager.addPlugin(plugin, config);
    }

    /**
     * Configure a plugin.
     * @param pluginId A unique identifier for the plugin being configured.
     * @param config A configuration for the plugin (e.g., enable/disable events).
     */
    public configurePlugin(pluginId: string, config: object): void {
        this.pluginManager.configurePlugin(pluginId, config);
    }

    /**
     * Force the cllient to immediately dispatch events to the collector.
     */
    public dispatch(): void {
        this.dispatchManager.dispatchFetch();
    }

    /**
     * Force the cllient to immediately dispatch events to the collector using a beacon.
     */
    public dispatchBeacon(): void {
        this.dispatchManager.dispatchBeacon();
    }

    /**
     * When enabled, the client records and dispatches events.
     */
    public enable(): void {
        this.eventCache.enable();
        this.pluginManager.enable();
        this.dispatchManager.enable();
    }

    /**
     * When disabled, the client does not record or dispatch events.
     */
    public disable(): void {
        this.dispatchManager.disable();
        this.pluginManager.disable();
        this.eventCache.disable();
    }

    /**
     * @param allow when {@code false}, the RUM web client will not store cookies or use localstorage.
     */
    public allowCookies(allow: boolean) {
        this.config.allowCookies = allow;
    }

    /**
     * Update the current page the user is interacting with.
     * @param pageId The unique ID for the page within the application.
     */
    public recordPageView(pageId: string) {
        this.eventCache.recordPageView(pageId);
    }

    /**
     * Record an error using the JS error plugin.
     * @param error An ErrorEvent, Error or primitive.
     */
    public recordError(error: any) {
        this.pluginManager.record(JS_ERROR_EVENT_PLUGIN_ID, error);
    }

    private initEventCache(
        applicationId: string,
        applicationVersion: string
    ): EventCache {
        return new EventCache(
            {
                id: applicationId,
                version: applicationVersion
            },
            this.config
        );
    }

    private initDispatch(region: string, applicationId: string) {
        const dispatchInterval: number =
            typeof this.config.dispatchInterval === 'number'
                ? this.config.dispatchInterval
                : DEFAULT_DISPATCH_INTERVAL;

        const dispatch: Dispatch = new Dispatch(
            applicationId,
            region,
            this.config.endpoint,
            this.eventCache,
            this.config
        );

        if (this.config.identityPoolId && this.config.guestRoleArn) {
            dispatch.setAwsCredentials(
                new Authentication(this.config)
                    .ChainAnonymousCredentialsProvider
            );
        } else if (this.config.identityPoolId) {
            dispatch.setAwsCredentials(
                new EnhancedAuthentication(this.config)
                    .ChainAnonymousCredentialsProvider
            );
        }

        return dispatch;
    }

    private initPluginManager(
        applicationId: string,
        applicationVersion: string
    ) {
        const BUILTIN_PLUGINS: Plugin[] = this.constructBuiltinPlugins();
        const PLUGINS: Plugin[] = [
            ...BUILTIN_PLUGINS,
            ...this.config.eventPluginsToLoad
        ];

        const pluginContext: PluginContext = {
            applicationId,
            applicationVersion,
            config: this.config,
            record: this.eventCache.recordEvent,
            recordPageView: this.eventCache.recordPageView,
            getSession: this.eventCache.getSession
        };

        // Initialize PluginManager
        const pluginManager: PluginManager = new PluginManager(pluginContext);

        // Load page view plugin
        if (!this.config.disableAutoPageView) {
            pluginManager.addPlugin(new PageViewPlugin());
        }

        // Load plugins
        PLUGINS.forEach((p) => {
            pluginManager.addPlugin(p);
        });

        return pluginManager;
    }

    private constructBuiltinPlugins(): Plugin[] {
        let plugins: Plugin[] = [];
        const functor: TelemetriesFunctor = this.telemetryFunctor();

        this.config.telemetries.forEach((type) => {
            if (typeof type === 'string' && functor[type.toLowerCase()]) {
                plugins = [...plugins, ...functor[type.toLowerCase()]()];
            }
        });

        return plugins;
    }

    private getDataPlaneEndpoint(
        region: string,
        partialConfig: PartialConfig
    ): string {
        return partialConfig.endpoint
            ? partialConfig.endpoint
            : DATA_PLANE_DEFAULT_ENDPOINT.replace(
                  DATA_PLANE_REGION_PLACEHOLDER,
                  region
              );
    }

    /**
     * Returns a functor which maps data collection categories to
     * instantiated plugins.
     */
    private telemetryFunctor(): TelemetriesFunctor {
        return {
            [TELEMETRY_TYPES.ERRORS]: (): Plugin[] => {
                return [new JsErrorPlugin()];
            },
            [TELEMETRY_TYPES.PERFORMANCE]: (): Plugin[] => {
                return [
                    new NavigationPlugin(),
                    new PaintPlugin(this.config.endpoint),
                    new ResourcePlugin(this.config.endpoint),
                    new WebVitalsPlugin()
                ];
            },
            [TELEMETRY_TYPES.INTERACTION]: (): Plugin[] => {
                return [new DomEventPlugin()];
            },
            [TELEMETRY_TYPES.HTTP]: (): Plugin[] => {
                return [new XhrPlugin(), new FetchPlugin()];
            }
        };
    }
}
