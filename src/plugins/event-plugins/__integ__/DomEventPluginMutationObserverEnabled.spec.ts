import { test, expect } from '@playwright/test';
import { DOM_EVENT_TYPE } from '../../utils/constant';

test.describe('DomEventPluginMutationObserverEnabled', () => {
    test('when enableMutationObserver is true by default and listening for a click on a dynamically added element given an element id, the event is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event_mutation_observer_enabled.html');

        await page.waitForTimeout(300);
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button4'
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            event: 'click',
            elementId: 'button4'
        });
    });

    test('when enableMutationObserver is true by default and listening for a click on a dynamically added element given a CSS locator, the event is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event_mutation_observer_enabled.html');

        await page.waitForTimeout(300);
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label1"]'
        );

        expect(events.length).toBe(1);
        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            event: 'click',
            cssLocator: '[label="label1"]'
        });
    });

    test('when enableMutationObserver is true by default and listening for a click given a CSS selector on an existing element and a dynamically added element, both events are recorded', async ({
        page
    }) => {
        await page.goto('/dom_event_mutation_observer_enabled.html');

        await page.waitForTimeout(300);
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#button2');
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label1"]'
        );

        expect(events.length).toBe(2);
        events.forEach((event: any) => {
            const eventType = event.type;
            const eventDetails = JSON.parse(event.details);

            expect(eventType).toBe(DOM_EVENT_TYPE);
            expect(eventDetails).toMatchObject({
                event: 'click',
                cssLocator: '[label="label1"]'
            });
        });
    });
});
