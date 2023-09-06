import { Config } from '../orchestration/Orchestration';
import { Session } from '../sessions/SessionManager';
import EventBus from '../event-bus/EventBus';
import { ParsedRumEvent } from 'dispatch/dataplane';

export type RecordEvent = (
    type: string,
    eventData: object
) => ParsedRumEvent | void;
export type RecordPageView = (pageId: string) => void;
export type GetSession = () => Session | undefined;

export type PluginContext = {
    applicationId: string;
    applicationVersion: string;
    config: Config;
    record: RecordEvent;
    recordPageView: RecordPageView;
    getSession: GetSession;
    bus: EventBus;
};
