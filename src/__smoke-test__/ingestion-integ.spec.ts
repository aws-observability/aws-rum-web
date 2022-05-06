import { test, expect } from '@playwright/test';
import {
    RUMClient,
    GetAppMonitorDataCommand,
    GetAppMonitorDataCommandInput
} from '@aws-sdk/client-rum';
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

// Environment variables set through CLI command
const ENDPOINT = process.env.ENDPOINT;
const MONITOR_ID = process.env.MONITOR;
const TEST_URL = process.env.URL || 'http://localhost:9000/smoke.html';
const MONITOR_NAME = process.env.NAME;

const REGION = ENDPOINT.split('.')[2];
const TARGET_URL = ENDPOINT + MONITOR_ID + '/';

// Parse region from endpoint
const rumClient = new RUMClient({ region: REGION });

function getEventsByType(requestBody, eventType) {
    return requestBody.RumEvents.filter((e) => e.type === eventType);
}
function getEventIds(events) {
    return events.map((e) => e.id);
}

/**
 * Returns true if the request is a successful PutRumEvents request
 */
function isDataPlaneRequest(response): boolean {
    const request = response.request();
    return (
        request.method() === 'POST' &&
        response.status() === 200 &&
        response.url() === TARGET_URL
    );
}

/** Returns true when all events were ingested */
async function verifyIngestionWithRetry(eventIds, timestamp, retryCount) {
    while (true) {
        if (retryCount === 0) {
            console.log('Retry attempt exhausted.');
            return false;
        }
        try {
            await isEachEventIngested(eventIds, timestamp);
            return true;
        } catch (error) {
            retryCount -= 1;
            console.log(`${error.message} Waiting for next retry.`);
            await new Promise((r) => setTimeout(r, 60000));
        }
    }
}

async function isEachEventIngested(eventIds, timestamp) {
    let ingestedEvents = new Set();
    const input: GetAppMonitorDataCommandInput = {
        Name: MONITOR_NAME,
        TimeRange: {
            After: timestamp
        }
    };
    let command = new GetAppMonitorDataCommand(input);
    // Running tests in parallel require pagination logic, as several test cases have the same timestamp
    while (true) {
        const data = await rumClient.send(command);
        for (let i = 0; i < data.Events.length; i++) {
            ingestedEvents.add(JSON.parse(data.Events[i]).event_id);
        }
        if (data.NextToken) {
            input.NextToken = data.NextToken;
            command = new GetAppMonitorDataCommand(input);
        } else {
            // If there are no more pages, we can finish the loop
            break;
        }
    }

    for (let i = 0; i < eventIds.length; i++) {
        if (!ingestedEvents.has(eventIds[i])) {
            throw new Error(`Event ${eventIds[i]} not ingested.`);
        }
    }
}

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
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const session = getEventsByType(requestBody, SESSION_START_EVENT_TYPE);
    const eventIds = getEventIds(session);

    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
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
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const resource = getEventsByType(
        requestBody,
        PERFORMANCE_RESOURCE_EVENT_TYPE
    );
    const eventIds = getEventIds(resource);

    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when LCP event is sent then event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const clearButton = page.locator('[id=clearRequestResponse]');
    await clearButton.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const lcp = getEventsByType(requestBody, LCP_EVENT_TYPE);
    const eventIds = getEventIds(lcp);

    expect(eventIds.length).not.toEqual(0);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});

test('when FID event is sent then event is ingested', async ({ page }) => {
    const timestamp = Date.now() - 30000;

    // Open page
    await page.goto(TEST_URL);
    const clearButton = page.locator('[id=clearRequestResponse]');
    await clearButton.click();

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const fid = getEventsByType(requestBody, FID_EVENT_TYPE);
    const eventIds = getEventIds(fid);

    expect(eventIds.length).not.toEqual(0);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
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
        isDataPlaneRequest(response)
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
        eventIds,
        timestamp,
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
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const pageViews = getEventsByType(requestBody, PAGE_VIEW_EVENT_TYPE);
    const eventIds = getEventIds(pageViews);

    // One initial load, one route change
    expect(eventIds.length).toEqual(2);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
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
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const errors = getEventsByType(requestBody, JS_ERROR_EVENT_TYPE);
    const eventIds = getEventIds(errors);

    // Expect three js error events
    expect(eventIds.length).toEqual(3);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
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
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const httpEvents = getEventsByType(requestBody, HTTP_EVENT_TYPE);
    const eventIds = getEventIds(httpEvents);

    // Expect three js error events
    expect(eventIds.length).toEqual(2);
    const isIngestionCompleted = await verifyIngestionWithRetry(
        eventIds,
        timestamp,
        5
    );
    expect(isIngestionCompleted).toEqual(true);
});
