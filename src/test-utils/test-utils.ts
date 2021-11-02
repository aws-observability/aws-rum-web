import { EventCache } from '../event-cache/EventCache';
import { Credentials } from '@aws-sdk/types';
import {
    Config,
    defaultConfig,
    defaultCookieAttributes
} from '../orchestration/Orchestration';
import {
    GetSession,
    PluginContext,
    RecordEvent,
    RecordPageView
} from '../plugins/Plugin';
import {
    ApplicationDetails,
    LogEventsRequest,
    UserDetails
} from '../dispatch/dataplane';
import { ReadableStream } from 'web-streams-polyfill';

export const AWS_RUM_ENDPOINT =
    'https://rumservicelambda.us-west-2.amazonaws.com';
export const AWS_RUM_REGION = 'us-west-2';
export const APPLICATION_ID = 'application123';
export const APPLICATION_VERSION = '1.2';
export const BATCH_ID = 'batch123';
export const USER_ID = 'user123';
export const SESSION_ID = 'session123';
export const AUTO_DISPATCH_OFF = 0;

export const EVENT_ID = 'event123';
export const EVENT_TYPE = 'com.amazon.rum.event1';
export const EVENT_DETAILS = '{}';
export const EVENT_TIMESTAMP = new Date(0);

export const APPLICATION_DETAILS: ApplicationDetails = {
    name: APPLICATION_ID,
    version: APPLICATION_VERSION
};

export const USER_DETAILS: UserDetails = {
    userId: USER_ID,
    sessionId: SESSION_ID
};

export const LOG_EVENTS_REQUEST: LogEventsRequest = {
    applicationId: APPLICATION_ID,
    batch: {
        batchId: BATCH_ID,
        application: APPLICATION_DETAILS,
        user: USER_DETAILS,
        events: [
            {
                id: EVENT_ID,
                timestamp: EVENT_TIMESTAMP,
                type: EVENT_TYPE,
                details: EVENT_DETAILS
            }
        ]
    }
};

export const DEFAULT_CONFIG: Config = defaultConfig(defaultCookieAttributes());

export const createDefaultEventCache = (): EventCache => {
    return new EventCache(APPLICATION_DETAILS, DEFAULT_CONFIG);
};

export const createEventCache = (config: Config): EventCache => {
    return new EventCache(APPLICATION_DETAILS, config);
};

export const createDefaultEventCacheWithEvents = (): EventCache => {
    const EVENT1_SCHEMA = 'com.amazon.rum.event1';
    const EVENT2_SCHEMA = 'com.amazon.rum.event2';
    const eventCache = new EventCache(APPLICATION_DETAILS, DEFAULT_CONFIG);
    eventCache.recordEvent(EVENT1_SCHEMA, {});
    eventCache.recordEvent(EVENT2_SCHEMA, {});
    return eventCache;
};

export const createAwsCredentials = (): Credentials => {
    return {
        accessKeyId: 'abc123',
        secretAccessKey: 'abc123xyz'
    };
};

export const createAwsError = () => {
    return {
        name: 'error-code',
        code: 'error-code',
        message: 'Something went wrong.',
        statusCode: 500,
        time: new Date()
    };
};

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const record: jest.MockedFunction<RecordEvent> = jest.fn();
export const recordPageView: jest.MockedFunction<RecordPageView> = jest.fn();
export const getSession: jest.MockedFunction<GetSession> = jest.fn(() => ({
    sessionId: 'abc123',
    record: true,
    eventCount: 0
}));
export const context: PluginContext = {
    applicationId: 'b',
    applicationVersion: '1.0',
    config: DEFAULT_CONFIG,
    record,
    recordPageView,
    getSession
};

export const stringToUtf16 = (inputString: string) => {
    const utf16array = [];
    for (let index = 0; index < inputString.length; index++) {
        utf16array[index] = inputString.charCodeAt(index);
    }
    return utf16array;
};

export const getReadableStream = (mockString: string) =>
    new ReadableStream({
        start(c) {
            c.enqueue(stringToUtf16(mockString));
            c.close();
        }
    });
