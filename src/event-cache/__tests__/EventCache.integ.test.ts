import { EventCache } from '../EventCache';
import { advanceTo } from 'jest-date-mock';
import * as Utils from '../../test-utils/test-utils';
import { RumEvent } from '../../dispatch/dataplane';
import { DEFAULT_CONFIG, mockFetch } from '../../test-utils/test-utils';
import { SESSION_START_EVENT_TYPE } from '../../sessions/SessionManager';

global.fetch = mockFetch;
describe('EventCache tests', () => {
    beforeAll(() => {
        advanceTo(0);
    });

    test('when a session expires then a new session is created', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: true,
                sessionLengthSeconds: 0
            }
        };

        const eventCache: EventCache = Utils.createEventCache(config);

        // Run
        eventCache.recordEvent(EVENT1_SCHEMA, {});
        advanceTo(1);
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
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...DEFAULT_CONFIG,
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
        eventCache.recordPageView('/console/home');
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events: RumEvent[] = eventCache.getEventBatch();
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)).toMatchObject(expectedMetaData);
        });
    });

    test('meta data contains default attributes not overridden from custom attributes', async () => {
        // Init
        const EVENT1_SCHEMA = 'com.amazon.rum.event1';
        const config = {
            ...DEFAULT_CONFIG,
            ...{
                allowCookies: false,
                sessionLengthSeconds: 0,
                sessionAttributes: {
                    version: '2.0.0',
                    domain: 'overridden.console.aws.amazon.com',
                    browserLanguage: 'en-UK',
                    browserName: 'Chrome',
                    deviceType: 'Mac'
                }
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
        eventCache.recordPageView('/console/home');
        eventCache.recordEvent(EVENT1_SCHEMA, {});

        // Assert
        const events: RumEvent[] = eventCache.getEventBatch();
        events.forEach((event) => {
            expect(JSON.parse(event.metadata)).toMatchObject(expectedMetaData);
        });
    });
});
