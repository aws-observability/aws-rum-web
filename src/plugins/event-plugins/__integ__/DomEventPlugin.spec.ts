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
});
