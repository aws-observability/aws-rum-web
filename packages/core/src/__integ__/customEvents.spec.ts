import { test, expect } from '@playwright/test';

const API_EVENT_TYPE = 'custom_event_api';
const PLUGIN_EVENT_TYPE = 'custom_event_plugin';
const COUNT = 5;

const removeUnwantedEvents = (json: any) => {
    const newEventsList = json.RumEvents.filter(
        (e: any) =>
            /(custom_event_api)/.test(e.type) ||
            /(custom_event_plugin)/.test(e.type)
    );

    json.RumEvents = newEventsList;
    return json;
};

test.describe('Custom Events API & Plugin', () => {
    test('when a recordEvent API is called then event is recorded', async ({
        page
    }) => {
        await page.goto('/custom_event.html');

        // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
        await page.waitForTimeout(300);
        await page.click('#recordEventAPI');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);

        expect(eventType).toBe(API_EVENT_TYPE);
        expect(eventDetails.customEventVersion).toBe(255);
    });

    test('when a recordEvent API is called x times then event is recorded x times', async ({
        page
    }) => {
        await page.goto('/custom_event.html');

        await page.waitForTimeout(300);
        for (let i = 0; i < COUNT; i++) {
            await page.click('#recordEventAPI');
        }

        await page.click('#dispatch');
        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));

        expect(json.RumEvents.length).toBe(COUNT);
        json.RumEvents.forEach((item: any) => {
            const eventType = item.type;
            const eventDetails = JSON.parse(item.details);
            expect(eventType).toBe(API_EVENT_TYPE);
            expect(eventDetails.customEventVersion).toBe(255);
        });
    });

    test('when a recordEvent API has empty event_data then RumEvent detail is empty', async ({
        page
    }) => {
        await page.goto('/custom_event.html');

        await page.waitForTimeout(300);
        await page.click('#recordEventAPIEmpty');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));

        expect(json.RumEvents.length).toBe(1);
        expect(json.RumEvents[0].type).toBe(API_EVENT_TYPE);
        expect(json.RumEvents[0].details).toBe('{}');
    });

    test('when a plugin calls recordEvent then the event is recorded', async ({
        page
    }) => {
        await page.goto('/custom_event.html');

        await page.waitForTimeout(300);
        await page.click('#pluginRecord');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);

        expect(eventType).toBe(PLUGIN_EVENT_TYPE);
        expect(eventDetails.intField).toBe(1);
        expect(eventDetails.stringField).toBe('string');
        expect(eventDetails.nestedField).toEqual({ subfield: 1 });
    });

    test('when a plugin calls recordEvent x times then event is recorded x times', async ({
        page
    }) => {
        await page.goto('/custom_event.html');

        await page.waitForTimeout(300);
        for (let i = 0; i < COUNT; i++) {
            await page.click('#pluginRecord');
        }

        await page.click('#dispatch');
        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));

        expect(json.RumEvents.length).toBe(COUNT);
        json.RumEvents.forEach((item: any) => {
            const eventType = item.type;
            const eventDetails = JSON.parse(item.details);
            expect(eventType).toBe(PLUGIN_EVENT_TYPE);
            expect(eventDetails.intField).toBe(1);
            expect(eventDetails.stringField).toBe('string');
            expect(eventDetails.nestedField).toEqual({ subfield: 1 });
        });
    });

    test('when plugin recordEvent has empty event_data then RumEvent details is empty', async ({
        page
    }) => {
        await page.goto('/custom_event.html');

        await page.waitForTimeout(300);
        await page.click('#pluginRecordEmpty');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));

        expect(json.RumEvents.length).toBe(1);
        expect(json.RumEvents[0].type).toBe(PLUGIN_EVENT_TYPE);
        expect(json.RumEvents[0].details).toBe('{}');
    });
});
