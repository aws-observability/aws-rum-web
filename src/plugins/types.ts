import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';
import EventBus, { Topic } from '../event-bus/EventBus';

export interface RecordEventOptions {
    replaceFirstMatch?: boolean;
    isCandidate?: boolean;
}

export const defaultRecordEventOptions: RecordEventOptions = {
    replaceFirstMatch: false,
    isCandidate: false
};

export type RecordEvent = (
    type: string,
    eventData: object,
    options?: RecordEventOptions
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
