import { EventCache } from '../EventCache';
import { advanceTo } from 'jest-date-mock';
import * as Utils from '../../test-utils/test-utils';
import { defaultConfig } from '../../orchestration/Orchestration';
import { Event } from '../../dispatch/dataplane';

describe('EventCache tests', () => {
    beforeAll(() => {
        advanceTo(0);
    });

    test('when a session expires then a new session is created', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...defaultConfig,
            ...{
                allowCookies: false,
                sessionLengthSeconds: 0
            }
        };

        const eventCache: EventCache = Utils.createEventCache(config);

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        advanceTo(1);
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        expect(eventCache.getEventBatch().events.length).toEqual(6);
    });

    test('meta data contains domain, user agent and page ID', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...defaultConfig,
            ...{
                allowCookies: false,
                sessionLengthSeconds: 0
            }
        };

        const eventCache: EventCache = Utils.createEventCache(config);
        const expectedMetaData = {
            version: '1.0.0',
            domain: 'us-east-1.console.aws.amazon.com',
            browserLanguage: 'en-US',
            browserName: 'WebKit',
            deviceType: 'desktop',
            platformType: 'web',
            pageId: '/console/home'
        };

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events: Event[] = await eventCache.getEventBatch().events;
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)).toMatchObject(expectedMetaData);
        });
    });
});
