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
    }, testInfo) => {
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

        // Session-level attributes are in the top-level Metadata field
        const requestBody = JSON.parse(requestBodyText || '{}');
        const metadata = JSON.parse(requestBody.Metadata || '{}');

        expect(metadata.browserLanguage).toBeDefined();
        expect(metadata.platformType).toBeDefined();
        expect(responseStatus).toBe('202');
        expect(metadata['aws:releaseId']).toBeUndefined();

        // navigator.userAgentData is only available on Chromium browsers
        if (testInfo.project.name.includes('chromium')) {
            expect(metadata.browserName).toBeDefined();
            expect(metadata.browserVersion).toBeDefined();
            expect(metadata.osName).toBeDefined();
            expect(metadata.deviceType).toBeDefined();
        } else {
            // Firefox/Safari: raw user agent string is captured instead
            expect(metadata['aws:userAgent']).toBeDefined();
            expect(metadata['aws:userAgent'].length).toBeGreaterThan(0);
        }
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

        // Session attributes are in the top-level Metadata field
        const requestBody = JSON.parse(requestBodyText || '{}');
        const metadata = JSON.parse(requestBody.Metadata || '{}');

        expect(metadata.customAttributeAtInit).toBe(
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

        // Runtime session attributes are in the top-level Metadata field
        const requestBody = JSON.parse(requestBodyText || '{}');
        const metadata = JSON.parse(requestBody.Metadata || '{}');

        expect(metadata.customPageAttributeAtRuntimeString).toBe(
            'stringCustomAttributeAtRunTimeValue'
        );
        expect(metadata.customPageAttributeAtRuntimeNumber).toBe(1);
        expect(metadata.customPageAttributeAtRuntimeBoolean).toBe(true);
    });
});
