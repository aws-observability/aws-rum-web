import { advanceTo } from 'jest-date-mock';
import { Page, PageManager } from '../PageManager';
import {
    DEFAULT_CONFIG,
    mockFetch,
    mockFetchWith500,
    mockFetchWithError,
    mockFetchWithErrorObject,
    mockFetchWithErrorObjectAndStack
} from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../plugins/utils/constant';
import mock from 'xhr-mock';
import { VirtualPageLoadTimer } from '../VirtualPageLoadTimer';

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });
global.fetch = mockFetch;

const page: Page = {
    pageId: 'mockPage',
    interaction: 0,
    start: 0
};
const getPage = jest.fn(() => page);
jest.mock('../PageManager', () => ({
    PageManager: jest.fn().mockImplementation(() => ({
        getPage
    }))
}));
const config: Config = {
    ...DEFAULT_CONFIG,
    allowCookies: true
};
const timeoutConfig: Config = {
    ...DEFAULT_CONFIG,
    routeChangeTimeout: 10,
    allowCookies: true
};
const pageManager = new PageManager(config, record);

describe('VirtualPageLoadTimer tests', () => {
    let url;

    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        advanceTo(0);
        mock.setup();
        record.mockClear();
        jsdom.reconfigure({
            url
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    test('when route change is happening then items in requestBuffer should be added to ongoingRequests', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Adding requests to requestBuffer
        for (let i = 0; i < 3; i++) {
            const xhr = new XMLHttpRequest();
            virtualPageLoadTimer['requestBuffer'].add(xhr);
        }

        virtualPageLoadTimer.startTiming();

        // Assert
        expect(virtualPageLoadTimer['ongoingRequests'].size).toEqual(3);
        expect(virtualPageLoadTimer['requestBuffer'].size).toEqual(0);
        expect(virtualPageLoadTimer['isPageLoaded']).toEqual(false);
    });

    test('when route change is not happening then items in requestBuffer should not be added to ongoingRequests', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Adding requests to requestBuffer
        for (let i = 0; i < 3; i++) {
            const xhr = new XMLHttpRequest();
            virtualPageLoadTimer['requestBuffer'].add(xhr);
        }

        // Assert
        expect(virtualPageLoadTimer['ongoingRequests'].size).toEqual(0);
        expect(virtualPageLoadTimer['isPageLoaded']).toEqual(true);
        expect(virtualPageLoadTimer['requestBuffer'].size).toEqual(3);
    });

    test('when dom mutation occurs then periodic checker is resetted', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        virtualPageLoadTimer.startTiming();

        // Before mutation
        const intervalId = virtualPageLoadTimer['periodicCheckerId'];
        const timeoutId = virtualPageLoadTimer['timeoutCheckerId'];

        // Invoking private callback for testing, as mutationObserver does not work well with jest
        virtualPageLoadTimer['resetInterval']();

        // After mutation, only periodic check timer id changes
        expect(intervalId).not.toEqual(
            virtualPageLoadTimer['periodicCheckerId']
        );
        expect(timeoutId).toEqual(virtualPageLoadTimer['timeoutCheckerId']);
    });

    test('when updateLatestInteractionTime is invoked then latestInteractionTime is updated with Date.now', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );
        Date.now = jest.fn(() => 505);

        // Directly using callback instead of simulating document events
        virtualPageLoadTimer['updateLatestInteractionTime'](
            new Event('mousedown')
        );

        // Assert
        expect(virtualPageLoadTimer['latestInteractionTime']).toEqual(505);
    });

    test('when XMLHttpRequest is detected without route change then latestEndTime is not updated', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Send XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // requestBuffer should contain the xhr until request is completed
        expect(virtualPageLoadTimer['ongoingRequests'].size).toEqual(0);
        expect(virtualPageLoadTimer['requestBuffer'].has(xhr)).toEqual(true);

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        // requestBuffer should no longer contain xhr as it is completed
        expect(virtualPageLoadTimer['requestBuffer'].size).toEqual(0);

        // Current page's latestEndTime should not be updated
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(0);
        expect(virtualPageLoadTimer['ongoingRequests'].size).toEqual(0);
    });

    test('when XMLHttpRequest is detected during route change then latestEndTime is updated', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );
        virtualPageLoadTimer.startTiming();

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);

        // Send request
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // requestBuffer should contain the xhr until request is completed
        expect(virtualPageLoadTimer['ongoingRequests'].size).toEqual(1);
        expect(virtualPageLoadTimer['requestBuffer'].has(xhr)).toEqual(false);

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Current page's latestEndTime should be updated and ongoingRequests is empty
        expect(virtualPageLoadTimer['requestBuffer'].size).toEqual(0);
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(100);
        expect(virtualPageLoadTimer['ongoingRequests'].size).toEqual(0);
    });

    test('when fetch is fetch counter should be updated to 1 until finished', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);
        virtualPageLoadTimer.startTiming();

        // When fetch initially is sent, fetchCounter should be incremented to 1
        const fetching = fetch('https://aws.amazon.com');
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(1);

        await fetching;

        // Upon completion, fetchCounter should be decremented to 0
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(0);
    });

    test('when fetch is detected during route change then latestEndTime is updated', async () => {
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);
        virtualPageLoadTimer.startTiming();

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Upon completion, fetchCounter should be decremented to 0
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(0);
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(100);
    });

    test('when fetch returns 500 during route change then latestEndTime is updated', async () => {
        // Init
        global.fetch = mockFetchWith500;
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);
        virtualPageLoadTimer.startTiming();

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Upon completion, fetchCounter should be decremented to 0
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(0);
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(100);
    });

    test('when fetch returns error during route change then latestEndTime is updated', async () => {
        // Init
        global.fetch = mockFetchWithError;
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);
        virtualPageLoadTimer.startTiming();

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });

        // Upon completion, fetchCounter should be decremented to 0
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(0);
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(100);
    });

    test('when fetch returns error object during route change then latestEndTime is updated', async () => {
        // Init
        global.fetch = mockFetchWithErrorObject;
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);
        virtualPageLoadTimer.startTiming();

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });

        // Upon completion, fetchCounter should be decremented to 0
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(0);
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(100);
    });

    test('when fetch returns error object and stack trace during route change then latestEndTime is updated', async () => {
        // Init
        global.fetch = mockFetchWithErrorObjectAndStack;
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);
        virtualPageLoadTimer.startTiming();

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });

        // Upon completion, fetchCounter should be decremented to 0
        expect(virtualPageLoadTimer['fetchCounter']).toEqual(0);
        expect(virtualPageLoadTimer['latestEndTime']).toEqual(100);
    });

    test('when route change occurs then recordRouteChangeNavigationEvent is invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );
        // Mocking Date.now
        Date.now = jest.fn(() => 100);

        // Run
        virtualPageLoadTimer.startTiming();
        jest.advanceTimersByTime(100);

        // Navigation event should be recorded
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[0][1].initiatorType).toEqual('route_change');

        // periodic checker and timeout should be undefined and isPageLoaded should be true
        expect(virtualPageLoadTimer['timeoutCheckerId']).toEqual(undefined);
        expect(virtualPageLoadTimer['periodicCheckerId']).toEqual(undefined);
        expect(virtualPageLoadTimer['isPageLoaded']).toEqual(true);
    });

    test('when route change does not occur then recordRouteChangeNavigationEvent is not invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            config,
            record
        );
        jest.advanceTimersByTime(100);

        // recordRoutChangeNavigationEvent is not invoked
        expect(record.mock.calls.length).toEqual(0);

        // Virtual timing resoureces should not be initialized
        expect(virtualPageLoadTimer['timeoutCheckerId']).toEqual(undefined);
        expect(virtualPageLoadTimer['periodicCheckerId']).toEqual(undefined);
        expect(virtualPageLoadTimer['isPageLoaded']).toEqual(true);
    });

    test('when timeout occurs then virtual page load timing resources are cleared', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const virtualPageLoadTimer = new VirtualPageLoadTimer(
            pageManager,
            timeoutConfig,
            record
        );

        virtualPageLoadTimer.startTiming();

        // Before timeout timing resources are initialized
        expect(virtualPageLoadTimer['timeoutCheckerId']).not.toEqual(undefined);
        expect(virtualPageLoadTimer['periodicCheckerId']).not.toEqual(
            undefined
        );
        expect(virtualPageLoadTimer['isPageLoaded']).toEqual(false);

        // Trigger timeout
        jest.advanceTimersByTime(10);

        // After timeout timing resources are cleared
        expect(virtualPageLoadTimer['timeoutCheckerId']).toEqual(undefined);
        expect(virtualPageLoadTimer['periodicCheckerId']).toEqual(undefined);
        expect(virtualPageLoadTimer['isPageLoaded']).toEqual(true);

        // Navigation event is not recorded
        expect(record.mock.calls.length).toEqual(0);
    });
});
