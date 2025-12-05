import { test, expect } from '@playwright/test';
import { SESSION_START_EVENT_TYPE } from '../plugins/utils/constant';

test.describe('Cookies Disabled', () => {
    test('when cookies are disabled, no session start event is dispatched', async ({
        page
    }) => {
        await page.goto('/cookies_disabled.html');

        // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
        await page.waitForTimeout(300);
        await page.click('#dispatch');
        await page.waitForTimeout(300);

        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const json = JSON.parse(requestBodyText || '{}');
        const sessionStartEvents = json.RumEvents.filter(
            (e: any) => e.eventType === SESSION_START_EVENT_TYPE
        );

        expect(sessionStartEvents.length).toBe(0);
    });
});
