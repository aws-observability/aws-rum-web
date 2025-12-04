import { test, expect } from '@playwright/test';

test.describe('Sanity check', () => {
    test('index.html of the integ test application loads', async ({ page }) => {
        await page.goto('/');

        const welcome = page.locator('#welcome');
        await expect(welcome).toHaveText(
            'This application is used for RUM integ testing.'
        );
    });
});
