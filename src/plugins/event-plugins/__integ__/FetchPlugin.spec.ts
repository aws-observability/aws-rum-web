import { test, expect } from '@playwright/test';
import { XRAY_TRACE_EVENT_TYPE, HTTP_EVENT_TYPE } from '../../utils/constant';

test.describe('X-Ray Fetch Plugin', () => {
    test('when fetch is called then a trace is recorded', async ({ page }) => {
        await page.goto('/http_fetch_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#sendFetchRequest');

        const fetchRequestHeaders = await page
            .locator('#fetchRequestHeaders')
            .textContent();
        expect(fetchRequestHeaders).toMatch(
            /Root=1-[0-9a-f]{8}-[0-9a-f]{24};Parent=[0-9a-f]{16};Sampled=1/
        );

        await page.click('#dispatch');
        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = JSON.parse(requestBodyText || '{}');
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);

        expect(eventType).toBe(XRAY_TRACE_EVENT_TYPE);
        expect(eventDetails.name).toBe('sample.rum.aws.amazon.com');
    });

    test('when fetch is called then an http event is recorded', async ({
        page
    }) => {
        await page.goto('/http_fetch_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#sendFetchRequest');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = JSON.parse(requestBodyText || '{}');
        const eventType = json.RumEvents[1].type;
        const eventDetails = JSON.parse(json.RumEvents[1].details);

        expect(eventType).toBe(HTTP_EVENT_TYPE);
        expect(eventDetails.request.method).toBe('GET');
        expect(eventDetails.response.status).toBe(200);
    });
});
