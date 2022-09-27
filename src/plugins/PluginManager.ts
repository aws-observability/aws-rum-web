import { Plugin } from './Plugin';
import { PluginContext } from './types';
import { InternalPlugin } from './InternalPlugin';

/**
 * The plugin manager maintains a list of plugins
 * and notifies plugins of configuration or lifecycle changes.
 */
export class PluginManager {
    private plugins: Map<string, Plugin> = new Map();

    constructor(private readonly context: PluginContext) {}

    /**
     * Add an event plugin to PluginManager and initialize the plugin.
     *
     * @param plugin The plugin which adheres to the RUM web client's plugin interface.
     */
    public addPlugin(plugin: Plugin): void {
        const pluginId = plugin.getPluginId();

        if (this.hasPlugin(pluginId)) {
            throw new Error(
                `Plugin "${pluginId}" already defined in the PluginManager`
            );
        }

        this.plugins.set(pluginId, plugin);

        // initialize plugin
        plugin.load(this.context);
    }

    /**
     * Update an event plugin
     *
     * @param pluginId
     * @param updateWith The config to update the plugin with.
     */
    public updatePlugin<O>(pluginId: string, updateWith: O) {
        const plugin = this.getPlugin(pluginId);

        plugin?.update?.(updateWith);
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
     *
     * @param pluginId a unique identifier for the plugin
     */
    public hasPlugin(pluginId: string): boolean {
        return Boolean(this.getPlugin(pluginId));
    }

    /**
     * Manually record data using a plugin.
     *
     * @param pluginId The unique identifier for the plugin being configured.
     * @param data The data to be recorded by the plugin.
     */
    public record(pluginId: string, data: any): void {
        const plugin = this.getPlugin(pluginId);
        if (plugin?.record instanceof Function) {
            plugin.record(data);
        } else {
            throw new Error('AWS RUM Client record: Invalid plugin ID');
        }
    }

    private getPlugin(id: string): Plugin | undefined {
        return (
            this.plugins.get(id) ??
            this.plugins.get(InternalPlugin.generatePluginId(id))
        );
    }
}
