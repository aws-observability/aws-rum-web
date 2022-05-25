import { RUM_AWS_PREFIX } from './utils/constant';
import { Plugin } from './Plugin';
import { PluginContext } from './types';
import { Configurable } from '../abstract/Configurable';

export interface InternalPluginConfig {
    name?: string;
    enabled?: boolean;
}

export abstract class InternalPlugin<
        ConfigType extends InternalPluginConfig = InternalPluginConfig,
        UpdateType extends unknown = unknown
    >
    extends Configurable<ConfigType>
    implements Plugin<UpdateType> {
    private static idPrefix = RUM_AWS_PREFIX;

    protected enabled: boolean;
    protected context?: PluginContext;
    private readonly pluginId: string;

    constructor(config?: Partial<ConfigType>) {
        super(config);
        this.enabled = this.getConfigValue('enabled') ?? true;
        this.pluginId = InternalPlugin.generatePluginId(this.getName());
    }

    static generatePluginId(name: string): string {
        return `${InternalPlugin.idPrefix}.${name}`;
    }

    getName(): string {
        if (!this.getConfigValue('name')) {
            return this.constructor.name;
        }

        return this.getConfigValue('name');
    }

    load(context: PluginContext): void {
        this.context = context;
        this.onload?.();
    }
    record?<D extends unknown>(data: D): void;
    update?(updateWith: UpdateType): void;

    abstract enable(): void;
    abstract disable(): void;

    public getPluginId() {
        return this.pluginId;
    }

    /**
     * Method to be run after the plugin loads the app context
     */
    protected onload?(): void;
}
