import { test, expect } from '@playwright/test';
import {
    PAGE_VIEW_EVENT_TYPE,
    SESSION_START_EVENT_TYPE
} from '../../plugins/utils/constant';

test.describe('Session Handler usage', () => {
    test('When cookies are enabled, sessionManager records events using cookies', async ({
        page
    }) => {
        await page.goto('/');

        await page.waitForTimeout(300);
        await page.click('#randomSessionClick');
        await page.waitForTimeout(300);

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

        expect(requestBodyText).toContain(SESSION_START_EVENT_TYPE);
        expect(responseStatus).toBe('202');
    });

    test('When cookie is disabled, sessionManager records events using member variables', async ({
        page
    }) => {
        await page.goto('/');

        await page.waitForTimeout(300);
        await page.click('#disallowCookies');
        await page.waitForTimeout(300);
        await page.click('#randomSessionClick');
        await page.waitForTimeout(300);

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

        expect(requestBodyText).toContain(SESSION_START_EVENT_TYPE);
        expect(responseStatus).toBe('202');
    });

    test('UserAgentMetaDataPlugin records user agent metadata', async ({
        page
    }) => {
        await page.goto('/');

        await page.waitForTimeout(300);
        await page.click('#button1');

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

        expect(requestBodyText).toContain('browserLanguage');
        expect(requestBodyText).toContain('browserName');
        expect(requestBodyText).toContain('browserVersion');
        expect(requestBodyText).toContain('osName');
        expect(requestBodyText).toContain('osVersion');
        expect(requestBodyText).toContain('deviceType');
        expect(requestBodyText).toContain('platformType');
        expect(responseStatus).toBe('202');
        expect(requestBodyText).not.toContain('aws:releaseId');
    });

    test('When custom attribute set at init, custom attribute recorded in event metadata', async ({
        page
    }) => {
        await page.goto('/');

        await page.waitForTimeout(300);
        await page.click('#randomSessionClick');
        await page.waitForTimeout(300);

        await page.fill('#command', 'dispatch');
        await page.click('#payload');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.click('#submit');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents;
        const metaData = JSON.parse(events[0].metadata);

        expect(metaData.customAttributeAtInit).toBe(
            'customAttributeAtInitValue'
        );
    });

    test('When custom attribute set at runtime, custom attribute recorded in event metadata', async ({
        page
    }) => {
        await page.goto('/');

        await page.waitForTimeout(300);
        await page.click('#addSessionAttributes');
        await page.click('#recordPageView');
        await page.waitForTimeout(300);

        await page.fill('#command', 'dispatch');
        await page.click('#payload');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.click('#submit');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const events = JSON.parse(requestBodyText || '{}').RumEvents.filter(
            (e: any) => e.type === PAGE_VIEW_EVENT_TYPE
        );
        const metaData = JSON.parse(events[events.length - 1].metadata);

        expect(metaData.customPageAttributeAtRuntimeString).toBe(
            'stringCustomAttributeAtRunTimeValue'
        );
        expect(metaData.customPageAttributeAtRuntimeNumber).toBe(1);
        expect(metaData.customPageAttributeAtRuntimeBoolean).toBe(true);
    });
});
