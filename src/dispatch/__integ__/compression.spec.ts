import { test, expect } from '@playwright/test';

test.describe('Compression', () => {
    test.describe('when compression is enabled', () => {
        test('large payload is compressed', async ({ page }) => {
            await page.goto('/compression.html');
            await page.waitForTimeout(300);

            // Record many events to exceed 2KB threshold
            await page.click('#recordManyEvents');
            await page.click('#dispatch');

            // Wait for request to be logged
            await page.waitForTimeout(300);

            // Verify payload was compressed
            const compressed = await page
                .locator('#request_compressed')
                .textContent();
            expect(compressed).toBe('true');

            // Verify Content-Encoding header is set
            const headers = await page.locator('#request_header').textContent();
            expect(headers).toContain('Content-Encoding=gzip');
        });

        test('compressed payload achieves at least 20% reduction', async ({
            page
        }) => {
            await page.goto('/compression.html');
            await page.waitForTimeout(300);

            // First dispatch uncompressed to get original size
            await page.click('#recordManyEvents');
            await page.goto('/compression_disabled.html');
            await page.waitForTimeout(300);
            await page.click('#recordManyEvents');
            await page.click('#dispatch');
            await page.waitForTimeout(300);

            const uncompressedSize = Number(
                await page.locator('#request_uncompressed_size').textContent()
            );

            // Now dispatch compressed
            await page.goto('/compression.html');
            await page.waitForTimeout(300);
            await page.click('#recordManyEvents');
            await page.click('#dispatch');
            await page.waitForTimeout(300);

            const compressedSize = Number(
                await page.locator('#request_compressed_size').textContent()
            );

            // Verify at least 20% reduction
            expect(compressedSize).toBeLessThan(uncompressedSize * 0.8);
        });

        test('small payload is not compressed', async ({ page }) => {
            await page.goto('/compression.html');
            await page.waitForTimeout(300);

            // Record a single small event (below 2KB threshold)
            await page.click('#recordSmallEvent');
            await page.click('#dispatch');

            // Wait for request to be logged
            await page.waitForTimeout(300);

            // Verify payload was not compressed
            const compressed = await page
                .locator('#request_compressed')
                .textContent();
            expect(compressed).toBe('false');

            // Verify body contains JSON
            const body = await page.locator('#request_body').textContent();
            expect(body).toContain('BatchId');
        });
    });

    test.describe('when compression is disabled', () => {
        test('large payload is not compressed', async ({ page }) => {
            await page.goto('/compression_disabled.html');
            await page.waitForTimeout(300);

            // Record many events to exceed 2KB threshold
            await page.click('#recordManyEvents');
            await page.click('#dispatch');

            // Wait for request to be logged
            await page.waitForTimeout(300);

            // Verify payload was not compressed
            const compressed = await page
                .locator('#request_compressed')
                .textContent();
            expect(compressed).toBe('false');

            // Verify body contains JSON
            const body = await page.locator('#request_body').textContent();
            expect(body).toContain('BatchId');

            // Verify Content-Encoding header is not set
            const headers = await page.locator('#request_header').textContent();
            expect(headers).not.toContain('Content-Encoding');
        });
    });
});
