import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';

export type RecordEvent = (type: string, eventData: object) => void;
export type RecordPageView = (pageId: string) => void;

export type GetSession = () => Session;

export type PluginContext = {
    applicationId: string;
    applicationName: string;
    applicationVersion: string;
    config: Config;
    record: RecordEvent;
    recordPageView: RecordPageView;
    getSession: GetSession;
};

export interface Plugin {
    /**
     * Load the plugin. The plugin should initialize itself and start recording events
     * for which it is configured.
     * @param recordEvent A callback to record event data.
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
     * Configure the plugin. The plugin should start or stop recording events for
     * which it is configured.
     * @param config The configuration for the plugin (e.g., enable/disable events).
     */
    configure(config: object): void;

    /**
     * Manually record an event.
     * @param data Data that the plugin will use to create an event.
     */
    record?(data: any): void;
}
