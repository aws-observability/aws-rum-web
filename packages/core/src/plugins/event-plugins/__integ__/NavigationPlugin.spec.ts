import { test, expect } from '@playwright/test';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../utils/constant';

test.describe('NavigationEvent Plugin', () => {
    test('when plugin loads after window.load then navigation timing events are recorded', async ({
        page
    }) => {
        await page.goto('/delayed_page.html');

        await page.fill('#command', 'dispatch');
        await page.click('#payload');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.click('#submit');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const responseStatus = await page
            .locator('#response_status')
            .textContent();

        const isBrowserSafari = (requestBodyText || '').indexOf('Safari') > -1;

        expect(requestBodyText).toContain(PERFORMANCE_NAVIGATION_EVENT_TYPE);
        expect(requestBodyText).toContain('id');
        expect(requestBodyText).toContain('timestamp');
        expect(requestBodyText).toContain('initiatorType');
        expect(requestBodyText).toContain('startTime');
        expect(requestBodyText).toContain('unloadEventStart');
        expect(requestBodyText).toContain('promptForUnload');
        expect(requestBodyText).toContain('redirectStart');
        expect(requestBodyText).toContain('redirectTime');
        expect(requestBodyText).toContain('fetchStart');
        expect(requestBodyText).toContain('domainLookupStart');
        expect(requestBodyText).toContain('dns');
        expect(requestBodyText).toContain('connectStart');
        expect(requestBodyText).toContain('connect');
        expect(requestBodyText).toContain('secureConnectionStart');
        expect(requestBodyText).toContain('tlsTime');
        expect(requestBodyText).toContain('requestStart');
        expect(requestBodyText).toContain('timeToFirstByte');
        expect(requestBodyText).toContain('responseStart');
        expect(requestBodyText).toContain('responseTime');
        expect(requestBodyText).toContain('domInteractive');
        expect(requestBodyText).toContain('domContentLoadedEventStart');
        expect(requestBodyText).toContain('domContentLoaded');
        expect(requestBodyText).toContain('domComplete');
        expect(requestBodyText).toContain('domProcessingTime');
        expect(requestBodyText).toContain('loadEventStart');
        expect(requestBodyText).toContain('loadEventTime');
        expect(requestBodyText).toContain('duration');

        expect(responseStatus).toBe('202');
        expect((requestBodyText || '').indexOf('duration')).toBeGreaterThan(0);

        // Deprecated Timing Level1 used for Safari browser do not contain following attributes
        if (!isBrowserSafari) {
            expect(requestBodyText).toContain('redirectCount');
            expect(requestBodyText).toContain('navigationType');
            expect(requestBodyText).toContain('workerStart');
            expect(requestBodyText).toContain('workerTime');
            expect(requestBodyText).toContain('nextHopProtocol');
            expect(requestBodyText).toContain('headerSize');
            expect(requestBodyText).toContain('transferSize');
            expect(requestBodyText).toContain('compressionRatio');
        }
    });
});
