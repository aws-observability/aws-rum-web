import { Plugin } from '../plugins/Plugin';
import { PluginContext } from '../plugins/types';
import { InternalPlugin } from '../plugins/InternalPlugin';
import { Authentication } from '../dispatch/Authentication';
import { EnhancedAuthentication } from '../dispatch/EnhancedAuthentication';
import { PluginManager } from '../plugins/PluginManager';
import {
    DomEventPlugin,
    DOM_EVENT_PLUGIN_ID,
    TargetDomEvent,
    DomEventPluginConfig
} from '../plugins/event-plugins/DomEventPlugin';
import {
    JsErrorPlugin,
    JS_ERROR_EVENT_PLUGIN_ID,
    JsErrorPluginConfig
} from '../plugins/event-plugins/JsErrorPlugin';
import { EventCache } from '../event-cache/EventCache';
import { ClientBuilder, Dispatch } from '../dispatch/Dispatch';
import { CredentialProvider, Credentials } from '@aws-sdk/types';
import { NavigationPlugin } from '../plugins/event-plugins/NavigationPlugin';
import {
    ResourcePlugin,
    ResourcePluginConfig
} from '../plugins/event-plugins/ResourcePlugin';
import { WebVitalsPlugin } from '../plugins/event-plugins/WebVitalsPlugin';
import { XhrPlugin } from '../plugins/event-plugins/XhrPlugin';
import { FetchPlugin } from '../plugins/event-plugins/FetchPlugin';
import { PageViewPlugin } from '../plugins/event-plugins/PageViewPlugin';
import { PageAttributes } from '../sessions/PageManager';
import { Configurable } from '../abstract/Configurable';
import { HttpPluginConfig } from '../plugins/utils/http-utils';

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

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

type PluginInitializer = (config: object) => InternalPlugin[];

interface TelemetriesFunctor {
    [key: string]: PluginInitializer;
}

export type Telemetry = string | (string | object)[];

export type PageIdFormat = 'PATH' | 'HASH' | 'PATH_AND_HASH';

export type PartialCookieAttributes = Partial<CookieAttributes>;
export type PartialConfig = Partial<Config>;

export const defaultCookieAttributes: CookieAttributes = {
    unique: false,
    domain: window.location.hostname,
    path: '/',
    sameSite: 'Strict',
    secure: true
};

export type CookieAttributes = {
    unique: boolean;
    domain: string;
    path: string;
    sameSite: string;
    secure: boolean;
};

export interface Config {
    allowCookies: boolean;
    batchLimit: number;
    clientBuilder?: ClientBuilder;
    cookieAttributes?: CookieAttributes;
    disableAutoPageView: boolean;
    dispatchInterval: number;
    enableRumClient: boolean;
    enableXRay: boolean;
    endpoint: string;
    endpointUrl: URL;
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
    pageIdFormat: PageIdFormat;
    pagesToExclude: RegExp[];
    pagesToInclude: RegExp[];
    recordResourceUrl: boolean;
    retries: number;
    routeChangeComplete: number;
    routeChangeTimeout: number;
    sessionEventLimit: number;
    sessionLengthSeconds: number;
    sessionSampleRate: number;
    telemetries: Telemetry[];
    userIdRetentionDays: number;
}

/**
 * An orchestrator which (1) initializes cwr components and (2) provides the API for the application to interact
 * with the RUM web client. Depending on how the RUM web client was loaded, this class may be called directly, or
 * indirectly through the CommandQueue:
 * - If the client was loaded by an HTML script tag, Orchestration is called indirectly through the CommandQueue.
 * - If the client was loaded as an NPM module, Orchestration is called directly by the application.
 */
export class Orchestration extends Configurable<Config> {
    private pluginManager: PluginManager;
    private dispatchManager: Dispatch;
    private readonly eventCache: EventCache;

    /**
     * Instantiate the CloudWatch RUM web client and begin monitoring the
     * application.
     *
     * This constructor may throw a TypeError if not correctly configured. In
     * production code, wrap calls to this constructor in a try/catch block so
     * that this does not impact the application.
     *
     * @param applicationId A globally unique identifier for the CloudWatch RUM
     * app monitor which monitors your application.
     * @param applicationVersion Your application's semantic version. If you do
     * not wish to use this field then add any placeholder, such as '0.0.0'.
     * @param region The AWS region of the app monitor. For example, 'us-east-1'
     * or 'eu-west-2'.
     * @param configCookieAttributes
     * @param partialConfig An application-specific configuration for the web
     * client.
     */
    constructor(
        applicationId: string,
        applicationVersion: string,
        /**
         * Provide temporary backwards compatability if the region was not provided by the loader. This will be
         * removed when internal users have migrated to the new signature.
         */
        region: string = 'us-west-2',
        {
            cookieAttributes: configCookieAttributes,
            ...partialConfig
        }: PartialConfig | { cookieAttributes?: PartialCookieAttributes } = {}
    ) {
        super({
            fetchFunction: fetch,
            cookieAttributes: {
                ...defaultCookieAttributes,
                ...configCookieAttributes
            },
            ...partialConfig,
            endpoint: Orchestration.getDataPlaneEndpoint(region, partialConfig)
        });

        // If the URL is not formatted correctly, a TypeError will be thrown.
        // This breaks our convention to fail-safe here for the sake of
        // debugging. It is expected that the application has wrapped the call
        // to the constructor in a try/catch block, as is done in the example
        // code.
        this.setConfigValue(
            'endpointUrl',
            new URL(this.getConfigValue('endpoint'))
        );

        this.eventCache = this.initEventCache(
            applicationId,
            applicationVersion
        );

        this.dispatchManager = this.initDispatch(region);
        this.pluginManager = this.initPluginManager(
            applicationId,
            applicationVersion
        );

        if (this.getConfigValue('enableRumClient')) {
            this.enable();
        } else {
            this.disable();
        }
    }

    static getDataPlaneEndpoint(
        region: string,
        partialConfig: PartialConfig
    ): string {
        return partialConfig.endpoint
            ? partialConfig.endpoint
            : DEFAULT_ENDPOINT.replace(DEFAULT_REGION, region);
    }

    static getDefaultConfig(): Config {
        return {
            allowCookies: false,
            batchLimit: 100,
            disableAutoPageView: false,
            dispatchInterval: 5 * 1000,
            enableRumClient: true,
            enableXRay: false,
            endpoint: DEFAULT_ENDPOINT,
            endpointUrl: new URL(DEFAULT_ENDPOINT),
            eventCacheSize: 200,
            eventPluginsToLoad: [],
            pageIdFormat: PageIdFormatEnum.Path,
            pagesToExclude: [],
            pagesToInclude: [],
            recordResourceUrl: true,
            retries: 2,
            routeChangeComplete: 100,
            routeChangeTimeout: 10000,
            sessionEventLimit: 200,
            sessionLengthSeconds: 60 * 30,
            sessionSampleRate: 1,
            telemetries: [],
            userIdRetentionDays: 30
        };
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
     * Add a telemetry plugin.
     * @param plugin A plugin which adheres to the RUM web client's plugin interface.
     */
    public addPlugin(plugin: Plugin): void {
        this.pluginManager.addPlugin(plugin);
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
        this.setConfigValue('allowCookies', allow);
    }

    /**
     * Update the current page the user is interacting with.
     * @param payload Can be string or PageAttributes object
     *      If string, payload is pageId (The unique ID for the page within the application).
     *      If PageAttributes, payload contains pageId as well as page attributes to include in events with pageId
     */
    public recordPageView(payload: string | PageAttributes) {
        this.eventCache.recordPageView(payload);
    }

    /**
     * Record an error using the JS error plugin.
     * @param error An ErrorEvent, Error or primitive.
     */
    public recordError(error: any) {
        this.pluginManager.record(JS_ERROR_EVENT_PLUGIN_ID, error);
    }

    /**
     * Update DOM plugin to record the (additional) provided DOM events.
     * @param events
     */
    public registerDomEvents(events: TargetDomEvent[]) {
        this.pluginManager.updatePlugin<TargetDomEvent[]>(
            DOM_EVENT_PLUGIN_ID,
            events
        );
    }

    protected getDefaultConfig(): Config {
        return Orchestration.getDefaultConfig();
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
            this.getFullConfig()
        );
    }

    private initDispatch(region: string) {
        const dispatch: Dispatch = new Dispatch(
            region,
            this.getConfigValue('endpointUrl'),
            this.eventCache,
            this.getFullConfig()
        );

        if (
            this.getConfigValue('identityPoolId') &&
            this.getConfigValue('guestRoleArn')
        ) {
            dispatch.setAwsCredentials(
                new Authentication(this.getFullConfig())
                    .ChainAnonymousCredentialsProvider
            );
        } else if (this.getConfigValue('identityPoolId')) {
            dispatch.setAwsCredentials(
                new EnhancedAuthentication(this.getFullConfig())
                    .ChainAnonymousCredentialsProvider
            );
        }

        return dispatch;
    }

    private initPluginManager(
        applicationId: string,
        applicationVersion: string
    ) {
        const BUILTIN_PLUGINS: InternalPlugin[] = this.constructBuiltinPlugins();
        const PLUGINS: Plugin[] = [
            ...BUILTIN_PLUGINS,
            ...this.getConfigValue('eventPluginsToLoad')
        ];

        const pluginContext: PluginContext = {
            applicationId,
            applicationVersion,
            config: this.getFullConfig(),
            record: this.eventCache.recordEvent,
            recordPageView: this.eventCache.recordPageView,
            getSession: this.eventCache.getSession
        };

        // Initialize PluginManager
        const pluginManager: PluginManager = new PluginManager(pluginContext);

        // Load page view plugin
        if (!this.getConfigValue('disableAutoPageView')) {
            pluginManager.addPlugin(new PageViewPlugin());
        }

        // Load plugins
        PLUGINS.forEach((p) => {
            pluginManager.addPlugin(p);
        });

        return pluginManager;
    }

    private constructBuiltinPlugins(): InternalPlugin[] {
        let plugins: InternalPlugin[] = [];
        const functor: TelemetriesFunctor = this.telemetryFunctor();

        this.getConfigValue('telemetries').forEach((type) => {
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

    /**
     * Returns a functor which maps data collection categories to
     * instantiated plugins.
     */
    private telemetryFunctor(): TelemetriesFunctor {
        return {
            [TelemetryEnum.Errors]: (
                config: JsErrorPluginConfig
            ): InternalPlugin[] => {
                return [new JsErrorPlugin(config)];
            },
            [TelemetryEnum.Performance]: (
                config: ResourcePluginConfig
            ): InternalPlugin[] => {
                return [
                    new NavigationPlugin(),
                    new ResourcePlugin(config),
                    new WebVitalsPlugin()
                ];
            },
            [TelemetryEnum.Interaction]: (
                config: DomEventPluginConfig
            ): InternalPlugin[] => {
                return [new DomEventPlugin(config)];
            },
            [TelemetryEnum.Http]: (
                config: HttpPluginConfig
            ): InternalPlugin[] => {
                return [new XhrPlugin(config), new FetchPlugin(config)];
            }
        };
    }
}
