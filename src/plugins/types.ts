import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';

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
};
