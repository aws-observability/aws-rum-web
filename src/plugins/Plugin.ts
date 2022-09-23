import { PluginContext } from './types';

export interface Plugin<UpdateType = unknown> {
    /**
     * Load the plugin. The plugin should initialize itself and start recording events
     * for which it is configured.
     *
     * @param context
     */
    load(context: PluginContext): void;

    /**
     * Enable the plugin. The plugin may record events.
     */
    enable(): void;

    /**
     * Disable the plugin. The plugin should remove event listeners and cease recording events.
     */
    disable(): void;

    /**
     * Returns a unique identifier for the plugin.
     */
    getPluginId(): string;

    /**
     * Manually record an event.
     *
     * @param data Data that the plugin will use to create an event.
     */
    record?<D>(data: D): void;

    /**
     * Update the plugin.
     *
     * @param updateWith Data that the plugin will use to update its config.
     */
    update?(updateWith: UpdateType): void;
}
