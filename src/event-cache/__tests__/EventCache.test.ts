import { EventCache } from '../EventCache';
import { advanceTo } from 'jest-date-mock';
import * as Utils from '../../test-utils/test-utils';
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
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            },
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT2_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual(expect.arrayContaining(expectedEvents));
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
        expect(eventCache.getEventBatch().length).toEqual(BATCH_LIMIT);
        expect(eventCache.getEventBatch().length).toEqual(BATCH_LIMIT);
        expect(eventCache.getEventBatch().length).toEqual(0);
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
        expect(eventCache.getEventBatch()[0].type).toEqual(EVENT1_SCHEMA);
        expect(eventCache.getEventBatch()[0].type).toEqual(EVENT2_SCHEMA);
    });

    test('when cache size reached, recordEvent drops the newest event', async () => {
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
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT2_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch()).toEqual(
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
            ...DEFAULT_CONFIG
        });
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch()).toEqual(
            expect.arrayContaining(expectedEvents)
        );
    });

    test('when page is recorded with page tags provided, event metadata records the page tag data', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.page_view_event';
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG
        });
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"title":"","pageId":"/rum/home","pageTags":["pageGroup1"],"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{"version":"1.0.0","pageId":"/rum/home"}'
            }
        ];

        // Run
        eventCache.recordPageView({
            pageId: '/rum/home',
            pageTags: ['pageGroup1']
        });

        // Assert
        expect(eventCache.getEventBatch()).toEqual(
            expect.arrayContaining(expectedEvents)
        );
    });

    test('when page is recorded with custom page attributes, metadata records the custom page attributes', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.page_view_event';
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG
        });
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"customPageAttributeString":"customPageAttributeValue","customPageAttributeNumber":1,"customPageAttributeBoolean":true,"title":"","pageId":"/rum/home","pageTags":["pageGroup1"],"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{"version":"1.0.0","pageId":"/rum/home"}'
            }
        ];

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
        expect(eventCache.getEventBatch()).toEqual(
            expect.arrayContaining(expectedEvents)
        );
    });

    /**
     * Test title truncated to meet lint requirements
     * Full title: when EventCache.addSessionAttributes() is called then SessionManager.addSessionAttributes() is called
     */
    test('EventCache.addSessionAttributes() calls SessionManager.addSessionAttributes()', async () => {
        // Init
        const eventCache: EventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG
        });

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

    test('recordEvent appends web client version to metadata ', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual(expect.arrayContaining(expectedEvents));
    });

    test('is web client installed using script, append installation method set as script to metadata', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = new EventCache(
            Utils.APP_MONITOR_DETAILS,
            {
                ...DEFAULT_CONFIG,
                client: INSTALL_SCRIPT
            }
        );
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_SCRIPT}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual(expect.arrayContaining(expectedEvents));
    });

    test('is web client installed using module, append installation method set as module to metadata', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();
        const expectedEvents: RumEvent[] = [
            {
                id: expect.stringMatching(/[0-9a-f\-]+/),
                timestamp: new Date(),
                type: EVENT1_SCHEMA,
                metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
                details: '{}'
            }
        ];

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();

        // Assert
        expect(eventBatch).toEqual(expect.arrayContaining(expectedEvents));
    });

    test('when a session is not sampled then return false', async () => {
        // Init
        samplingDecision = false;

        const config = {
            ...DEFAULT_CONFIG,
            ...{
                sessionSampleRate: 0
            }
        };

        const eventCache: EventCache = Utils.createEventCache(config);

        // Assert
        expect(eventCache.isSessionSampled()).toBeFalsy();

        // Reset
        samplingDecision = true;
    });

    test('when a session is sampled then return true', async () => {
        // Init
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                sessionSampleRate: 1
            }
        };

        const eventCache: EventCache = Utils.createEventCache(config);

        // Assert
        expect(eventCache.isSessionSampled()).toBeTruthy();
    });

    test('when session.record is false then event is not recorded', async () => {
        // Init
        mockSession.record = false;

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
        mockEventLimit = 1;
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache: EventCache = Utils.createDefaultEventCache();

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch().length).toEqual(1);
    });

    test('when event is recorded then events subscribers are notified with parsed rum event', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const bus = new EventBus();
        const eventCache: EventCache = Utils.createEventCache(
            DEFAULT_CONFIG,
            bus
        );

        const event = {
            id: expect.stringMatching(/[0-9a-f\-]+/),
            timestamp: new Date(),
            type: EVENT1_SCHEMA,
            metadata: `{"version":"1.0.0","aws:client":"${INSTALL_MODULE}","aws:clientVersion":"${WEB_CLIENT_VERSION}"}`,
            details: '{}'
        };

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        const eventBatch: RumEvent[] = eventCache.getEventBatch();
        expect(eventBatch).toEqual(expect.arrayContaining([event]));
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
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const bus = new EventBus();
        const eventCache: EventCache = Utils.createEventCache(
            DEFAULT_CONFIG,
            bus
        );
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
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache = Utils.createEventCache({
            ...DEFAULT_CONFIG,
            eventCacheSize: 10,
            batchLimit: 10
        });

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
});
