import { test, expect } from '@playwright/test';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../../utils/constant';

test.describe('ResourceEvent Plugin', () => {
    test('when resource loads after window.load then the resource is recorded', async ({
        page
    }) => {
        await page.goto('/delayed_image.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
                JSON.parse(e.details).targetUrl.includes('blank.png')
        );

        expect(events.length).toBe(1);
    });

    test('when resource loads before the plugin then the resource is recorded', async ({
        page
    }) => {
        await page.goto('/delayed_image.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) =>
                e.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
                JSON.parse(e.details).targetUrl.includes(
                    'rum_javascript_telemetry.js'
                )
        );

        expect(events.length).toBe(1);
    });
});
