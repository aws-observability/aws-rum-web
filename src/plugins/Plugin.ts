import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';
import { RUM_AWS_PREFIX } from './utils/constant';

export type RecordEvent = (type: string, eventData: object) => void;
export type RecordPageView = (pageId: string) => void;

export type GetSession = () => Session;

export type PluginContext = {
    applicationId: string;
    applicationVersion: string;
    config: Config;
    record: RecordEvent;
    recordPageView: RecordPageView;
    getSession: GetSession;
};

export abstract class Plugin {
    protected enabled: boolean = true;

    constructor(
        public readonly pluginName: string,
        private readonly pluginId = `${RUM_AWS_PREFIX}.${pluginName}`
    ) {}

    public getPluginId() {
        return this.pluginId;
    }

    /**
     * Load the plugin. The plugin should initialize itself and start recording events
     * for which it is configured.
     * @param context
     */
    abstract load(context: PluginContext): void;

    /**
     * Enable the plugin. The plugin may record events.
     */
    abstract enable(): void;

    /**
     * Disable the plugin. The plugin should remove event listeners and cease recording events.
     */
    abstract disable(): void;

    /**
     * Manually record an event.
     * @param data Data that the plugin will use to create an event.
     */
    record?(data: any): void;

    /**
     * Update the plugin.
     * @param config Data that the plugin will use to update its config.
     */
    update?(config: object): void;
}
