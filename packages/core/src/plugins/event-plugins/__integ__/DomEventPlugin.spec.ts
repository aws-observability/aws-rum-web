import { test, expect } from '@playwright/test';
import { DOM_EVENT_TYPE } from '../../utils/constant';

test.describe('DomEventPlugin', () => {
    test('when document click events configured then button click is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#button1');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button1'
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            event: 'click',
            elementId: 'button1'
        });
    });

    test('when element without an id is clicked then node type is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('a');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).element === 'A'
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            event: 'click',
            element: 'A'
        });
    });

    test('when element id click event configured then button click is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#button1');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button1'
        );

        expect(JSON.parse(events[0].details)).toMatchObject({
            event: 'click',
            elementId: 'button1'
        });
    });

    test('when client is disabled then button click is not recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#disable');
        await page.click('#button1');
        await page.click('#enable');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button1'
        );

        expect(events.length).toBe(0);
    });

    test('when client is disabled and enabled then button click is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#disable');
        await page.click('#enable');
        await page.click('#button1');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button1'
        );

        expect(JSON.parse(events[0].details)).toMatchObject({
            event: 'click',
            elementId: 'button1'
        });
    });

    test('when element identified by a CSS selector is clicked then CSS selector is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#button2');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label1"]'
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            event: 'click',
            cssLocator: '[label="label1"]'
        });
    });

    test('when two elements identified by a CSS selector are clicked then CSS selector is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#button2');
        await page.click('#button3');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
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

    test('when element not identified by a CSS selector is clicked then CSS selector field is not recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#button1');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button1'
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails.cssLocator).toBeUndefined();
    });

    test('when element ID and CSS selector are specified then only event for element identified by CSS selector is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#button1');
        await page.click('#button3');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label1"]'
        );
        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(DOM_EVENT_TYPE);
        expect(eventDetails).not.toHaveProperty('elementId', 'button1');
    });

    test('when new DOM events are registered and then a button is clicked, the event is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#registerDomEvents');
        await page.click('#button5');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label2"]'
        );

        expect(events.length).toBe(1);
        events.forEach((event: any) => {
            const eventType = event.type;
            const eventDetails = JSON.parse(event.details);

            expect(eventType).toBe(DOM_EVENT_TYPE);
            expect(eventDetails).toMatchObject({
                event: 'click',
                cssLocator: '[label="label2"]'
            });
        });
    });

    test('when enableMutationObserver is false by default and listening for a click on a dynamically added element given an element id, the event is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
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
        expect(events.length).toBe(1);
    });

    test('when enableMutationObserver is false by default and listening for a click on a dynamically added element given a CSS locator, the event is not recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label1"]'
        );

        expect(events.length).toBe(0);
    });

    test('when enableMutationObserver is false by default and listening for a click given a CSS selector on an existing element and a dynamically added element, only one event is recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#button2');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).cssLocator === '[label="label1"]'
        );

        expect(events.length).toBe(1);
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

    test('when client is disabled then click on dynamically added element is not recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#disable');
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#enable');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button4'
        );

        expect(events.length).toBe(0);
    });

    test('when client is disabled then clicks on existing or dynamically added element are not recorded', async ({
        page
    }) => {
        await page.goto('/dom_event.html');

        await page.waitForTimeout(300);
        await page.click('#disable');
        await page.click('#dynamicallyCreateButton');
        await page.waitForTimeout(300);
        await page.click('#button4');
        await page.click('#button2');
        await page.click('#enable');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === DOM_EVENT_TYPE &&
                JSON.parse(e.details).elementId === 'button2'
        );

        expect(events.length).toBe(0);
    });
});
