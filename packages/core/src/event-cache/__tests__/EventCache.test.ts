import { EventCache } from '../EventCache';
import { advanceTo } from 'jest-date-mock';
import {
    createEventCache,
    createDefaultEventCache,
    createExpectedEvents
} from '../../test-utils/test-utils';
import { WEB_CLIENT_VERSION } from '../../test-utils/test-utils';
import { RumEvent } from '../../dispatch/dataplane';
import { DEFAULT_CONFIG, mockFetch } from '../../test-utils/test-utils';
import { INSTALL_MODULE, INSTALL_SCRIPT } from '../../utils/constants';
import EventBus, { Topic } from '../../event-bus/EventBus';
jest.mock('../../event-bus/EventBus');

global.fetch = mockFetch;

/**
 * SessionManager should be mocked because this file is only for unit testing the EventCache.
 * The integration with Sessionmanager is covered in other test suites.
 **/

/** SessionManager mock state */
let mockEventCount = 0;
let mockSession = {
    sessionId: 'a',
    record: true,
    eventCount: 0
};
let mockEventLimit = DEFAULT_CONFIG.sessionEventLimit;
let samplingDecision = true;

/** SessionManager mock methods */
const getSession = jest.fn(() => {
    return {
        ...mockSession,
        eventCount: mockEventCount
    };
});
const incrementSessionEventCount = jest.fn(() => {
    mockEventCount++;
});
const isLimitExceeded = jest.fn(() => {
    return mockEventLimit > 0 && mockEventCount >= mockEventLimit;
});
const canRecord = jest.fn(() => {
    return (
        mockSession.record &&
        (mockEventCount < mockEventLimit || mockEventLimit <= 0)
    );
});
const getUserId = jest.fn(() => 'b');
const getAttributes = jest.fn();
const addSessionAttributes = jest.fn();
const isSampled = jest.fn().mockImplementation(() => samplingDecision);

/** Init Mock SessionManager */
jest.mock('../../sessions/SessionManager', () => ({
    SessionManager: jest.fn().mockImplementation(() => ({
        getSession,
        getUserId,
        getAttributes,
        incrementSessionEventCount,
        addSessionAttributes,
        isSampled,
        canRecord,
        isLimitExceeded
    }))
}));

describe('EventCache tests', () => {
    let eventCache = createDefaultEventCache();
    const EVENT1_SCHEMA = 'com.amazon.rum.event1';
    const EVENT2_SCHEMA = 'com.amazon.rum.event2';

    beforeAll(() => {
        advanceTo(0);
    });

    beforeEach(() => {
        /** Reset SessionManager mock state */
        mockEventCount = 0;
        mockSession = {
            sessionId: 'a',
            record: true,
            eventCount: 0
        };
        mockEventLimit = DEFAULT_CONFIG.sessionEventLimit;
        samplingDecision = true;

        /** Reset event cache */
        eventCache = createDefaultEventCache();
    });

    test('record does nothing when cache is disabled', async () => {
        // Init

        // Run
        eventCache.getEventBatch();
        eventCache.disable();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(false);
    });

    test('meta data and events are recorded when cache is disabled then enabled', async () => {
        // Init

        // Run
        eventCache.disable();
        eventCache.enable();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(true);
    });

    test('getEventBatch deletes events', async () => {
        // Init

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(true);
        eventCache.getEventBatch();
        expect(eventCache.hasEvents()).toBe(false);
    });

    test('recordEvent appends events', async () => {
        // Init

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual(
            createExpectedEvents([EVENT1_SCHEMA, EVENT2_SCHEMA], expect)
        );
    });

    test('getEventBatch limits number of events to batchLimit', async () => {
        // Init
        const BATCH_LIMIT = 1;
        eventCache = createEventCache({ batchLimit: BATCH_LIMIT });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch().length).toEqual(BATCH_LIMIT);
        expect(eventCache.getEventBatch().length).toEqual(BATCH_LIMIT);
        expect(eventCache.getEventBatch().length).toEqual(0);
    });

    test('getEventBatch returns events in FIFO order', async () => {
        // Init
        eventCache = createEventCache({ batchLimit: 1 });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch()[0].type).toEqual(EVENT1_SCHEMA);
        expect(eventCache.getEventBatch()[0].type).toEqual(EVENT2_SCHEMA);
    });

    test('when cache size reached, recordEvent drops the newest event', async () => {
        // Init
        eventCache = createEventCache({
            eventCacheSize: 1
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});
        const batch = eventCache.getEventBatch();

        // Assert
        expect(batch).toHaveLength(1);
        expect(batch).toEqual(createExpectedEvents([EVENT1_SCHEMA], expect));
        expect(eventCache.hasEvents()).toBe(false);
    });

    test('when page is denied, recordEvent does not record the event', async () => {
        // Init
        eventCache = createEventCache({
            pagesToExclude: [/.*/]
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(false);
    });

    test('when page is allowed, recordEvent records the event', async () => {
        // Init

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch()).toEqual(
            createExpectedEvents([EVENT1_SCHEMA], expect)
        );
    });

    test('when page is recorded with page tags provided, event metadata records the page tag data', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.page_view_event';

        // Run
        eventCache.recordPageView({
            pageId: '/rum/home',
            pageTags: ['pageGroup1']
        });

        // Assert
        expect(eventCache.getEventBatch()).toEqual([
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"title":"","pageId":"/rum/home","pageTags":["pageGroup1"],"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{"version":"1.0.0","pageId":"/rum/home"}'
            }
        ]);
    });

    test('when page is recorded with custom page attributes, metadata records the custom page attributes', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.page_view_event';
        // Run
        eventCache.recordPageView({
            pageId: '/rum/home',
            pageTags: ['pageGroup1'],
            pageAttributes: {
                customPageAttributeString: 'customPageAttributeValue',
                customPageAttributeNumber: 1,
                customPageAttributeBoolean: true
            }
        });

        // Assert
        expect(eventCache.getEventBatch()).toEqual([
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"customPageAttributeString":"customPageAttributeValue","customPageAttributeNumber":1,"customPageAttributeBoolean":true,"title":"","pageId":"/rum/home","pageTags":["pageGroup1"],"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{"version":"1.0.0","pageId":"/rum/home"}'
            }
        ]);
    });

    /**
     * Test title truncated to meet lint requirements
     * Full title: when EventCache.addSessionAttributes() is called then SessionManager.addSessionAttributes() is called
     */
    test('EventCache.addSessionAttributes() calls SessionManager.addSessionAttributes()', async () => {
        // Init
        const expected = {
            customAttributeString: 'customAttributeValue',
            customAttributeNumber: 1,
            customAttributeBoolean: true
        };

        // Run
        eventCache.addSessionAttributes(expected);

        // Assert
        expect(addSessionAttributes).toHaveBeenCalledTimes(1);
        const actual = addSessionAttributes.mock.calls[0][0];

        expect(actual).toEqual(expected);
    });

    test('when page matches both allowed and denied, recordEvent does not record the event', async () => {
        // Init
        eventCache = createEventCache({
            pagesToInclude: [/.*/],
            pagesToExclude: [/.*/]
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(false);
    });

    test('recordEvent appends web client version to metadata ', async () => {
        // Init

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual(
            createExpectedEvents([EVENT1_SCHEMA], expect)
        );
    });

    test('is web client installed using script, append installation method set as script to metadata', async () => {
        // Init
        eventCache = createEventCache({ client: INSTALL_SCRIPT });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual([
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_SCRIPT}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ]);
    });

    test('is web client installed using module, append installation method set as module to metadata', async () => {
        // Init

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual([
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ]);
    });

    test('when a session is not sampled then return false', async () => {
        // Init
        samplingDecision = false;

        // Assert
        expect(eventCache.isSessionSampled()).toBe(false);

        // Reset
        samplingDecision = true;
    });

    test('when a session is sampled then return true', async () => {
        // Init
        eventCache = createEventCache({
            sessionSampleRate: 1
        });

        // Assert
        expect(eventCache.isSessionSampled()).toBe(true);
    });

    test('when session.record is false then event is not recorded', async () => {
        // Init
        mockSession.record = false;

        // Run
        eventCache.getEventBatch();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(false);
    });

    test('when session.record is true then event is recorded', async () => {
        // Init

        const eventCache: EventCache = createDefaultEventCache();

        // Run
        eventCache.getEventBatch();
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.hasEvents()).toBe(true);
    });

    test('when event limit is reached then recordEvent does not record events', async () => {
        // Init
        mockEventLimit = 1;
        const eventCache: EventCache = createDefaultEventCache();

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch().length).toEqual(1);
    });

    test('when event is recorded then events subscribers are notified with parsed rum event', async () => {
        // Init
        const bus = new EventBus();
        const eventCache: EventCache = createEventCache(DEFAULT_CONFIG, bus);
        const event = {
            id: expect.stringMatching(/[0-9a-f\-]+/),
            timestamp: new Date(),
            type: EVENT1_SCHEMA,
            metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
            details: '{}'
        };

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch = eventCache.getEventBatch();
        expect(eventBatch).toEqual([event]);
        // eslint-disable-next-line
        expect(bus.dispatch).toHaveBeenCalledWith(
            Topic.EVENT,
            expect.objectContaining({
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: expect.objectContaining({
                    version: '1.0.0',
                    'aws:client': INSTALL_MODULE,
                    'aws:clientVersion': WEB_CLIENT_VERSION
                }),
                details: expect.objectContaining({})
            })
        );
    });

    test('when cache is disabled then subscribers are not notified', async () => {
        // Init
        const bus = new EventBus();
        eventCache = createEventCache({}, bus);
        // Run
        eventCache.disable();
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();
        expect(eventBatch).toHaveLength(0);
        expect(bus.dispatch).not.toHaveBeenCalled(); // eslint-disable-line
    });

    test('when event limit is zero then recordEvent records all events', async () => {
        // Init
        mockEventLimit = 0;
        eventCache = createEventCache({ eventCacheSize: 10, batchLimit: 10 });

        // Run and assert
        for (let i = 0; i < 10; i++) {
            for (let k = 0; k < 10; k++) {
                eventCache.recordEvent(EVENT1_SCHEMA, {});
            }
            expect(eventCache.getEventBatch().length).toEqual(10);
            expect(eventCache.hasEvents()).toEqual(false);
        }
        expect(eventCache.hasEvents()).toEqual(false);
    });

    test('WHEN batch is created THEN candidates are not pulled unless explicitly flushed', async () => {
        // Init
        const candidateTypes = ['a', 'b', 'c', 'd', 'e'];
        const eventTypes = candidateTypes.map((x) => `${x}_event`);

        // Run
        for (let i = 0; i < candidateTypes.length; i++) {
            eventCache.recordCandidate(candidateTypes[i], {});
            eventCache.recordEvent(eventTypes[i], {});
        }

        // Assert
        expect(eventCache.getEventBatch().map((x) => x.type)).toEqual(
            eventTypes
        );
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual(
            candidateTypes
        );
    });

    test('WHEN batch is created with candidates THEN candidates are pulled in FIFO order', async () => {
        // Init
        const types = ['a', 'b', 'c', 'd', 'e'];

        // Run
        for (const type of types) {
            eventCache.recordCandidate(type, {});
        }
        const eventBatch = eventCache.getEventBatch(true);

        // Assert
        expect(eventBatch.map((x) => x.type)).toEqual(types);
    });

    test('WHEN batch is created with candidates THEN candidates prioritized over regular events in FIFO order', async () => {
        // Init
        const candidateTypes = ['a', 'b', 'c', 'd', 'e'];
        const eventTypes = candidateTypes.map((x) => `${x}_event`);

        // Run
        for (let i = 0; i < candidateTypes.length; i++) {
            eventCache.recordCandidate(candidateTypes[i], {});
            eventCache.recordEvent(eventTypes[i], {});
        }

        // Assert
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual([
            ...candidateTypes,
            ...eventTypes
        ]);
    });

    test('WHEN batch is created and candidates exceed batchLimit THEN batchLimit is enforced repeatedly', async () => {
        const candidateTypes = ['a', 'b', 'c', 'd', 'e'];
        const eventTypes = candidateTypes.map((x) => `${x}_event`);

        // Init
        eventCache = createEventCache({
            batchLimit: 3
        });

        // Run
        for (let i = 0; i < candidateTypes.length; i++) {
            eventCache.recordCandidate(candidateTypes[i], {});
            eventCache.recordEvent(eventTypes[i], {});
        }

        // Assert
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual([
            'a',
            'b',
            'c'
        ]);
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual([
            'd',
            'e',
            'a_event'
        ]);
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual([
            'b_event',
            'c_event',
            'd_event'
        ]);
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual([
            'e_event'
        ]);
        expect(eventCache.getEventBatch(true).map((x) => x.type)).toEqual([]);
    });

    test('ON new candidate WHEN plugin disabled THEN do not record', async () => {
        // Init
        eventCache.disable();
        const eventType = 'test-event';
        const eventData = { test: 'data' };

        // Run
        eventCache.recordCandidate(eventType, eventData);

        // Assert
        expect(eventCache.hasCandidates()).toBe(false);
    });

    test('ON new candidate WHEN session disabled THEN do not record', async () => {
        // Init
        mockSession.record = false;
        const eventType = 'test-event';
        const eventData = { test: 'data' };

        // Run
        eventCache.recordCandidate(eventType, eventData);

        // Assert
        expect(eventCache.hasCandidates()).toBe(false);
    });

    test('ON new candidate WHEN candidatesCacheSize exceeded THEN do not record', async () => {
        // Init
        eventCache = createEventCache({ candidatesCacheSize: 1 });

        // Run
        eventCache.recordCandidate('event1', { data: '1' });
        eventCache.recordCandidate('event2', { data: '2' });

        // Assert
        const batch = eventCache.getEventBatch(true);
        expect(batch.length).toBe(1);
        expect(batch[0].type).toBe('event1');
    });

    test('ON new candidate WHEN sessionEventLimit exceeded THEN do not record', async () => {
        // Init
        mockEventLimit = 1;
        mockEventCount = 1;
        const eventType = 'test-event';
        const eventData = { test: 'data' };

        // Run
        eventCache.recordCandidate(eventType, eventData);

        // Assert
        expect(eventCache.hasCandidates()).toBe(false);
    });

    test('ON new candidate WHEN sessionEventLimit is unlimited THEN record', async () => {
        // Init
        mockEventLimit = 0; // 0 means unlimited
        mockEventCount = 1000;
        const eventType = 'test-event';
        const eventData = { test: 'data' };

        // Run
        eventCache.recordCandidate(eventType, eventData);

        // Assert
        expect(eventCache.hasCandidates()).toBe(true);
        const batch = eventCache.getEventBatch(true);
        expect(batch.length).toBe(1);
    });

    test('ON new candidate WHEN isCurrentUrlNotAllowed THEN do not record', async () => {
        // Init
        jest.spyOn(eventCache as any, 'isCurrentUrlAllowed').mockReturnValue(
            false
        );
        const eventType = 'test-event';
        const eventData = { test: 'data' };

        // Run
        eventCache.recordCandidate(eventType, eventData);

        // Assert
        expect(eventCache.hasCandidates()).toBe(false);
    });

    test('ON existing candidate WHEN plugin disabled THEN do not record', async () => {
        // Init

        // Run
        eventCache.recordCandidate(EVENT1_SCHEMA, { data: '1' });
        expect(eventCache.hasCandidates()).toBe(true);

        eventCache.disable();
        eventCache.recordCandidate(EVENT1_SCHEMA, { data: '2' });
        const batch = eventCache.getEventBatch(true);

        // Assert
        expect(batch).toHaveLength(1);
        expect(JSON.parse(batch[0].details)).toEqual({ data: '1' });
    });

    test('ON existing candidate WHEN session disabled THEN do not record', async () => {
        // Run
        eventCache.recordCandidate(EVENT1_SCHEMA, { data: 1 });
        expect(eventCache.hasCandidates()).toBe(true);

        mockSession.record = false;
        eventCache.recordCandidate(EVENT1_SCHEMA, { data: 2 });
        const batch = eventCache.getEventBatch(true);

        // Assert
        expect(batch).toHaveLength(1);
        expect(JSON.parse(batch[0].details)).toEqual({ data: 1 });
    });

    test('ON existing candidate WHEN candidatesCacheSize exceeded THEN update candidate', async () => {
        // Init
        eventCache = createEventCache({ candidatesCacheSize: 1 });

        // Run
        eventCache.recordCandidate('event1', { data: '1' });
        eventCache.recordCandidate('event1', { data: '2' });

        // Assert
        const batch = eventCache.getEventBatch(true);
        expect(batch.length).toBe(1);
        expect(batch[0].type).toBe('event1');
        expect(JSON.parse(batch[0].details)).toEqual({ data: '2' });
    });

    test('ON existing candidate WHEN sessionEventLimit exceeded THEN update candidate', async () => {
        // Init
        mockEventLimit = 1;
        const eventType = 'test-event';

        // Run
        eventCache.recordCandidate(eventType, { data: '1' });
        eventCache.recordCandidate(eventType, { data: '2' });

        // Assert
        const batch = eventCache.getEventBatch(true);
        expect(batch.length).toBe(1);
        expect(JSON.parse(batch[0].details)).toEqual({ data: '2' });
    });

    test('getEventBatch calls pluginFlushHook when flush is true', async () => {
        const eventCache = createDefaultEventCache();
        const hook = jest.fn();
        eventCache.setPluginFlushHook(hook);

        eventCache.recordEvent('com.amazon.rum.event1', {});
        eventCache.getEventBatch(true);

        expect(hook).toHaveBeenCalledTimes(1);
    });

    test('getEventBatch does not call pluginFlushHook when flush is false', async () => {
        const eventCache = createDefaultEventCache();
        const hook = jest.fn();
        eventCache.setPluginFlushHook(hook);

        eventCache.recordEvent('com.amazon.rum.event1', {});
        eventCache.getEventBatch();

        expect(hook).not.toHaveBeenCalled();
    });
});
