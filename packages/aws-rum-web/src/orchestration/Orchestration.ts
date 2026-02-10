import { InternalPluginContext } from '@aws-rum-web/core/plugins/types';
import { InternalPlugin } from '@aws-rum-web/core/plugins/InternalPlugin';
import { BasicAuthentication } from '@aws-rum-web/core/dispatch/BasicAuthentication';
import { EnhancedAuthentication } from '@aws-rum-web/core/dispatch/EnhancedAuthentication';
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
import {
    AwsCredentialIdentityProvider,
    AwsCredentialIdentity
} from '@aws-sdk/types';
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
import { createSigningConfig } from '../dispatch/signing';
import {
    Config,
    PartialConfig,
    CookieAttributes,
    TelemetryEnum,
    defaultCookieAttributes,
    defaultConfig
} from './config';

// Re-export config types for public API
export {
    Config,
    PartialConfig,
    CookieAttributes,
    PartialCookieAttributes,
    CompressionStrategy,
    TelemetryEnum,
    PageIdFormatEnum,
    Telemetry,
    PageIdFormat,
    UserAgentDetails,
    defaultCookieAttributes,
    defaultConfig
} from './config';

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

type PluginInitializer = (config: object) => InternalPlugin[];

interface TelemetriesFunctor {
    [key: string]: PluginInitializer;
}

const internalConfigOverrides = {
    candidatesCacheSize: 10
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
    private eventBus = new EventBus<Topic>();

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
        region: string,
        {
            cookieAttributes: configCookieAttributes,
            ...partialConfig
        }: PartialConfig = {}
    ) {
        if (typeof region === 'undefined') {
            // Provide temporary backwards compatibility if the region was not provided by the loader. This will be
            // removed when internal users have migrated to the new signature.
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
            ...internalConfigOverrides
        } as Config;

        this.config.endpoint = this.getDataPlaneEndpoint(region, partialConfig);

        // If the URL is not formatted correctly, a TypeError will be thrown.
        // This breaks our convention to fail-safe here for the sake of
        // debugging. It is expected that the application has wrapped the call
        // to the constructor in a try/catch block, as is done in the example
        // code.
        this.config.endpointUrl = new URL(this.config.endpoint);

        InternalLogger.configure(this.config.debug);
        InternalLogger.debug(
            'Configuration:',
            JSON.stringify(
                {
                    allowCookies: this.config.allowCookies,
                    compressionStrategy: this.config.compressionStrategy,
                    debug: this.config.debug,
                    dispatchInterval: this.config.dispatchInterval,
                    enableXRay: this.config.enableXRay,
                    endpoint: this.config.endpoint,
                    sessionSampleRate: this.config.sessionSampleRate,
                    signing: this.config.signing
                },
                null,
                2
            )
        );

        this.eventCache = this.initEventCache(
            applicationId,
            applicationVersion
        );

        this.dispatchManager = this.initDispatch(region, applicationId);
        this.pluginManager = this.initPluginManager(
            applicationId,
            applicationVersion
        );
        this.eventCache.setPluginFlushHook(() => this.pluginManager.flush());

        InternalLogger.info(`RUM client initialized for app: ${applicationId}`);
        InternalLogger.info(
            `Telemetries enabled: ${
                this.config.telemetries.join(', ') || 'none'
            }`
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
     *
     * @param credentials A provider of AWS credentials.
     */
    public setAwsCredentials(
        credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
    ): void {
        this.dispatchManager.setAwsCredentials(credentials);
    }

    /**
     * Set custom session attributes to add them to all event metadata.
     *
     * @param payload object containing custom attribute data in the form of key, value pairs
     */
    public addSessionAttributes(sessionAttributes: {
        [key: string]: string | boolean | number;
    }): void {
        this.eventCache.addSessionAttributes(sessionAttributes);
    }

    /**
     * Add a telemetry plugin.
     *
     * @param plugin A plugin which adheres to the RUM web client's plugin interface.
     */
    public addPlugin(plugin: Plugin): void {
        this.pluginManager.addPlugin(plugin);
    }

    /**
     * Force the client to immediately dispatch events to the collector.
     */
    public dispatch(): void {
        this.dispatchManager.dispatchFetch();
    }

    /**
     * Force the client to immediately dispatch events to the collector using a beacon.
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
     *
     * @param payload Can be string or PageAttributes object
     * If string, payload is pageId (The unique ID for the page within the application).
     * If PageAttributes, payload contains pageId as well as page attributes to include in events with pageId
     */
    public recordPageView(payload: string | PageAttributes) {
        this.eventCache.recordPageView(payload);
    }

    /**
     * Record an error using the JS error plugin.
     *
     * @param error An ErrorEvent, Error or primitive.
     */
    public recordError(error: any) {
        this.pluginManager.record(JS_ERROR_EVENT_PLUGIN_ID, error);
    }

    /**
     * Update DOM plugin to record the (additional) provided DOM events.
     *
     * @param events
     */
    public registerDomEvents(events: TargetDomEvent[]) {
        this.pluginManager.updatePlugin<TargetDomEvent[]>(
            DOM_EVENT_PLUGIN_ID,
            events
        );
    }

    /**
     * Records a custom event, which is dispatched at the next interval.
     *
     * @param type A unique name for the type of event being recorded.
     * @param eventData A JSON object containing the event's attributes.
     */
    public recordEvent(eventType: string, eventData: object) {
        this.eventCache.recordEvent(eventType, eventData);
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
            this.config,
            this.eventBus
        );
    }

    private initDispatch(region: string, applicationId: string) {
        const dispatch: Dispatch = new Dispatch(
            applicationId,
            region,
            this.config.endpointUrl,
            this.eventCache,
            this.config
        );

        // Inject signing support
        dispatch.setSigningConfigFactory(createSigningConfig);

        // Inject Cognito credential provider factory
        dispatch.setCognitoCredentialProviderFactory(
            (config, appId, identityPoolId, guestRoleArn) => {
                if (identityPoolId && guestRoleArn) {
                    return new BasicAuthentication(config, appId)
                        .ChainAnonymousCredentialsProvider;
                }
                return new EnhancedAuthentication(config, appId)
                    .ChainAnonymousCredentialsProvider;
            }
        );

        if (this.config.signing && this.config.identityPoolId) {
            dispatch.setCognitoCredentials(
                this.config.identityPoolId,
                this.config.guestRoleArn
            );
        }

        return dispatch;
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

    private getDataPlaneEndpoint(
        region: string,
        partialConfig: PartialConfig
    ): string {
        return partialConfig.endpoint
            ? partialConfig.endpoint
            : DEFAULT_ENDPOINT.replace(DEFAULT_REGION, region);
    }

    /**
     * Returns a functor which maps data collection categories to
     * instantiated plugins.
     */
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
