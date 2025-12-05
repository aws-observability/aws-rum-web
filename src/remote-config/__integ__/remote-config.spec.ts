import { test, expect } from '@playwright/test';
import { JS_ERROR_EVENT_TYPE } from '../../plugins/utils/constant';

test.describe('Remote config file download Tests', () => {
    test('When configURI is provided, then remote config is used', async ({
        page
    }) => {
        await page.goto('/remote_config.html');

        await page.waitForTimeout(300);
        await page.click('#triggerTypeError');
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === JS_ERROR_EVENT_TYPE
        );

        // An error event should not have been recorded, since the error plugin is
        // omitted from the telemetries list in the remote config.
        expect(events.length).toBe(0);
    });
});
