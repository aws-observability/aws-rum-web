import { test, expect } from '@playwright/test';
import { XRAY_TRACE_EVENT_TYPE } from '../../utils/constant';

test.describe('X-Ray Fetch Plugin With W3C Trace Format', () => {
    test('when fetch is called with w3c format trace id then a trace is recorded', async ({
        page
    }) => {
        await page.goto('/http_enable_w3c_trace_format.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#sendFetchRequest');

        const fetchRequestHeaders = await page
            .locator('#fetchRequestHeaders')
            .textContent();
        expect(fetchRequestHeaders).toMatch(/00-[0-9a-f]{32}-[0-9a-f]{16}-01/);

        await page.click('#dispatch');
        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = JSON.parse(requestBodyText || '{}');
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);

        expect(eventType).toBe(XRAY_TRACE_EVENT_TYPE);
        expect(eventDetails.name).toBe('sample.rum.aws.amazon.com');
    });
});
