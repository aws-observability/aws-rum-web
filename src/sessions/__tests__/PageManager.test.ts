import { PageManager, PAGE_VIEW_TYPE } from '../PageManager';
import { DEFAULT_CONFIG } from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../plugins/utils/constant';

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });

describe('PageManager tests', () => {
    let url;

    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        record.mockClear();
        jsdom.reconfigure({
            url: url
        });
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

    test('when getCurrentUrl is invoked then returns current pageId', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        // expect(pageManager.getCurrentUrl()).toMatch('/rum/home');

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when getRequestCache is invoked without TrackerPlugin then requestCache is empty', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        // expect(pageManager.getRequestCache().size).toEqual(0);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when timeout is provided in config then TIMEOUT_TIME is overridden', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            spaHardTimeoutLimit: 6000,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        // expect(pageManager.getTimeoutValue()).toEqual(6000);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when timeout is not provided in config then TIMEOUT_TIME is 1000', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        // expect(pageManager.getTimeoutValue()).toEqual(1000);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when incrementFetchCounter is invoked once then fetchCounter is 1', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');
        // pageManager.incrementFetchCounter();
        // expect(pageManager.getFetchCounter()).toEqual(1);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when decrementFetchCounter is invoked when fetchCounter is 0 then fetchCounter is not decremented', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');
        // pageManager.decrementFetchCounter();
        // expect(pageManager.getFetchCounter()).toEqual(0);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when decrementFetchCounter is invoked after incrementFetchCounter then fetchCounter is 0', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');
        // pageManager.incrementFetchCounter();
        // pageManager.decrementFetchCounter();
        // expect(pageManager.getFetchCounter()).toEqual(0);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when route change creates new page then items in requestCache should be added to ongoingActivity', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');
        // let requestCache = pageManager.getRequestCache();
        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            // requestCache.add(xhr);
        }

        pageManager.recordPageView('/rum/new_page');
        expect(pageManager.getPage().ongoingActivity.size).toEqual(3);
        expect(pageManager.getPage().isLoaded).toEqual(false);
        // expect(requestCache.size).toEqual(0);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when initial load creates new page then items in requestCache should not be added to ongoingActivity', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');
        let request = pageManager['requestCache'];
        console.log(request);
        // let requestCache = pageManager.getRequestCache();
        for (let i = 0; i < 3; i++) {
            let xhr = new XMLHttpRequest();
            request.add(xhr);
        }

        pageManager.recordPageView('/rum/new_page');
        expect(pageManager.getPage().ongoingActivity.size).toEqual(0);
        expect(pageManager.getPage().isLoaded).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when route change creates new page then virtual page timing related resources are created', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        pageManager.recordPageView('/rum/new_page');
        // expect(typeof pageManager.getIntervalId()).toEqual('number');
        // expect(typeof pageManager.getTimeoutId()).toEqual('number');
        expect(pageManager.getPage().isLoaded).toEqual(false);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when initial load creates new page then virtual page timing related resources are not created', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        pageManager.recordPageView('/rum/new_page');
        // expect(typeof pageManager.getIntervalId()).toEqual('undefined');
        // expect(typeof pageManager.getTimeoutId()).toEqual('undefined');
        expect(pageManager.getPage().isLoaded).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when route change creates page then createNavigationEventWithSpaTiming is invoked', async () => {
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

        pageManager.recordPageView('/rum/new_page');

        jest.advanceTimersByTime(100);

        // Two page view events + one navigation event
        expect(record.mock.calls.length).toEqual(3);
        expect(record.mock.calls[2][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[2][1].initiatorType).toEqual('route_change');

        // periodic checker and timeout should be undefined and page.isLoaded should be true
        // expect(typeof pageManager.getIntervalId()).toEqual('undefined');
        // expect(typeof pageManager.getTimeoutId()).toEqual('undefined');
        expect(pageManager.getPage().isLoaded).toEqual(true);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when initial load creates page then createNavigationEventWithSpaTiming is not invoked', async () => {
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

        pageManager.recordPageView('/rum/new_page');

        jest.advanceTimersByTime(100);
        // Two page view events created
        expect(record.mock.calls.length).toEqual(2);

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
            spaHardTimeoutLimit: 10,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        pageManager.recordPageView('/rum/new_page');

        // Before timeout
        // expect(typeof pageManager.getIntervalId()).toEqual('number');
        // expect(typeof pageManager.getTimeoutId()).toEqual('number');
        expect(pageManager.getPage().isLoaded).toEqual(false);

        jest.advanceTimersByTime(10);
        // After timeout
        // expect(typeof pageManager.getIntervalId()).toEqual('undefined');
        // expect(typeof pageManager.getTimeoutId()).toEqual('undefined');
        expect(pageManager.getPage().isLoaded).toEqual(true);

        // Two page view events created
        expect(record.mock.calls.length).toEqual(2);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when mutation occurs then periodic check timer is resetted', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        pageManager.recordPageView('/rum/new_page');

        // Before mutation
        // const intervalId = pageManager.getIntervalId();
        // const timeoutId = pageManager.getTimeoutId();

        // Invoking private callback for testing, as mutationObserver does not work well with jest
        pageManager['mutationCallback']();

        // After mutation, only periodic check timer id changes
        // expect(intervalId).not.toEqual(pageManager.getIntervalId());
        // expect(timeoutId).toEqual(pageManager.getTimeoutId());

        // Two page view events created
        expect(record.mock.calls.length).toEqual(2);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });
});
