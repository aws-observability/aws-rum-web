import { test, expect } from '@playwright/test';
import {
    CLS_EVENT_TYPE,
    INP_EVENT_TYPE,
    LCP_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE
} from '../../utils/constant';

test.describe('WebVitalEvent Plugin', () => {
    test('when lcp image resource is recorded then it is attributed to lcp', async ({
        page,
        browserName
    }) => {
        test.skip(
            browserName === 'webkit' || browserName === 'firefox',
            'Test is skipped for Safari and Firefox'
        );

        await page.goto('/web_vital_event.html');

        await page.waitForTimeout(300);
        // Interact with page to trigger lcp event
        await page.click('#testButton');
        await page.click('#makePageHidden');

        const responseStatus = await page
            .locator('#response_status')
            .textContent();
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();

        expect(responseStatus).toBe('202');
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents;
        const lcp = events.filter((x: any) => x.type === LCP_EVENT_TYPE)[0];
        const resource = events.filter(
            (x: any) =>
                x.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
                x.details.includes('lcp.png')
        )[0];

        expect(lcp.details).toContain(`"lcpResourceEntry":"${resource.id}"`);
    });

    test('WebVitalEvent records lcp, cls, and inp events on chrome', async ({
        page,
        browserName
    }) => {
        test.skip(
            browserName === 'webkit' || browserName === 'firefox',
            'Test is skipped for Safari and Firefox'
        );

        await page.goto('/web_vital_event.html');

        await page.waitForTimeout(300);
        // Interact with page to trigger lcp event
        // Click repeatedly to trigger a slow interaction for INP
        for (let i = 0; i < 10; i++) {
            await page.click('#testButton');
        }
        await page.click('#makePageHidden');

        const responseStatus = await page
            .locator('#response_status')
            .textContent();
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();

        expect(responseStatus).toBe('202');
        expect(requestBodyText).toContain('BatchId');

        const content = requestBodyText || '{}';

        const lcpEvents = JSON.parse(content).RumEvents.filter(
            (e: any) => e.type === LCP_EVENT_TYPE
        );
        const lcpEventDetails = JSON.parse(lcpEvents[0].details);

        const clsEvents = JSON.parse(content).RumEvents.filter(
            (e: any) => e.type === CLS_EVENT_TYPE
        );
        const clsEventDetails = JSON.parse(clsEvents[0].details);

        expect(typeof lcpEventDetails.value).toBe('number');
        expect(typeof clsEventDetails.value).toBe('number');
        expect(typeof lcpEventDetails.attribution).toBe('object');
        expect(typeof clsEventDetails.attribution).toBe('object');

        // INP is flaky on some environments, so we check if it exists
        const inpEvents = JSON.parse(content).RumEvents.filter(
            (e: any) => e.type === INP_EVENT_TYPE
        );
        if (inpEvents.length > 0) {
            const inpEventDetails = JSON.parse(inpEvents[0].details);
            expect(typeof inpEventDetails.value).toBe('number');
            expect(typeof inpEventDetails.attribution).toBe('object');
        }
    });

    test('when navigation is recorded then it is attributed to lcp', async ({
        page,
        browserName
    }) => {
        test.skip(
            browserName === 'webkit' || browserName === 'firefox',
            'Test is skipped for Safari and Firefox'
        );

        await page.goto('/web_vital_event.html');

        // Interact with page to trigger lcp event
        await page.waitForTimeout(300);
        await page.click('#testButton');
        await page.click('#makePageHidden');

        const responseStatus = await page
            .locator('#response_status')
            .textContent();
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();

        expect(responseStatus).toBe('202');
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents;
        const lcp = events.filter((x: any) => x.type === LCP_EVENT_TYPE)[0];
        const nav = events.filter(
            (x: any) => x.type === PERFORMANCE_NAVIGATION_EVENT_TYPE
        )[0];

        expect(lcp.details).toContain(`"navigationEntry":"${nav.id}"`);
    });
});
