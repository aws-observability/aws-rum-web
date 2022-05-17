import { Plugin, PluginContext } from './Plugin';

/**
 * The plugin manager maintains a list of plugins
 * and notifies plugins of configuration or lifecycle changes.
 */
export class PluginManager {
    private plugins: Map<string, Plugin> = new Map();

    constructor(private readonly context: PluginContext) {}

    /**
     * Add an event plugin to PluginManager and initialize the plugin.
     * @param plugin The plugin which adheres to the RUM web client's plugin interface.
     */
    public addPlugin(plugin: Plugin): void {
        const { pluginName } = plugin;

        if (this.hasPlugin(pluginName)) {
            throw new Error(
                `Plugin "${pluginName}" already defined in the PluginManager`
            );
        }

        this.plugins.set(pluginName, plugin);

        // initialize plugin
        plugin.load(this.context);
    }

    /**
     * Update an event plugin
     * @param pluginName
     * @param config The config to update the plugin with.
     */
    public updatePlugin(pluginName: string, config: object) {
        const plugin = this.plugins.get(pluginName);

        plugin?.update?.(config);
    }

    /**
     * Enable all event plugins.
     */
    public enable() {
        this.plugins.forEach((p) => p.enable());
    }

    /**
     * Disable all event plugins.
     */
    public disable() {
        this.plugins.forEach((p) => p.disable());
    }

    /**
     * Return if a plugin exists.
     * @param pluginName a unique identifier for the plugin
     */
    public hasPlugin(pluginName: string): boolean {
        return this.plugins.has(pluginName);
    }

    /**
     * Manually record data using a plugin.
     * @param pluginName The unique identifier for the plugin being configured.
     * @param data The data to be recorded by the plugin.
     */
    public record(pluginName: string, data: any): void {
        const plugin = this.plugins.get(pluginName);
        if (plugin?.record instanceof Function) {
            plugin.record(data);
        } else {
            throw new Error('AWS RUM Client record: Invalid plugin ID');
        }
    }
}
