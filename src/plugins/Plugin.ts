import { Page } from '../sessions/PageManager';
import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';

export type RecordEvent = (type: string, eventData: object) => void;
export type RecordPageView = (pageId: string, invokeType: string) => void;
export type GetSession = () => Session;
export type GetCurrentUrl = () => string;
export type GetCurrentPage = () => Page;
export type GetRequestCache = () => Set<XMLHttpRequest>;
export type IncrementFetch = () => void;
export type DecrementFetch = () => void;

export type PluginContext = {
    applicationId: string;
    applicationVersion: string;
    config: Config;
    record: RecordEvent;
    recordPageView: RecordPageView;
    getSession: GetSession;
    getCurrentUrl: GetCurrentUrl;
    getCurrentPage: GetCurrentPage;
    getRequestCache: GetRequestCache;
    incrementFetch: IncrementFetch;
    decrementFetch: DecrementFetch;
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
     * Manually record an event.
     * @param data Data that the plugin will use to create an event.
     */
    record?(data: any): void;
}
