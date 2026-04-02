import { InternalPlugin } from '@aws-rum-web/core/plugins/InternalPlugin';
import { BasicAuthentication } from '@aws-rum-web/core/dispatch/BasicAuthentication';
import { EnhancedAuthentication } from '@aws-rum-web/core/dispatch/EnhancedAuthentication';
import { PluginManager } from '@aws-rum-web/core/plugins/PluginManager';
import { Dispatch } from '@aws-rum-web/core/dispatch/Dispatch';
import {
    DomEventPlugin,
    DOM_EVENT_PLUGIN_ID,
    TargetDomEvent
} from '@aws-rum-web/core/plugins/event-plugins/DomEventPlugin';
import {
    JsErrorPlugin,
    JS_ERROR_EVENT_PLUGIN_ID
} from '@aws-rum-web/core/plugins/event-plugins/JsErrorPlugin';
import { NavigationPlugin } from '@aws-rum-web/core/plugins/event-plugins/NavigationPlugin';
import { ResourcePlugin } from '@aws-rum-web/core/plugins/event-plugins/ResourcePlugin';
import { WebVitalsPlugin } from '@aws-rum-web/core/plugins/event-plugins/WebVitalsPlugin';
import { XhrPlugin } from '@aws-rum-web/core/plugins/event-plugins/XhrPlugin';
import { FetchPlugin } from '@aws-rum-web/core/plugins/event-plugins/FetchPlugin';
import { InternalLogger } from '@aws-rum-web/core/utils/InternalLogger';
import { createSigningConfig } from '../dispatch/signing';
import {
    Orchestration as SlimOrchestration,
    type PartialConfig
} from '@aws-rum-web/slim/orchestration/Orchestration';
import { TelemetryEnum } from './config';

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
    defaultCookieAttributes,
    defaultConfig
} from './config';

type PluginInitializer = (config: object) => InternalPlugin[];

interface TelemetriesFunctor {
    [key: string]: PluginInitializer;
}

/**
 * Full-featured orchestrator extending slim with auth, signing, and
 * the telemetries plugin system.
 */
export class Orchestration extends SlimOrchestration {
    constructor(
        applicationId: string,
        applicationVersion: string,
        region: string,
        partialConfig: PartialConfig = {}
    ) {
        // Merge signing: true into config before passing to slim base
        super(applicationId, applicationVersion, region, {
            signing: true,
            ...partialConfig,
            candidatesCacheSize: 10
        });

        InternalLogger.info(`RUM client initialized for app: ${applicationId}`);
        InternalLogger.info(
            `Telemetries enabled: ${
                this.config.telemetries.join(', ') || 'none'
            }`
        );
    }

    protected initDispatch(region: string, applicationId: string): Dispatch {
        const dispatch = super.initDispatch(region, applicationId);

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

    protected initPluginManager(
        applicationId: string,
        applicationVersion: string
    ): PluginManager {
        const pluginManager = super.initPluginManager(
            applicationId,
            applicationVersion
        );

        // Add telemetry functor plugins
        const builtinPlugins = this.constructBuiltinPlugins();
        builtinPlugins.forEach((p) => {
            pluginManager.addPlugin(p);
        });

        return pluginManager;
    }

    /**
     * Record an error using the JS error plugin.
     */
    public recordError(error: any) {
        this.pluginManager.record(JS_ERROR_EVENT_PLUGIN_ID, error);
    }

    /**
     * Update DOM plugin to record the (additional) provided DOM events.
     */
    public registerDomEvents(events: TargetDomEvent[]) {
        this.pluginManager.updatePlugin<TargetDomEvent[]>(
            DOM_EVENT_PLUGIN_ID,
            events
        );
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
