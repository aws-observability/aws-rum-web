import { test, expect } from '@playwright/test';
import {
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE,
    PAGE_VIEW_EVENT_TYPE,
    SESSION_START_EVENT_TYPE
} from '../plugins/utils/constant';

// Environment variables set through CLI command
const ENDPOINT = process.env.ENDPOINT;
const MONITOR_ID = process.env.MONITOR;
const TEST_URL = process.env.URL || 'http://localhost:9000/smoke.html';

const TARGET_URL = ENDPOINT + MONITOR_ID + '/';

function getEventsByType(requestBody, eventType) {
    return requestBody.RumEvents.filter((e) => e.type === eventType);
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

test('when web client calls PutRumEvents then the response code is 200', async ({
    page
}) => {
    // Open page
    await page.goto(TEST_URL);

    // Test will timeout if no successful dataplane request is found
    await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response)
    );
});

test('when web client calls PutRumEvents then the payload contains all events', async ({
    page
}) => {
    // Expected number of events per type
    const SESSION_START_COUNT = 1;
    const PAGEVIEW_COUNT = 1;
    const NAVIGATION_COUNT = 1;
    const RESOURCE_EVENT_COUNT = 1;

    // Open page
    await page.goto(TEST_URL);

    // Test will timeout if no successful dataplane request is found
    const response = await page.waitForResponse(async (response) =>
        isDataPlaneRequest(response)
    );

    // Parse payload to verify event count
    const requestBody = JSON.parse(response.request().postData());

    const session = getEventsByType(requestBody, SESSION_START_EVENT_TYPE);
    const navigation = getEventsByType(
        requestBody,
        PERFORMANCE_NAVIGATION_EVENT_TYPE
    );
    const pageView = getEventsByType(requestBody, PAGE_VIEW_EVENT_TYPE);
    const resource = getEventsByType(
        requestBody,
        PERFORMANCE_RESOURCE_EVENT_TYPE
    );

    // Verify no events are dropped
    expect(session.length).toEqual(SESSION_START_COUNT);
    expect(pageView.length).toEqual(PAGEVIEW_COUNT);
    expect(navigation.length).toEqual(NAVIGATION_COUNT);
    expect(resource.length).toEqual(RESOURCE_EVENT_COUNT);
});
