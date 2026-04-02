import { Config } from '../orchestration/config';
import { Session } from '../sessions/SessionManager';
import EventBus, { Topic } from '../event-bus/EventBus';

export type RecordEvent = (type: string, eventData: object) => void;
export type RecordPageView = (pageId: string) => void;
export type GetSession = () => Session | undefined;

export type PluginContext = {
    applicationId: string;
    applicationVersion: string;
    config: Config;
    record: RecordEvent;
    recordPageView: RecordPageView;
    getSession: GetSession;
    eventBus: EventBus<Topic>;
};

/** Private configs used by InternalPlugins */
export interface InternalPluginContext extends PluginContext {
    recordCandidate: RecordEvent;
}
