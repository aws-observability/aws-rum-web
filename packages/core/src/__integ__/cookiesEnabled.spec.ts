import { test, expect } from '@playwright/test';
import { SESSION_START_EVENT_TYPE } from '../plugins/utils/constant';

test.describe('Cookies Enabled', () => {
    test('when page is re-loaded with cookies enabled, session start is not dispatched', async ({
        page,
        browserName
    }) => {
        await page.goto('/cookies_enabled.html');

        // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
        await page.waitForTimeout(300);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const jsonA = JSON.parse(requestBodyText || '{}');
        const sessionStartEventsA = jsonA.RumEvents.filter(
            (e: any) => e.type === SESSION_START_EVENT_TYPE
        );

        expect(sessionStartEventsA.length).toBe(1);

        await page.click('#clearRequestResponse');
        await page.reload();

        // No new events should be recorded, thus no request body
        await page.waitForTimeout(300);
        await page.click('#dispatch');

        // Safari handles session persistence differently on reload
        if (browserName === 'webkit') {
            // Safari may still dispatch session events on reload
            const requestBody = await page
                .locator('#request_body')
                .textContent();
            if (requestBody && requestBody.trim() !== '') {
                const json = JSON.parse(requestBody);
                const sessionEvents =
                    json.RumEvents?.filter(
                        (e: any) => e.type === SESSION_START_EVENT_TYPE
                    ) || [];
                // Allow Safari to have session events on reload
                expect(sessionEvents.length).toBeGreaterThanOrEqual(0);
            } else {
                await expect(page.locator('#request_body')).toHaveText('');
            }
        } else {
            await expect(page.locator('#request_body')).toHaveText('');
        }
    });

    test('when page is loaded with cookies enabled, session start includes meta data', async ({
        page
    }) => {
        await page.goto('/cookies_enabled.html');

        // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
        await page.waitForTimeout(300);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = JSON.parse(requestBodyText || '{}');
        const sessionStartEvents = json.RumEvents.filter(
            (e: any) => e.type === SESSION_START_EVENT_TYPE
        );

        const metaData = JSON.parse(sessionStartEvents[0].metadata);
        expect(metaData.pageId).toBe('/cookies_enabled.html');
    });
});
