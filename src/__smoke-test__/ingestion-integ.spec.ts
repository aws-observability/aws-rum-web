import { test, expect } from '@playwright/test';
import { RUMClient } from '@aws-sdk/client-rum';
import {
    HTTP_EVENT_TYPE,
    JS_ERROR_EVENT_TYPE,
    LCP_EVENT_TYPE,
    FID_EVENT_TYPE,
    CLS_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE,
    PAGE_VIEW_EVENT_TYPE,
    SESSION_START_EVENT_TYPE,
    DOM_EVENT_TYPE,
    XRAY_TRACE_EVENT_TYPE
} from '../plugins/utils/constant';
import {
    getEventIds,
    getEventsByType,
    getUrl,
    isDataPlaneRequest,
    verifyIngestionWithRetry
} from 'test-utils/smoke-test-utils';

// Environment variables set through CLI command
const ENDPOINT = process.env.ENDPOINT;
const MONITOR_ID = process.env.MONITOR;
const TEST_URL = getUrl(process.env.URL, process.env.VERSION);
const MONITOR_NAME = process.env.NAME;
const REGION = ENDPOINT.split('.')[2];
const TARGET_URL = ENDPOINT + MONITOR_ID + '/';

// Parse region from endpoint
const rumClient = new RUMClient({ region: REGION });

// Run the tests in parallel
test.describe.configure({ mode: 'parallel' });
test('when session start event is sent then event is ingested', async ({
    page
}) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const session = getEventsByType(requestBody, SESSION_START_EVENT_TYPE);
    const eventIds = getEventIds(session);

    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when resource event is sent then event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const resource = getEventsByType(
        requestBody,
        PERFORMANCE_RESOURCE_EVENT_TYPE
    );
    const eventIds = getEventIds(resource);

    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when LCP event is sent then event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const clearButton = page.locator('[id=dummyButton]');
    await clearButton.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const lcp = getEventsByType(requestBody, LCP_EVENT_TYPE);
    const eventIds = getEventIds(lcp);

    expect(eventIds.length).not.toEqual(0);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when FID event is sent then event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const clearButton = page.locator('[id=dummyButton]');
    await clearButton.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const fid = getEventsByType(requestBody, FID_EVENT_TYPE);
    const eventIds = getEventIds(fid);

    expect(eventIds.length).not.toEqual(0);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when navigation events are sent then events are ingested', async ({
    page
}) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const clearButton = page.locator('[id=pushStateOneToHistory]');
    await clearButton.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const navigation = getEventsByType(
        requestBody,
        PERFORMANCE_NAVIGATION_EVENT_TYPE
    );
    const eventIds = getEventIds(navigation);

    // One initial load, one route change
    expect(eventIds.length).toEqual(2);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when page view event is sent then the event is ingested', async ({
    page
}) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const clearButton = page.locator('[id=pushStateOneToHistory]');
    await clearButton.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const pageViews = getEventsByType(requestBody, PAGE_VIEW_EVENT_TYPE);
    const eventIds = getEventIds(pageViews);

    // One initial load, one route change
    expect(eventIds.length).toEqual(2);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when error events are sent then the events are ingested', async ({
    page
}) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const typeError = page.locator('[id=triggerTypeError]');
    const stringError = page.locator('[id=throwErrorString]');
    const caughtError = page.locator('[id=recordCaughtError]');
    await typeError.click();
    await stringError.click();
    await caughtError.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const errors = getEventsByType(requestBody, JS_ERROR_EVENT_TYPE);
    const eventIds = getEventIds(errors);

    // Expect three js error events
    expect(eventIds.length).toEqual(3);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when http events are sent then the events are ingested', async ({
    page
}) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const fetch500 = page.locator('[id=httpStatFetch500]');
    const xhr500 = page.locator('[id=httpStatXhr500]');
    await fetch500.click();
    await xhr500.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const httpEvents = getEventsByType(requestBody, HTTP_EVENT_TYPE);
    const eventIds = getEventIds(httpEvents);

    // Expect two http events
    expect(eventIds.length).toEqual(2);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when CLS event is sent then the event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const cls = page.locator('[id=dispatchCLS]');
    await cls.click();

    // CLS is reported only when the page is background or unloaded (visibilitychange)
    // Thus, while triggering CLS, Web client will use beacon instead of fetch
    // As a result, we need to take a substring of the existing target url
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(
            response,
            TARGET_URL.substring(0, TARGET_URL.length - 1)
        )
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const clsEvents = getEventsByType(requestBody, CLS_EVENT_TYPE);
    const eventIds = getEventIds(clsEvents);

    // Expect one cls event
    expect(eventIds.length).toEqual(1);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when dom event is sent then the event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const registerDom = page.locator('[id=registerDomEvents]');
    const triggerDom = page.locator('[id=triggerDom]');
    await registerDom.click();
    await triggerDom.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const domEvent = getEventsByType(requestBody, DOM_EVENT_TYPE);
    const eventIds = getEventIds(domEvent);

    // Expect one dom event
    expect(eventIds.length).toEqual(1);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when xray event is sent then the event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const http200 = page.locator('[id=httpStatFetch200]');
    await http200.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response, TARGET_URL)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const xrayEvent = getEventsByType(requestBody, XRAY_TRACE_EVENT_TYPE);
    const eventIds = getEventIds(xrayEvent);

    // Except one xray event
    expect(eventIds.length).toEqual(1);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        rumClient,
        eventIds,
        timestamp,
        MONITOR_NAME,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});
