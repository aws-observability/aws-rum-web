import { test, expect } from '@playwright/test';

test.describe('Unsupported Browsers', () => {
    test('when a browser is not supported then the command function is a no-op', async ({
        page
    }) => {
        await page.goto('/unsupported_browser.html');

        await page.waitForTimeout(300);
        await page.click('#viewCommandQueueFunction');

        let commandFunction = await page.locator('#cwr_function').textContent();
        commandFunction = (commandFunction || '').replace(/\s/g, '');

        expect(commandFunction).toContain('function(){}');
    });
});
