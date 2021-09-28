import { Plugin, PluginContext } from './Plugin';

/**
 * The plugin manager maintains a list of plugins
 * and notifies plugins of configuration or lifecycle changes.
 */
export class PluginManager {
    private plugins: Map<string, Plugin>;
    private context: PluginContext;

    constructor(context: PluginContext) {
        this.plugins = new Map();
        this.context = context;
    }

    /**
     * Add an event plugin to PluginManager.
     * It also:
     * 1. config the plugin with in intial configuration
     * 2. initialize the plugin
     * @param plugin The plugin which adheres to the RUM web client's plugin interface.
     * @param config The initial configuration for the plugin.
     */
    public addPlugin(plugin: Plugin, config?: any): void {
        const pluginId: string = plugin.getPluginId();

        // add to plugin map
        if (pluginId) {
            this.plugins.set(pluginId, plugin);
        } else {
            throw new Error('InvalidPluginIdException');
        }

        // initialize plugin
        plugin.load(this.context);

        // config plugin
        if (config) {
            plugin.configure(config);
        }
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
     * @param pluginId a unique identifier for the plugin
     */
    public hasPlugin(pluginId: string): boolean {
        return this.plugins.has(pluginId);
    }

    /**
     * Configure a plugin.
     * @param pluginId The unique identifier for the plugin being configured.
     * @param config The configuration for the plugin (e.g., enable/disable events).
     */
    public configurePlugin(pluginId: string, config: object): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.configure(config);
        } else {
            throw new Error(
                'AWS RUM Client configurePlugin: Invalid plugin ID'
            );
        }
    }

    /**
     * Manually record data using a plugin.
     * @param pluginId The unique identifier for the plugin being configured.
     * @param data The data to be recorded by the plugin.
     */
    public record(pluginId: string, data: any): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin && plugin.record instanceof Function) {
            plugin.record(data);
        } else {
            throw new Error('AWS RUM Client record: Invalid plugin ID');
        }
    }
}
