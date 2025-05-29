import { EventCache } from '../event-cache/EventCache';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import {
    Config,
    defaultConfig,
    defaultCookieAttributes
} from '../orchestration/Orchestration';
import {
    GetSession,
    InternalPluginContext,
    RecordEvent,
    RecordPageView
} from '../plugins/types';
import {
    AppMonitorDetails,
    PutRumEventsRequest,
    UserDetails
} from '../dispatch/dataplane';
import { ReadableStream } from 'web-streams-polyfill';
import EventBus from '../event-bus/EventBus';
import { INSTALL_MODULE } from '../utils/constants';

export const AWS_RUM_ENDPOINT = new URL(
    'https://rumservicelambda.us-west-2.amazonaws.com'
);
export const WEB_CLIENT_VERSION = '1.24.0';
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

export const APP_MONITOR_DETAILS: AppMonitorDetails = {
    id: APPLICATION_ID,
    version: APPLICATION_VERSION
};

export const USER_DETAILS: UserDetails = {
    userId: USER_ID,
    sessionId: SESSION_ID
};

export const PUT_RUM_EVENTS_REQUEST: PutRumEventsRequest = {
    BatchId: BATCH_ID,
    AppMonitorDetails: APP_MONITOR_DETAILS,
    UserDetails: USER_DETAILS,
    RumEvents: [
        {
            id: EVENT_ID,
            timestamp: EVENT_TIMESTAMP,
            type: EVENT_TYPE,
            details: EVENT_DETAILS
        }
    ]
};

export const DEFAULT_CONFIG: Config = defaultConfig(defaultCookieAttributes());

export const createDefaultEventCache = (): EventCache => {
    return new EventCache(APP_MONITOR_DETAILS, DEFAULT_CONFIG);
};

export const createEventCache = (
    config: Partial<Config> = {},
    bus?: EventBus
): EventCache => {
    return new EventCache(
        APP_MONITOR_DETAILS,
        { ...DEFAULT_CONFIG, ...config },
        bus
    );
};

export const createDefaultEventCacheWithEvents = (): EventCache => {
    const EVENT1_SCHEMA = 'com.amazon.rum.event1';
    const EVENT2_SCHEMA = 'com.amazon.rum.event2';
    const eventCache = new EventCache(APP_MONITOR_DETAILS, DEFAULT_CONFIG);
    eventCache.recordEvent(EVENT1_SCHEMA, {});
    eventCache.recordEvent(EVENT2_SCHEMA, {});
    return eventCache;
};

export const createAwsCredentials = (): AwsCredentialIdentity => {
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
export const recordCandidate: jest.MockedFunction<RecordEvent> = jest.fn();
export const recordPageView: jest.MockedFunction<RecordPageView> = jest.fn();
export const getSession: jest.MockedFunction<GetSession> = jest.fn(() => ({
    sessionId: 'abc123',
    record: true,
    eventCount: 0
}));

export const context: InternalPluginContext = {
    applicationId: 'b',
    applicationVersion: '1.0',
    config: DEFAULT_CONFIG,
    record,
    recordCandidate,
    recordPageView,
    getSession,
    eventBus: new EventBus()
};

export const xRayOffContext: InternalPluginContext = {
    ...context,
    config: { ...DEFAULT_CONFIG, ...{ enableXRay: false } }
};

export const xRayOnContext: InternalPluginContext = {
    ...context,
    config: { ...DEFAULT_CONFIG, ...{ enableXRay: true } }
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

export const mockFetch = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'Content-Length': '125' }),
            body: '{}',
            ok: true
        } as any)
);

export const mockFetchWith500 = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 500,
            statusText: 'InternalError',
            headers: new Headers({ 'Content-Length': '125' }),
            body: '',
            ok: false
        } as any)
);

export const mockFetchWith400 = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 404,
            statusText: 'Not Found',
            headers: new Headers({ 'Content-Length': '125' }),
            body: '',
            ok: false
        } as any)
);

export const mockFetchWith429 = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 429,
            statusText: 'Too Many Requests',
            headers: new Headers({ 'Content-Length': '125' }),
            body: '',
            ok: false
        } as any)
);

export const mockFetchWithError = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject('Timeout')
);

export const mockFetchWithErrorObject = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject(new Error('Timeout'))
);

export const mockFetchWithErrorObjectAndStack = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject({
            name: 'FetchError',
            message: 'timeout',
            stack: 'stack trace'
        })
);

export const createExpectedEvents = (types: string[], expect: any) =>
    types.map((type) => ({
        id: expect.stringMatching(/[0-9a-f\-]+/),
        timestamp: new Date(),
        type,
        metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
        details: '{}'
    }));

export const testMetaData = {
    version: '1.0.0',
    'aws:client': INSTALL_MODULE,
    'aws:clientVersion': WEB_CLIENT_VERSION,
    domain: 'us-east-1.console.aws.amazon.com',
    browserLanguage: 'en-US',
    browserName: 'WebKit',
    browserVersion: '537.36',
    osName: 'unknown',
    osVersion: 'unknown',
    deviceType: 'desktop',
    platformType: 'web',
    pageId: '/console/home',
    title: ''
};
