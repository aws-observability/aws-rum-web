import { test, expect } from '@playwright/test';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from '../../utils/constant';

test.describe('X-Ray XMLHttpRequest Plugin', () => {
    test('when async XMLHttpRequest is called then a trace is recorded', async ({
        page
    }) => {
        await page.goto('/http_xhr_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#sendAsyncXhrRequest');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === XRAY_TRACE_EVENT_TYPE
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(XRAY_TRACE_EVENT_TYPE);
        expect(eventDetails.name).toBe('sample.rum.aws.amazon.com');
    });

    test('when sync XMLHttpRequest is called then a trace is recorded', async ({
        page
    }) => {
        await page.goto('/http_xhr_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#sendSyncXhrRequest');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === XRAY_TRACE_EVENT_TYPE
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(XRAY_TRACE_EVENT_TYPE);
        expect(eventDetails.name).toBe('sample.rum.aws.amazon.com');
    });

    test('when sync XMLHttpRequest is called then an http event is recorded', async ({
        page
    }) => {
        await page.goto('/http_xhr_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#sendSyncXhrRequest');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === HTTP_EVENT_TYPE
        );

        const eventType = events[0].type;
        const eventDetails = JSON.parse(events[0].details);

        expect(eventType).toBe(HTTP_EVENT_TYPE);
        expect(eventDetails.request.method).toBe('GET');
    });
});
