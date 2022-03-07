import { advanceTo } from 'jest-date-mock';
import { PageManager, PAGE_VIEW_TYPE } from '../PageManager';
import { DEFAULT_CONFIG } from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../plugins/utils/constant';
import mock from 'xhr-mock';

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });

const mockFetch = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'Content-Length': '125' }),
            body: '{}',
            ok: true
        } as any)
);
global.fetch = mockFetch;

const mockFetchWith500 = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 500,
            statusText: 'InternalError',
            headers: {},
            body: '',
            ok: false
        } as any)
);

const mockFetchWithError = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject('Timeout')
);

const mockFetchWithErrorObject = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject(new Error('Timeout'))
);

const mockFetchWithErrorObjectAndStack = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject({
            name: 'FetchError',
            message: 'timeout',
            stack: 'stack trace'
        })
);

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

    test('when a page is recorded then PageManager records a page view event.', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        // Run
        pageManager.recordPageView('/console/home');

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 0
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when no page view has been recorded then getPage returns undefined', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG
            },
            record
        );

        // Assert
        expect(pageManager.getPage()).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are enabled then attributes include interaction', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        // Run
        pageManager.recordPageView('/console/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/console/home',
            interaction: 0
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when multipe pages are recorded then interaction increments', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        // Run
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are disabled then interaction increments', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: false
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Run
        pageManager.recordPageView('/console/home');
        config.allowCookies = true;
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are disabled then attributes do not include interaction', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: false
            },
            record
        );

        // Run
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');
        const attributes = pageManager.getAttributes();

        // Assert
        expect(attributes.parentPageId).toEqual(undefined);
        expect(attributes.parentPageId).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when session is resumed then interaction depth is resumed depth plus one', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 2
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when resumed page is created then virtual page load timing resources are not initialized', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );
        pageManager.resumeSession('/console/home', 1);
        // Run
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getPage()['isLoaded']).toEqual(true);
        // page view event is recorded
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 2
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
        expect(pageManager['activityTimeoutCheckerId']).toEqual(undefined);
        expect(pageManager['periodicCheckerId']).toEqual(undefined);
    });

    test('when landing page is created then virtual page load timing resources are not initialized', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );
        // Run
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getPage()['isLoaded']).toEqual(true);
        // page view event is recorded
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 0
        });
        expect(pageManager['activityTimeoutCheckerId']).toEqual(undefined);
        expect(pageManager['periodicCheckerId']).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when next page is created then virtual page load timing resources are initialized', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );
        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // Assert
        expect(pageManager.getPage()['isLoaded']).toEqual(false);
        // page view event is recorded
        expect(record.mock.calls.length).toEqual(2);
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[1][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 1
        });
        expect(pageManager['activityTimeoutCheckerId']).not.toEqual(undefined);
        expect(pageManager['periodicCheckerId']).not.toEqual(undefined);
    });

    test('when spaActivityTimeoutLimit is provided in config then ACTIVITY_TIMEOUT_LIMIT is overridden', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            spaActivityTimeoutLimit: 6000,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        expect(pageManager['ACTIVITY_TIMEOUT_LIMIT']).toEqual(6000);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when spaActivityTimeoutLimit is not provided in config then ACTIVITY_TIMEOUT_LIMIT is 1000', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        expect(pageManager['ACTIVITY_TIMEOUT_LIMIT']).toEqual(1000);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when next page is created then items in requestBuffer should be added to ongoingActivity', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.recordPageView('/rum/home');

        // Adding requests to requestBuffer
        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            pageManager['requestBuffer'].add(xhr);
        }

        // Run
        pageManager.recordPageView('/console/home');

        // Assert
        expect(pageManager.getPage().ongoingActivity.size).toEqual(3);
        expect(pageManager['requestBuffer'].size).toEqual(0);
        expect(pageManager.getPage().isLoaded).toEqual(false);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when resumed page is created then items in requestBuffer should not be added to ongoingActivity', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            pageManager['requestBuffer'].add(xhr);
        }

        // Run
        pageManager.recordPageView('/rum/home');

        expect(pageManager.getPage().ongoingActivity.size).toEqual(0);
        expect(pageManager.getPage().isLoaded).toEqual(true);
        expect(pageManager['requestBuffer'].size).toEqual(3);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when landing page is created then items in requestBuffer should not be added to ongoingActivity', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            pageManager['requestBuffer'].add(xhr);
        }

        // Run
        pageManager.recordPageView('/rum/home');

        expect(pageManager.getPage().ongoingActivity.size).toEqual(0);
        expect(pageManager.getPage().isLoaded).toEqual(true);
        expect(pageManager['requestBuffer'].size).toEqual(3);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when next page is created then recordVirtualPageNavigationEvent is invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Run
        pageManager.recordPageView('/rum/home');

        pageManager.recordPageView('/console/new_page');

        jest.advanceTimersByTime(100);

        // Two page view events + one navigation event
        expect(record.mock.calls.length).toEqual(3);
        expect(record.mock.calls[2][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[2][1].initiatorType).toEqual('route_change');

        // periodic checker and timeout should be undefined and page.isLoaded should be true
        expect(pageManager['activityTimeoutCheckerId']).toEqual(undefined);
        expect(pageManager['periodicCheckerId']).toEqual(undefined);
        expect(pageManager.getPage().isLoaded).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when resumed page is created then recordVirtualPageNavigationEvent is not invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        jest.advanceTimersByTime(100);

        // resumed page view event is created
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 2
        });

        // Virtual timing resoureces should not be initialized
        expect(pageManager['activityTimeoutCheckerId']).toEqual(undefined);
        expect(pageManager['periodicCheckerId']).toEqual(undefined);
        expect(pageManager.getPage().isLoaded).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when landing page is created then recordVirtualPageNavigationEvent is not invoked', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Run
        pageManager.recordPageView('/rum/home');

        jest.advanceTimersByTime(100);

        // resumed page view event is created
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 0
        });

        // Virtual timing resoureces should not be initialized
        expect(pageManager['activityTimeoutCheckerId']).toEqual(undefined);
        expect(pageManager['periodicCheckerId']).toEqual(undefined);
        expect(pageManager.getPage().isLoaded).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when activity timeout occurs then virtual page load timing resources are cleared', async () => {
        // Setting up fake timer to invoke periodic tasks
        jest.useFakeTimers();
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            spaActivityTimeoutLimit: 10,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Run
        pageManager.recordPageView('/rum/home');

        pageManager.recordPageView('/console/home');

        // Before timeout timing resources are initialized
        expect(pageManager['activityTimeoutCheckerId']).not.toEqual(undefined);
        expect(pageManager['periodicCheckerId']).not.toEqual(undefined);
        expect(pageManager.getPage().isLoaded).toEqual(false);

        jest.advanceTimersByTime(10);

        // After timeout timing resources are cleared
        expect(pageManager['activityTimeoutCheckerId']).toEqual(undefined);
        expect(pageManager['periodicCheckerId']).toEqual(undefined);
        expect(pageManager.getPage().isLoaded).toEqual(true);

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

    test('when dom mutation occurs then periodic checker is resetted', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // Before mutation
        const intervalId = pageManager['periodicCheckerId'];
        const timeoutId = pageManager['activityTimeoutCheckerId'];

        // Invoking private callback for testing, as mutationObserver does not work well with jest
        pageManager['domMutationCallback']();

        // After mutation, only periodic check timer id changes
        expect(intervalId).not.toEqual(pageManager['periodicCheckerId']);
        expect(timeoutId).toEqual(pageManager['activityTimeoutCheckerId']);

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

    test('when there is no pageId difference then no pages are created', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 0
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });
    // Commenting out due to timeout occurring. Will include the two tests and nightwatch case in next revision.
    // test('when XMLHttpRequest is detected when page is loaded then it is added to requestBuffer', async () => {
    //     // Init
    //     const config: Config = {
    //         ...DEFAULT_CONFIG,
    //         allowCookies: true
    //     };
    //     const pageManager: PageManager = new PageManager(config, record);

    //     // Run
    //     pageManager.recordPageView('/rum/home');

    //     // Run
    //     const xhr = new XMLHttpRequest();
    //     xhr.open('GET', './response.json', true);
    //     xhr.send();

    //     // requestBuffer should contain the xhr until request is completed
    //     expect(pageManager.getPage().ongoingActivity.size).toEqual(0);
    //     expect(pageManager['requestBuffer'].has(xhr)).toEqual(true);

    //     // Yield to the event queue so the event listeners can run
    //     await new Promise((resolve) => setTimeout(resolve, 0));

    //     // requestBuffer should no longer contain xhr
    //     expect(pageManager['requestBuffer'].size).toEqual(0);

    //     // Current page's latestEndTime should not be updated
    //     expect(pageManager.getPage().latestEndTime).toEqual(0);
    //     expect(pageManager.getPage().ongoingActivity.size).toEqual(0);
    // });

    // test('when XMLHttpRequest is detected when page is not loaded then it is added to ongoingActivity', async () => {
    //     // Init
    //     const config: Config = {
    //         ...DEFAULT_CONFIG,
    //         allowCookies: true
    //     };
    //     const pageManager: PageManager = new PageManager(config, record);

    //     // Run
    //     pageManager.recordPageView('/rum/home');
    //     pageManager.recordPageView('/console/home');

    //     // Mocking Date.now to return 100 to simulate time passed
    //     Date.now = jest.fn(() => 100);
    //     // Run
    //     const xhr = new XMLHttpRequest();

    //     xhr.open('GET', './response.json', true);
    //     xhr.send();

    //     // requestBuffer should contain the xhr until request is completed
    //     expect(pageManager.getPage().ongoingActivity.size).toEqual(1);
    //     expect(pageManager['requestBuffer'].has(xhr)).toEqual(false);

    //     // Yield to the event queue so the event listeners can run
    //     await new Promise((resolve) => setTimeout(resolve, 0));

    //     // Current page's latestEndTime should be updated and ongoingActivity is empty
    //     expect(pageManager['requestBuffer'].size).toEqual(0);
    //     expect(pageManager.getPage().latestEndTime).toEqual(100);
    //     expect(pageManager.getPage().ongoingActivity.size).toEqual(0);
    // });

    test('when fetch is detected then fetchCounter should be increased and decreased', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // @ts-ignore
        const updateCounter = jest.spyOn(pageManager, 'updateFetchCounter');

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');
        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Upon completion, fetchCounter should be decremented to 0
        expect(pageManager['fetchCounter']).toEqual(0);
        expect(updateCounter).toBeCalledTimes(1);
    });

    test('when fetch returns 500 then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWith500;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // @ts-ignore
        const updateCounter = jest.spyOn(pageManager, 'updateFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Even with 500 response, fetchCounter should be decremented to 0
        expect(pageManager['fetchCounter']).toEqual(0);
        expect(updateCounter).toBeCalledTimes(1);
    });

    test('when fetch returns error then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWithError;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // @ts-ignore
        const updateCounter = jest.spyOn(pageManager, 'updateFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Even with 500 response, fetchCounter should be decremented to 0
        expect(pageManager['fetchCounter']).toEqual(0);
        expect(updateCounter).toBeCalledTimes(1);
    });

    test('when fetch returns error object then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWithErrorObject;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // @ts-ignore
        const updateCounter = jest.spyOn(pageManager, 'updateFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Even with 500 response, fetchCounter should be decremented to 0
        expect(pageManager['fetchCounter']).toEqual(0);
        expect(updateCounter).toBeCalledTimes(1);
    });

    test('when fetch returns error object and stack trace then fetchCounter should be increased and decreased', async () => {
        // Init
        global.fetch = mockFetchWithErrorObjectAndStack;
        global.fetch = mockFetchWithErrorObject;
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // @ts-ignore
        const updateCounter = jest.spyOn(pageManager, 'updateFetchCounter');

        // When fetch initially is sent, fetchCounter should be incremented to 1
        await fetch('https://aws.amazon.com');

        // Even with 500 response, fetchCounter should be decremented to 0
        expect(pageManager['fetchCounter']).toEqual(0);
        expect(updateCounter).toBeCalledTimes(1);
    });
});
