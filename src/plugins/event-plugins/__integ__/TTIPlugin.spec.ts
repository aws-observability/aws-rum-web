import { test, expect } from '@playwright/test';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../utils/constant';

test.describe('TTI Plugin', () => {
    test('when TTI is recorded, a TTI event is recorded', async ({
        page,
        browserName
    }) => {
        // Skip firefox and webkit, till they support longtasks
        test.skip(
            browserName === 'firefox' || browserName === 'webkit',
            'Firefox and Safari do not support longtasks'
        );

        await page.goto('/time_to_interactive_event.html');

        await page.click('#testButton');
        await page.waitForTimeout(100);
        await page.click('#dispatch');
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        const responseStatus = await page
            .locator('#response_status')
            .textContent();
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();

        expect(responseStatus).toBe('202');
        expect(requestBodyText).toContain('BatchId');

        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === TIME_TO_INTERACTIVE_EVENT_TYPE
        );
        expect(events.length).toBe(1);

        const ttiEvent = JSON.parse(events[0].details);
        expect(typeof ttiEvent.value).toBe('number');
    });
});
