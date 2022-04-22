import { test, expect } from '@playwright/test';
import {
    HTTP_EVENT_TYPE,
    JS_ERROR_EVENT_TYPE,
    LCP_EVENT_TYPE,
    FID_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE,
    PAGE_VIEW_EVENT_TYPE,
    SESSION_START_EVENT_TYPE
} from '../plugins/utils/constant';

// Secrete constant values retrieved from GitHub
const endpoint = '${process.env.ENDPOINT}';
const monitorId = '${process.env.MONITOR_ID}';
const url = '${process.env.SMOKE_URL}';

function parseBatches(requestData) {
    const output = [];
    for (let i = 0; i < requestData.length; i++) {
        const parsed = JSON.parse(requestData[i]).RumEvents;
        for (let j = 0; j < parsed.length; j++) {
            output.push(parsed[j]);
        }
    }
    return output;
}

function addEventsToList(parsedPayload, eventList) {
    for (let i = 0; i < parsedPayload.length; i++) {
        eventList.push(parsedPayload[i].id);
    }
}

function getEventsByType(requestBody, eventType) {
    return requestBody.filter((e) => e.type === eventType);
}

function filterSuccessfulResponse(response, requestBody) {
    // filter out irrelevant, unsuccessful network request/response
    const request = response.request();
    if (
        request &&
        response.status() === 200 &&
        request.method() === 'POST' &&
        response.url() === endpoint + monitorId + '/' &&
        request.postData()
    ) {
        requestBody.push(request.postData());
    }
}

// Timestamp to filter events fetched via getAppMonitorData API
const time = Date.now();

test.describe('Smoke test fixtures', () => {
    let page;
    const eventIds = [];

    // Use single browser context to prevent multiple sessions per test
    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        page = await context.newPage();
        await page.goto(url);
    });

    test.afterAll(async ({ browser }) => {
        browser.close;
    });

    test('test initial events are emitted', async () => {
        const SESSION_START_COUNT = 1;
        const PAGEVIEW_COUNT = 1;
        const NAVIGATION_COUNT = 1;
        const RESOURCE_EVENT_COUNT = 1;
        const expectedPage = '/smoke.html';
        const requestBody = [];

        // Collect successful requests
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // Wait until fetch is complete
        await page.waitForTimeout(10000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const session = getEventsByType(
            parsedPayload,
            SESSION_START_EVENT_TYPE
        );
        const navigation = getEventsByType(
            parsedPayload,
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        const pageView = getEventsByType(parsedPayload, PAGE_VIEW_EVENT_TYPE);
        const resource = getEventsByType(
            parsedPayload,
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );

        // Verify action is captured
        expect(session.length).toEqual(SESSION_START_COUNT);
        expect(pageView.length).toEqual(PAGEVIEW_COUNT);
        expect(navigation.length).toEqual(NAVIGATION_COUNT);
        expect(resource.length).toEqual(RESOURCE_EVENT_COUNT);

        // Parse metadata to verify pageId
        const pageId = JSON.parse(pageView[0].metadata).pageId;
        const navigationPageId = JSON.parse(pageView[0].metadata).pageId;
        expect(pageId).toEqual(expectedPage);
        expect(navigationPageId).toEqual(expectedPage);

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });

    test('test FID and LCP events are emitted', async () => {
        const expectedPage = '/smoke.html';
        const requestBody = [];
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // FID and LCP require user interaction and clear does not trigger other events
        const clearButton = page.locator('[id=clearRequestResponse]');
        await clearButton.click();

        // Wait until fetch is complete
        await page.waitForTimeout(10000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const lcp = getEventsByType(parsedPayload, LCP_EVENT_TYPE);
        const fid = getEventsByType(parsedPayload, FID_EVENT_TYPE);

        // Web vital events are only emitted once
        expect(lcp.length).toEqual(1);
        expect(fid.length).toEqual(1);

        // Parse metadata to verify pageId
        const lcpPageId = JSON.parse(lcp[0].metadata).pageId;
        const fidPageId = JSON.parse(fid[0].metadata).pageId;
        expect(lcpPageId).toEqual(expectedPage);
        expect(fidPageId).toEqual(expectedPage);

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });

    test('test navigation events using pushState are emitted', async () => {
        const PAGEVIEW_COUNT = 2;
        const NAVIGATION_COUNT = 2;
        const expectedPages = ['/page_view_one', '/page_view_two'];
        const requestBody = [];

        // Selector for pushStateOne
        const pushStateOne = page.locator('[id=pushStateOneToHistory]');
        const pushStateTwo = page.locator('[id=pushStateTwoToHistory]');

        // Trigger pushStateOne
        await page.waitForTimeout(300);
        await pushStateOne.click();

        // Collect successful requests
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger pushStateTwo
        await pushStateTwo.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const navigation = getEventsByType(
            parsedPayload,
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        const pageView = getEventsByType(parsedPayload, PAGE_VIEW_EVENT_TYPE);

        // Verify action is captured
        expect(pageView.length).toEqual(PAGEVIEW_COUNT);
        expect(navigation.length).toEqual(NAVIGATION_COUNT);

        // Parse metadata to verify pageId
        for (let i = 0; i < pageView.length; i++) {
            const pageId = JSON.parse(pageView[i].metadata).pageId;
            const navigationPageId = JSON.parse(pageView[i].metadata).pageId;
            expect(pageId).toEqual(expectedPages[i]);
            expect(navigationPageId).toEqual(pageId);
        }

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });

    test('test navigation events using replaceState are emitted', async () => {
        const PAGEVIEW_COUNT = 2;
        const NAVIGATION_COUNT = 2;
        const expectedPages = ['/page_view_Ten', '/page_event.html'];
        const requestBody = [];

        // Selector for replaceState
        const replaceState = page.locator('[id=replaceState]');
        const replaceDefault = page.locator('[id=replaceDefault]');

        // Trigger replaceState
        await page.waitForTimeout(300);
        await replaceState.click();

        // Collect successful requests
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger replaceDefault
        await replaceDefault.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const navigation = getEventsByType(
            parsedPayload,
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        const pageView = getEventsByType(parsedPayload, PAGE_VIEW_EVENT_TYPE);

        // Verify action is captured
        expect(pageView.length).toEqual(PAGEVIEW_COUNT);
        expect(navigation.length).toEqual(NAVIGATION_COUNT);

        // Parse metadata to verify pageId
        for (let i = 0; i < pageView.length; i++) {
            const pageId = JSON.parse(pageView[i].metadata).pageId;
            const navigationPageId = JSON.parse(pageView[i].metadata).pageId;
            expect(pageId).toEqual(expectedPages[i]);
            expect(navigationPageId).toEqual(pageId);
        }

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });

    test('test navigation events using back/forward/go are emitted', async () => {
        const PAGEVIEW_COUNT = 4;
        const NAVIGATION_COUNT = 4;
        const expectedPages = [
            '/page_view_one',
            '/page_event.html',
            '/smoke.html',
            '/page_event.html'
        ];
        const requestBody = [];

        // Selector for back/forward
        const back = page.locator('[id=back]');
        const forward = page.locator('[id=forward]');
        const backTwo = page.locator('[id=go-back]');
        const forwardTwo = page.locator('[id=go-forward]');

        // Trigger back
        await page.waitForTimeout(300);
        await back.click();

        // Collect successful requests
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger forward
        await forward.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger go(-2)
        await backTwo.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger go(2)
        await forwardTwo.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const navigation = getEventsByType(
            parsedPayload,
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        const pageView = getEventsByType(parsedPayload, PAGE_VIEW_EVENT_TYPE);

        // Verify action is captured
        expect(pageView.length).toEqual(PAGEVIEW_COUNT);
        expect(navigation.length).toEqual(NAVIGATION_COUNT);

        // Parse metadata to verify pageId
        for (let i = 0; i < pageView.length; i++) {
            const pageId = JSON.parse(pageView[i].metadata).pageId;
            const navigationPageId = JSON.parse(pageView[i].metadata).pageId;
            expect(pageId).toEqual(expectedPages[i]);
            expect(navigationPageId).toEqual(pageId);
        }

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });

    test('test error events are emitted', async () => {
        const ERROR_COUNT = 3;
        const expectedPage = '/page_event.html';
        const requestBody = [];

        // Selector for errors
        const typeError = page.locator('[id=triggerTypeError]');
        const errorString = page.locator('[id=throwErrorString]');
        const caughtError = page.locator('[id=recordCaughtError]');

        // Trigger typeError
        await page.waitForTimeout(300);
        await typeError.click();

        // Collect successful requests
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger errorString
        await errorString.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger caughtError
        await caughtError.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const errors = getEventsByType(parsedPayload, JS_ERROR_EVENT_TYPE);

        // Verify action is captured
        expect(errors.length).toEqual(ERROR_COUNT);

        // Parse metadata to verify pageId
        for (let i = 0; i < errors.length; i++) {
            const pageId = JSON.parse(errors[i].metadata).pageId;
            expect(pageId).toEqual(expectedPage);
        }

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });
    test('test http events are emitted', async () => {
        // RUM does not record HTTP events with 200 status code
        // PlayGame (Send fetch requests) generates 1 HTTP event and 1 error event
        const HTTP_EVENT_COUNT = 3;
        const ERROR_COUNT = 1;
        const expectedPage = '/page_event.html';
        const requestBody = [];

        // Selector for HTTP events
        const fetch200 = page.locator('[id=httpStatFetch200]');
        const fetch500 = page.locator('[id=httpStatFetch500]');
        const xhr200 = page.locator('[id=httpStatXhr200]');
        const xhr500 = page.locator('[id=httpStatXhr500]');
        const playGame = page.locator('[id=playGame]');

        // Trigger fetch200
        await page.waitForTimeout(300);
        await fetch200.click();

        // Collect successful requests
        page.on('response', (response) =>
            filterSuccessfulResponse(response, requestBody)
        );

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger fetch500
        await fetch500.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger xhr200
        await xhr200.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger xhr500
        await xhr500.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Trigger playGame
        await playGame.click();

        // Wait until fetch is complete
        await page.waitForTimeout(5000);

        // Parse payload
        const parsedPayload = parseBatches(requestBody);
        const http = getEventsByType(parsedPayload, HTTP_EVENT_TYPE);
        const errors = getEventsByType(parsedPayload, JS_ERROR_EVENT_TYPE);

        // Verify action is captured
        expect(http.length).toEqual(HTTP_EVENT_COUNT);
        expect(errors.length).toEqual(ERROR_COUNT);

        // Parse metadata to verify pageId
        for (let i = 0; i < errors.length; i++) {
            const pageId = JSON.parse(errors[i].metadata).pageId;
            expect(pageId).toEqual(expectedPage);
        }

        // Add all event ids to eventIds array
        addEventsToList(parsedPayload, eventIds);
    });
});
