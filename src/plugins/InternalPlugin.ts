import { RUM_AWS_PREFIX } from './utils/constant';
import { PluginInterface } from './PluginInterface';
import { PluginContext } from './types';

export abstract class InternalPlugin implements PluginInterface {
    static idPrefix = RUM_AWS_PREFIX;

    protected enabled: boolean = true;
    protected context?: PluginContext;
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
    record?<D extends unknown>(data: D): void;
    update?<O extends unknown>(updateWith: O[]): void;

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
