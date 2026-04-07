import { advanceTo } from 'jest-date-mock';
import {
    createDefaultEventCache,
    createEventCache,
    testMetaData,
    mockFetch
} from '../../test-utils/test-utils';
import type { RumEvent } from '../../dispatch/dataplane';
import { SESSION_START_EVENT_TYPE } from '../../plugins/utils/constant';

global.fetch = mockFetch;
describe('EventCache tests', () => {
    const EVENT1_SCHEMA = 'com.amazon.rum.event1';
    const EVENT2_SCHEMA = 'com.amazon.rum.event2';
    beforeAll(() => {
        advanceTo(0);
    });

    test('when a session expires then a new session is created', async () => {
        // Init
        const eventCache = createEventCache({
            allowCookies: true,
            sessionLengthSeconds: 0
        });

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(
            eventCache
                .getEventBatch()
                .filter((e) => e.type === SESSION_START_EVENT_TYPE).length
        ).toEqual(2);
    });

    test('meta data contains domain, user agent and page ID', async () => {
        // Init
        const eventCache = createEventCache({
            allowCookies: false,
            sessionLengthSeconds: 0
        });

        // Run
        eventCache.recordPageView('/console/home');
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events = eventCache.getEventBatch();
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)).toEqual({
                ...testMetaData,
                osName: expect.any(String), // osName depends on platform
                osVersion: expect.any(String) // osVersion depends on platform
            });
        });
    });

    test('default meta data can be overriden by custom attributes except version', async () => {
        // Init
        const sessionAttributes = {
            version: '2.0.0',
            domain: 'overridden.console.aws.amazon.com',
            browserLanguage: 'en-UK',
            browserName: 'Chrome',
            deviceType: 'Mac',
            platformType: 'other'
        };
        const eventCache = createEventCache({
            allowCookies: false,
            sessionLengthSeconds: 0,
            sessionAttributes
        });

        // Run
        eventCache.recordPageView('/console/home');
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events: RumEvent[] = eventCache.getEventBatch();
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)).toEqual({
                ...testMetaData,
                ...sessionAttributes,
                version: '1.0.0', // Version cannnot be overriden
                osName: expect.any(String), // osName depends on platform
                osVersion: expect.any(String) // osVersion depends on platform
            });
        });
    });

    test('when aws:releaseId exists then it is added to event metadata', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache = createEventCache({
            releaseId: '5.2.1'
        });

        // Run
        eventCache.recordPageView('/console/home');
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events = eventCache.getEventBatch();
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)).toMatchObject({
                'aws:releaseId': '5.2.1'
            });
        });
    });

    test('when aws:releaseId does NOT exist then it is NOT added to event metadata', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const eventCache = createEventCache();

        // Run
        eventCache.recordPageView('/console/home');
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events = eventCache.getEventBatch();
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)['aws:releaseId']).toBeUndefined();
        });
    });

    test('when a session is not sampled then return false', async () => {
        // Init

        const eventCache = createEventCache({ sessionSampleRate: 0 });

        // Assert
        expect(eventCache.isSessionSampled()).toBeFalsy();
    });

    test('when a session is sampled then return true', async () => {
        // Init
        const eventCache = createDefaultEventCache();

        // Assert
        expect(eventCache.isSessionSampled()).toBe(true);
    });

    test('WHEN session event limit is reached THEN new candidate cannot be added', async () => {
        // init
        const eventCache = createEventCache({ sessionEventLimit: 1 });

        // rum
        eventCache.recordCandidate(EVENT1_SCHEMA, {});
        eventCache.recordCandidate(EVENT2_SCHEMA, {});

        // assert
        const batch = eventCache.getEventBatch(true);
        expect(batch).toHaveLength(1);
        expect(batch[0].type).toEqual(SESSION_START_EVENT_TYPE);
    });

    test('WHEN session event limit is reached THEN existing candidate can still be updated', async () => {
        // init
        const eventCache = createEventCache({ sessionEventLimit: 2 });

        // rum
        eventCache.recordCandidate(EVENT1_SCHEMA, { data: 1 });
        eventCache.recordCandidate(EVENT1_SCHEMA, { data: 2 });

        // assert
        const batch = eventCache.getEventBatch(true);
        expect(batch).toHaveLength(2);
        expect(batch[0].type).toEqual(EVENT1_SCHEMA);
        expect(JSON.parse(batch[0].details)).toEqual({ data: 2 });
    });
});
