import { EventCache } from '../EventCache';
import { advanceTo } from 'jest-date-mock';
import * as Utils from '../../test-utils/test-utils';
import { SessionManager } from '../../sessions/SessionManager';
import { EventBatch, Event } from '../../dispatch/dataplane';
import { DEFAULT_CONFIG } from '../../test-utils/test-utils';

const getSession = jest.fn(() => ({
    sessionId: 'a',
    record: true,
    eventCount: 1
}));
const getUserId = jest.fn(() => 'b');
const getAttributes = jest.fn(() => {});
const incrementSessionEventCount = jest.fn();
jest.mock('../../sessions/SessionManager', () => ({
    SessionManager: jest.fn().mockImplementation(() => ({
        getSession,
        getUserId,
        getAttributes,
        incrementSessionEventCount
    }))
}));

describe('EventCache tests', () => {
    beforeAll(() => {
        advanceTo(0);
    });

    beforeEach(() => {
        getSession.mockClear();
        getUserId.mockClear();
        incrementSessionEventCount.mockClear();
    });

    test('record does nothing when cache is disabled', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();

        // Run
        eventCache.getEventBatch();
        eventCache.disable();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeFalsy();
    });

    test('meta data and events are recorded when cache is disabled then enabled', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();

        // Run
        eventCache.disable();
        eventCache.enable();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeTruthy();
    });

    test('getEventBatch deletes events', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const EVENT2_SCHEMA = 'com.amazon.rum.event2';
        const eventCache: EventCache = Utils.createDefaultEventCache();

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeTruthy();
        eventCache.getEventBatch();
        expect(eventCache.hasEvents()).toBeFalsy();
    });

    test('recordEvent appends events', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const EVENT2_SCHEMA = 'com.amazon.rum.event2';
        const eventCache: EventCache = Utils.createDefaultEventCache();
        const expectedEvents: Event[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: '{"version":"1.0.0"}',
                details: '{}'
            },
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT2_SCHEMA,
                metadata: '{"version":"1.0.0"}',
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});
        const eventBatch: EventBatch = eventCache.getEventBatch();

        // Assert
        expect(eventBatch.events).toEqual(
            expect.arrayContaining(expectedEvents)
        );
    });

    test('getEventBatch limits number of events to batchLimit', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const EVENT2_SCHEMA = 'com.amazon.rum.event2';
        const BATCH_LIMIT = 1;
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            ...{ batchLimit: BATCH_LIMIT }
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        // @ts-ignore
        expect(eventCache.getEventBatch().events.length).toEqual(BATCH_LIMIT);
        // @ts-ignore
        expect(eventCache.getEventBatch().events.length).toEqual(BATCH_LIMIT);
        // @ts-ignore
        expect(eventCache.getEventBatch().events.length).toEqual(0);
    });

    test('getEventBatch returns events in FIFO order', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const EVENT2_SCHEMA = 'com.amazon.rum.event2';
        const BATCH_LIMIT = 1;
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            ...{ batchLimit: BATCH_LIMIT }
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        // @ts-ignore
        expect(eventCache.getEventBatch().events[0].type).toEqual(
            EVENT1_SCHEMA
        );
        // @ts-ignore
        expect(eventCache.getEventBatch().events[0].type).toEqual(
            EVENT2_SCHEMA
        );
    });

    test('when cache size reached, recordEvent drops oldest event', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const EVENT2_SCHEMA = 'com.amazon.rum.event2';
        const BATCH_LIMIT = 20;
        const EVENT_LIMIT = 2;
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            ...{
                batchLimit: BATCH_LIMIT,
                eventCacheSize: EVENT_LIMIT
            }
        });
        const expectedEvents: Event[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT2_SCHEMA,
                metadata: '{"version":"1.0.0"}',
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        expect((await eventCache.getEventBatch()).events).toEqual(
            expect.arrayContaining(expectedEvents)
        );
        expect(eventCache.hasEvents()).toBeFalsy();
    });

    test('when page is denied, recordEvent does not record the event', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            ...{
                pagesToExclude: [/.*/]
            }
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeFalsy();
    });

    test('when page is allowed, recordEvent records the event', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            ...{
                pagesToInclude: [/.*/]
            }
        });
        const expectedEvents: Event[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: '{"version":"1.0.0"}',
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect((await eventCache.getEventBatch()).events).toEqual(
            expect.arrayContaining(expectedEvents)
        );
    });

    test('when page matches both allowed and denied, recordEvent does not record the event', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            ...{
                pagesToInclude: [/.*/],
                pagesToExclude: [/.*/]
            }
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeFalsy();
    });

    test('when session.record is false then event is not recorded', async () => {
        // Init
        const getSession = jest.fn(() => ({ sessionId: 'a', record: true }));
        const getUserId = jest.fn(() => 'b');
        const incrementSessionEventCount = jest.fn();
        // @ts-ignore
        SessionManager.mockImplementation(() => ({
            getSession,
            getUserId,
            incrementSessionEventCount
        }));

        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();

        // Run
        eventCache.getEventBatch();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeFalsy();
    });

    test('when session.record is true then event is recorded', async () => {
        // Init
        const getSession = jest.fn(() => ({
            sessionId: 'a',
            record: true,
            eventCount: 1
        }));
        const getUserId = jest.fn(() => 'b');
        const getAttributes = jest.fn(() => {});
        const incrementSessionEventCount = jest.fn();
        // @ts-ignore
        SessionManager.mockImplementation(() => ({
            getSession,
            getUserId,
            getAttributes,
            incrementSessionEventCount
        }));

        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();

        // Run
        eventCache.getEventBatch();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBeTruthy();
    });

    test('when event limit is reached then recordEvent does not record events', async () => {
        // Init
        let eventCount = 0;
        const getSession = jest.fn().mockImplementation(() => {
            eventCount++;
            return {
                sessionId: 'a',
                record: true,
                eventCount: eventCount - 1
            };
        });
        const getUserId = jest.fn(() => 'b');
        const getAttributes = jest.fn(() => {});
        const incrementSessionEventCount = jest.fn();
        // @ts-ignore
        SessionManager.mockImplementation(() => ({
            getSession,
            getUserId,
            getAttributes,
            incrementSessionEventCount
        }));
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                sessionEventLimit: 1
            }
        };
        const eventCache: EventCache = Utils.createEventCache(config);

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch().events.length).toEqual(1);
    });

    test('when event limit is zero then recordEvent records all events', async () => {
        // Init
        let eventCount = 0;
        const getSession = jest.fn(() => ({ sessionId: 'a', record: true }));
        const getUserId = jest.fn(() => 'b');
        const getAttributes = jest.fn(() => {});
        const incrementSessionEventCount = jest.fn();
        // @ts-ignore
        SessionManager.mockImplementation(() => ({
            getSession,
            getUserId,
            getAttributes,
            incrementSessionEventCount
        }));
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                sessionEventLimit: 0
            }
        };
        const eventCache: EventCache = Utils.createEventCache(config);

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch().events.length).toEqual(1);
    });
});
