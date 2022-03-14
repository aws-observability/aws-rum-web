import { advanceTo } from 'jest-date-mock';
import { PageManager, PAGE_VIEW_TYPE } from '../PageManager';
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

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });
global.fetch = mockFetch;

describe('PageManager tests', () => {
    let url;

    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        advanceTo(0);
        mock.setup();
        record.mockClear();
        jsdom.reconfigure({
            url: url
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    test('when next page is created then items in requestBuffer should be added to ongoingRequests', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Create landing page
        pageManager.recordPageView('/rum/home');

        // Adding requests to requestBuffer
        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            helper['requestBuffer'].add(xhr);
        }

        // Create next page
        pageManager.recordPageView('/console/home');

        // Assert
        expect(helper['ongoingRequests'].size).toEqual(3);
        expect(helper['requestBuffer'].size).toEqual(0);
        expect(helper['isPageLoaded']).toEqual(false);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when resumed page is created then items in requestBuffer should not be added to ongoingRequests', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Initialize session
        pageManager.resumeSession('/console/home', 1);

        // Adding requests to requestBuffer
        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            helper['requestBuffer'].add(xhr);
        }

        // Create resumed page
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(helper['ongoingRequests'].size).toEqual(0);
        expect(helper['isPageLoaded']).toEqual(true);
        expect(helper['requestBuffer'].size).toEqual(3);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when landing page is created then items in requestBuffer should not be added to ongoingRequests', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Adding requests to requestBuffer
        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            helper['requestBuffer'].add(xhr);
        }

        // Create landing page
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(helper['ongoingRequests'].size).toEqual(0);
        expect(helper['isPageLoaded']).toEqual(true);
        expect(helper['requestBuffer'].size).toEqual(3);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when dom mutation occurs then periodic checker is resetted', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // Before mutation
        const intervalId = helper['periodicCheckerId'];
        const timeoutId = helper['timeoutCheckerId'];

        // Invoking private callback for testing, as mutationObserver does not work well with jest
        helper['resetInterval']();

        // After mutation, only periodic check timer id changes
        expect(intervalId).not.toEqual(helper['periodicCheckerId']);
        expect(timeoutId).toEqual(helper['timeoutCheckerId']);

        // Two page view events created
        expect(record.mock.calls.length).toEqual(2);
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[1][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when updateLatestInteractionTime is invoked then latestInteractionTime is updated with Date.now', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        Date.now = jest.fn(() => 505);
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Directly using callback instead of simulating document events
        helper['updateLatestInteractionTime'](new Event('mousedown'));

        // Assert
        expect(helper['latestInteractionTime']).toEqual(505);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when XMLHttpRequest is detected after page is loaded then it is added to requestBuffer', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Run
        pageManager.recordPageView('/rum/home');

        // Send XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // requestBuffer should contain the xhr until request is completed
        expect(helper['ongoingRequests'].size).toEqual(0);
        expect(helper['requestBuffer'].has(xhr)).toEqual(true);

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        // requestBuffer should no longer contain xhr as it is completed
        expect(helper['requestBuffer'].size).toEqual(0);

        // Current page's latestEndTime should not be updated
        expect(helper['latestEndTime']).toEqual(0);
        expect(helper['ongoingRequests'].size).toEqual(0);
    });

    test('when XMLHttpRequest is detected before page is loaded then it is added to ongoingRequests', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // Mocking Date.now to return 100 to simulate time passed
        Date.now = jest.fn(() => 100);

        // Send request
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // requestBuffer should contain the xhr until request is completed
        expect(helper['ongoingRequests'].size).toEqual(1);
        expect(helper['requestBuffer'].has(xhr)).toEqual(false);

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Current page's latestEndTime should be updated and ongoingRequests is empty
        expect(helper['requestBuffer'].size).toEqual(0);
        expect(helper['latestEndTime']).toEqual(100);
        expect(helper['ongoingRequests'].size).toEqual(0);
    });

    test('when fetch is detected then fetchCounter should be increased and decreased', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        // @ts-ignore
        const decrementCounter = jest.spyOn(helper, 'decrementFetchCounter');

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Upon completion, fetchCounter should be decremented to 0
        expect(helper['fetchCounter']).toEqual(0);
        expect(decrementCounter).toBeCalledTimes(1);
    });

    test('when fetch returns 500 then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWith500;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // @ts-ignore
        const decrementCounter = jest.spyOn(helper, 'decrementFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Even with 500 response, fetchCounter should be decremented to 0
        expect(helper['fetchCounter']).toEqual(0);
        expect(decrementCounter).toBeCalledTimes(1);
    });

    test('when fetch returns error then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWithError;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // @ts-ignore
        const decrementCounter = jest.spyOn(helper, 'decrementFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });

        // Even with error, fetchCounter should be decremented to 0
        expect(helper['fetchCounter']).toEqual(0);
        expect(decrementCounter).toBeCalledTimes(1);
    });

    test('when fetch returns error object then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWithErrorObject;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // @ts-ignore
        const decrementCounter = jest.spyOn(helper, 'decrementFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });

        // Even with error object, fetchCounter should be decremented to 0
        expect(helper['fetchCounter']).toEqual(0);
        expect(decrementCounter).toBeCalledTimes(1);
    });

    test('when fetch returns error object and stack trace then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWithErrorObjectAndStack;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];

        // @ts-ignore
        const decrementCounter = jest.spyOn(helper, 'decrementFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });

        // Even with error and stack trace, fetchCounter should be decremented to 0
        expect(helper['fetchCounter']).toEqual(0);
        expect(decrementCounter).toBeCalledTimes(1);
    });

    test('when next page is created then recordRouteChangeNavigationEvent is invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        // Mocking Date.now
        Date.now = jest.fn(() => 100);
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        helper['latestInteractionTime'] = 50;
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/new_page');
        jest.advanceTimersByTime(100);

        // Two page view events + one navigation event and startTiming is invoked
        expect(startTiming).toBeCalledTimes(1);
        expect(record.mock.calls.length).toEqual(3);
        expect(record.mock.calls[2][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[2][1].initiatorType).toEqual('route_change');

        // periodic checker and timeout should be undefined and isPageLoaded should be true
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);
        expect(helper['isPageLoaded']).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when next page is created but latestInteractionTime is beyond timeout then recordRouteChangeNavigationEvent is not invoked', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        // Mocking Date.now
        Date.now = jest.fn(() => 10000);
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        helper['latestInteractionTime'] = 50;
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/new_page');

        // Two page view events, startTiming should not be invoked
        expect(record.mock.calls.length).toEqual(2);
        expect(startTiming).toBeCalledTimes(0);

        // periodic checker and timeout should not be initialized
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);
        expect(helper['isPageLoaded']).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when resumed page is created then recordRouteChangeNavigationEvent is not invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Run
        pageManager.resumeSession('/console/home', 1);
        pageManager.recordPageView('/rum/home');
        jest.advanceTimersByTime(100);

        // resumed page view event is created and startTiming should not be invoked
        expect(startTiming).toBeCalledTimes(0);
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 2
        });

        // Virtual timing resoureces should not be initialized
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);
        expect(helper['isPageLoaded']).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when landing page is created then recordRouteChangeNavigationEvent is not invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Run
        pageManager.recordPageView('/rum/home');
        jest.advanceTimersByTime(100);

        // resumed page view event is created and startTiming should not be invoked
        expect(startTiming).toBeCalledTimes(0);
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 0
        });

        // Virtual timing resoureces should not be initialized
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);
        expect(helper['isPageLoaded']).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when timeout occurs then virtual page load timing resources are cleared', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            routeChangeTimeout: 10,
            allowCookies: true
        };
        Date.now = jest.fn(() => 505);
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');
        helper['latestInteractionTime'] = 500;

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // Before timeout timing resources are initialized
        expect(startTiming).toBeCalledTimes(1);
        expect(helper['timeoutCheckerId']).not.toEqual(undefined);
        expect(helper['periodicCheckerId']).not.toEqual(undefined);
        expect(helper['isPageLoaded']).toEqual(false);

        jest.advanceTimersByTime(10);

        // After timeout timing resources are cleared
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);
        expect(helper['isPageLoaded']).toEqual(true);

        // Two page view events created
        expect(record.mock.calls.length).toEqual(2);
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[1][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });
});
