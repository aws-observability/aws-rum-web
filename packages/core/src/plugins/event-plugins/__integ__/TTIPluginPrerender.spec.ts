import { test, expect } from '@playwright/test';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../utils/constant';

test.describe('TTI Plugin Prerender Navigation', () => {
    test('prerendered navigation records TTI events', async ({
        page,
        browserName
    }) => {
        // Skip firefox and webkit, till they support longtasks
        test.skip(
            browserName === 'firefox' || browserName === 'webkit',
            'Firefox and Safari do not support longtasks'
        );

        await page.goto('/index.html');

        // Click the prerendered navigation button to navigate to index.html
        await page.click('#prerenderedNav');
        await page.waitForTimeout(1000);

        await page.click('#testButton');
        await page.waitForTimeout(100);
        await page.click('#dispatch');
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        const responseStatus = await page
            .locator('#response_status')
            .textContent();
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();

        expect(responseStatus).toBe('202');
        expect(requestBodyText).toContain('BatchId');

        // Verify TTI events were recorded
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === TIME_TO_INTERACTIVE_EVENT_TYPE
        );

        // We should have at least one TTI event
        expect(events.length).toBeGreaterThanOrEqual(1);

        // Check the TTI event structure
        if (events.length > 0) {
            const ttiEvent = JSON.parse(events[0].details);
            expect(typeof ttiEvent.value).toBe('number');
        }
    });

    test('standard navigation records TTI events', async ({
        page,
        browserName
    }) => {
        // Skip firefox and webkit, till they support longtasks
        test.skip(
            browserName === 'firefox' || browserName === 'webkit',
            'Firefox and Safari do not support longtasks'
        );

        await page.goto('/index.html');

        // Click the standard navigation button to navigate to index.html
        await page.click('#standardNav');
        await page.waitForTimeout(1000);

        // On index.html, wait for TTI to be calculated
        await page.waitForTimeout(1000);

        await page.click('#testButton');
        await page.waitForTimeout(100);
        await page.click('#dispatch');
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        const responseStatus = await page
            .locator('#response_status')
            .textContent();
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();

        expect(responseStatus).toBe('202');
        expect(requestBodyText).toContain('BatchId');

        // Verify TTI events were recorded
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === TIME_TO_INTERACTIVE_EVENT_TYPE
        );

        // We should have at least one TTI event
        expect(events.length).toBeGreaterThanOrEqual(1);

        // Check the TTI event structure
        if (events.length > 0) {
            const ttiEvent = JSON.parse(events[0].details);
            expect(typeof ttiEvent.value).toBe('number');
        }
    });
});
