import { test, expect } from '@playwright/test';
import { JS_ERROR_EVENT_TYPE } from '../../utils/constant';

const removeUnwantedEvents = (json: any) => {
    const newEventsList = [];
    for (const event of json.RumEvents) {
        if (/(dispatch)/.test(event.details)) {
            // Skip
        } else if (/(session_start_event)/.test(event.type)) {
            // Skip
        } else if (/(page_view_event)/.test(event.type)) {
            // Skip
        } else {
            newEventsList.push(event);
        }
    }

    json.RumEvents = newEventsList;
    return json;
};

test.describe('JSErrorEvent Plugin', () => {
    test('when a TypeError is thrown then name and message are recorded', async ({
        page
    }) => {
        await page.goto('/js_error_event.html');

        await page.waitForTimeout(300);
        await page.click('#triggerTypeError');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === JS_ERROR_EVENT_TYPE
        );
        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(JS_ERROR_EVENT_TYPE);
        expect(eventDetails.type).toContain('TypeError');
        expect(eventDetails.message).toMatch(/(undefined|null)/);
        expect(eventDetails.filename).toMatch(/js_error_event.html/);
        expect(typeof eventDetails.lineno).toBe('number');
        expect(typeof eventDetails.colno).toBe('number');
    });

    test('when a promise rejection is thrown then name is recorded', async ({
        page
    }) => {
        await page.goto('/js_error_event.html');

        await page.waitForTimeout(300);
        await page.click('#uncaughtPromiseRejection');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);

        expect(eventType).toBe(JS_ERROR_EVENT_TYPE);
        expect(eventDetails.type).toContain('unhandledrejection');
        expect(eventDetails.message).toMatch(/promise is rejected/);
    });

    test('when the application records a caught error then the plugin records the error', async ({
        page
    }) => {
        await page.goto('/js_error_event.html');

        await page.waitForTimeout(300);
        await page.click('#recordCaughtError');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === JS_ERROR_EVENT_TYPE
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(events.length).toBe(1);
        expect(eventType).toBe(JS_ERROR_EVENT_TYPE);
        expect(eventDetails.type).toContain('Error');
        expect(eventDetails.message).toContain('My error message');
    });
});
