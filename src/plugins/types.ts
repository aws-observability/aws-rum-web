import { EventCache } from '../event-cache/EventCache';
import { Config } from '../orchestration/Orchestration';

type EventCacheInstanceType = InstanceType<typeof EventCache>;
export type RecordEvent = EventCacheInstanceType['recordEvent'];
export type RecordPageView = EventCacheInstanceType['recordPageView'];
export type GetSession = EventCacheInstanceType['getSession'];
export type GetPage = EventCacheInstanceType['getPage'];

export type PluginContext = {
    applicationId: string;
    applicationVersion: string;
    config: Config;
    record: RecordEvent;
    recordPageView: RecordPageView;
    getSession: GetSession;
    getPage: GetPage;
};
