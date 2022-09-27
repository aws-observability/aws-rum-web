import { RUM_AWS_PREFIX } from './utils/constant';
import { Plugin } from './Plugin';
import { PluginContext } from './types';

export abstract class InternalPlugin<UpdateType = unknown>
    implements Plugin<UpdateType> {
    static idPrefix = RUM_AWS_PREFIX;

    protected enabled = true;
    protected context!: PluginContext;
    private readonly pluginId: string;

    constructor(name: string) {
        this.pluginId = InternalPlugin.generatePluginId(name);
    }

    static generatePluginId(name: string): string {
        return `${InternalPlugin.idPrefix}.${name}`;
    }

    load(context: PluginContext): void {
        this.context = context;
        this.onload?.();
    }
    record?<D>(data: D): void;
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
