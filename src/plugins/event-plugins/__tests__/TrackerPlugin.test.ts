import { PartialHttpPluginConfig } from '../../utils/http-utils';
import { advanceTo } from 'jest-date-mock';
import { Page } from '../../../sessions/PageManager';
import { xRayOffContext, record } from '../../../test-utils/test-utils';
import mock from 'xhr-mock';

const pageId = '/mock_page';
const loadedPage: Page = {
    pageId: pageId,
    interaction: 0,
    start: 0,
    ongoingActivity: new Set<XMLHttpRequest>(),
    latestEndTime: 0,
    isLoaded: true
};
const notLoadedPage: Page = {
    pageId: pageId,
    interaction: 0,
    start: 0,
    ongoingActivity: new Set<XMLHttpRequest>(),
    latestEndTime: 0,
    isLoaded: false
};
let mockRequestCache;

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

describe('TrackerPlugin tests', () => {
    beforeEach(() => {
        advanceTo(0);
        mock.setup();
        record.mockClear();
        loadedPage.ongoingActivity = new Set<XMLHttpRequest>();
        notLoadedPage.ongoingActivity = new Set<XMLHttpRequest>();
        mockRequestCache = new Set<XMLHttpRequest>();
    });

    // test('when XMLHttpRequest is detected while page is loaded then it is added to requestCache', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         loadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     // Run
    //     const xhr = new XMLHttpRequest();
    //     xhr.open('GET', './response.json', true);
    //     xhr.send();

    //     // RequestCache should contain the xhr until request is completed
    //     expect(mockRequestCache.size).toEqual(1);
    //     expect(loadedPage.ongoingActivity.size).toEqual(0);

    //     // Yield to the event queue so the event listeners can run
    //     await new Promise((resolve) => setTimeout(resolve, 0));

    //     // Request should no longer contain xhr
    //     expect(mockRequestCache.size).toEqual(0);
    //     // Current page's latestEndTime should not be updated
    //     expect(loadedPage.latestEndTime).toEqual(0);
    //     expect(loadedPage.ongoingActivity.size).toEqual(0);
    // });

    // test('when XMLHttpRequest is detected while page is not loaded then it is added to ongoingActivity set', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         notLoadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     // Mocking Date.now to return 100 to simulate time passed
    //     Date.now = jest.fn(() => 100);

    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     // Run
    //     const xhr = new XMLHttpRequest();
    //     xhr.open('GET', './response.json', true);
    //     xhr.send();

    //     // OngoingActivity should contain the xhr until request is completed
    //     expect(mockRequestCache.size).toEqual(0);
    //     expect(notLoadedPage.ongoingActivity.size).toEqual(1);

    //     // Yield to the event queue so the event listeners can run
    //     await new Promise((resolve) => setTimeout(resolve, 0));

    //     // Current page's latestEndTime should be updated and ongoingActivity is empty
    //     expect(mockRequestCache.size).toEqual(0);
    //     expect(notLoadedPage.latestEndTime).toEqual(100);
    //     expect(notLoadedPage.ongoingActivity.size).toEqual(0);
    // });

    // test('when fetch is detected then fetchCounter should increment', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         loadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     global.fetch = mockFetch;
    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     await fetch('https://aws.amazon.com');
    //     expect(xRayOffContext.incrementFetch).toBeCalledTimes(1);
    //     expect(xRayOffContext.decrementFetch).toBeCalledTimes(1);
    // });

    // test('when fetch is returns 500 then fetchCounter should increment', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         loadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     global.fetch = mockFetchWith500;
    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     await fetch('https://aws.amazon.com');
    //     expect(xRayOffContext.incrementFetch).toBeCalledTimes(1);
    //     expect(xRayOffContext.decrementFetch).toBeCalledTimes(1);
    // });

    // test('when fetch is returns error then fetchCounter should increment', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         loadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     global.fetch = mockFetchWithError;
    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     await fetch('https://aws.amazon.com');
    //     expect(xRayOffContext.incrementFetch).toBeCalledTimes(1);
    //     expect(xRayOffContext.decrementFetch).toBeCalledTimes(1);
    // });

    // test('when fetch is returns error object then fetchCounter should increment', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         loadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     global.fetch = mockFetchWithErrorObject;
    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     await fetch('https://aws.amazon.com');
    //     expect(xRayOffContext.incrementFetch).toBeCalledTimes(1);
    //     expect(xRayOffContext.decrementFetch).toBeCalledTimes(1);
    // });

    // test('when fetch is returns error object and stack trace then fetchCounter should increment', async () => {
    //     // Init
    //     const plugin: TrackerPlugin = new TrackerPlugin();
    //     (xRayOffContext.getCurrentPage as jest.Mock).mockReturnValue(
    //         loadedPage
    //     );
    //     (xRayOffContext.getRequestCache as jest.Mock).mockReturnValue(
    //         mockRequestCache
    //     );

    //     global.fetch = mockFetchWithErrorObjectAndStack;
    //     // Reuse context from xhrPlugin.test.ts
    //     plugin.load(xRayOffContext);

    //     await fetch('https://aws.amazon.com');
    //     expect(xRayOffContext.incrementFetch).toBeCalledTimes(1);
    //     expect(xRayOffContext.decrementFetch).toBeCalledTimes(1);
    // });
});
