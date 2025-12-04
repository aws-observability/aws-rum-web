import { test, expect } from '@playwright/test';

test.describe('Alias Included', () => {
    test('when alias is included and events are recorded, PutRumEvents requests contains the alias', async ({
        page,
        browserName
    }) => {
        // Skip firefox, till Firefox supports longtasks
        test.skip(
            browserName === 'firefox',
            'Firefox does not support longtasks'
        );

        await page.goto('/alias_included.html');

        await page.click('#testButton');
        await page.waitForTimeout(100);
        await page.click('#dispatch');
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#response_status')).toHaveText('202');
        await expect(page.locator('#request_body')).toContainText('BatchId');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const requestBody = JSON.parse(requestBodyText || '{}');
        expect(requestBody['Alias']).toBe('test123');
    });
});
