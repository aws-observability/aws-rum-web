import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';
import EventBus, { Topic } from '../event-bus/EventBus';

export type RecordEvent = (
    type: string,
    eventData: object,
    internalMessage?: any
) => void;
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
