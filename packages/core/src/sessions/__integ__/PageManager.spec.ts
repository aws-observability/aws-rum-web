import { test, expect } from '@playwright/test';
import { PAGE_VIEW_EVENT_TYPE } from '../../plugins/utils/constant';

const removeUnwantedEvents = (json: any) => {
    for (let i = 0; i < json.RumEvents.length; i++) {
        if (/(session_start_event)/.test(json.RumEvents[i].type)) {
            json.RumEvents.splice(i, 1);
        }
    }
    return json;
};

test.describe('PageViewEventPlugin', () => {
    test('PageViewEventPlugin records landing page view event', async ({
        page
    }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);
        const metaData = JSON.parse(json.RumEvents[0].metadata);

        expect(eventType).toBe(PAGE_VIEW_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            pageId: '/page_event.html',
            interaction: 0,
            pageInteractionId: '/page_event.html-0'
        });
        expect(metaData).toMatchObject({
            pageId: '/page_event.html',
            title: 'RUM Integ Test'
        });
    });

    test('PageViewEventPlugin records page view event', async ({ page }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#recordPageView');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);
        const metaData = JSON.parse(json.RumEvents[0].metadata);

        expect(eventType).toBe(PAGE_VIEW_EVENT_TYPE);
        expect(eventDetails).toMatchObject({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1',
            parentPageInteractionId: '/page_event.html-0'
        });
        expect(metaData).toMatchObject({
            pageId: '/page_view_two',
            title: 'RUM Integ Test'
        });
    });

    test('when page is denied then page view is not recorded', async ({
        page
    }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#recordPageView');
        await page.click('#doNotRecordPageView');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const requestBody = JSON.parse(requestBodyText || '{}');
        const pages = requestBody.RumEvents.filter(
            (e: any) => e.type === PAGE_VIEW_EVENT_TYPE
        ).map((e: any) => JSON.parse(e.details));

        expect(pages.length).toBe(1);
        expect(pages[0]).toMatchObject({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1'
        });
    });

    test('when pageTag attribute is passed in when manually recording page view event, then PageViewEventPlugin records pageTag data in metadata', async ({
        page
    }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#recordPageViewWithPageTagAttribute');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);
        const metaData = JSON.parse(json.RumEvents[0].metadata);

        expect(eventType).toBe('com.amazon.rum.page_view_event');
        expect(eventDetails).toMatchObject({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1',
            parentPageInteractionId: '/page_event.html-0'
        });
        expect(metaData).toMatchObject({
            pageId: '/page_view_two',
            title: 'RUM Integ Test'
        });
        expect(metaData.pageTags[0]).toBe('pageGroup1');
    });

    test('when custom page attributes are set when manually recording page view event, then PageViewEventPlugin records custom page attributes in metadata', async ({
        page
    }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.click('#recordPageViewWithCustomPageAttributes');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const json = removeUnwantedEvents(JSON.parse(requestBodyText || '{}'));
        const eventType = json.RumEvents[0].type;
        const eventDetails = JSON.parse(json.RumEvents[0].details);
        const metaData = JSON.parse(json.RumEvents[0].metadata);

        expect(eventType).toBe('com.amazon.rum.page_view_event');
        expect(eventDetails).toMatchObject({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1',
            parentPageInteractionId: '/page_event.html-0'
        });
        expect(metaData).toMatchObject({
            pageId: '/page_view_two',
            title: 'RUM Integ Test',
            customPageAttributeString: 'customPageAttributeValue',
            customPageAttributeNumber: 1,
            customPageAttributeBoolean: true
        });
    });

    test('when previous page views occur, time spent is recorded in the subsequent page view event', async ({
        page
    }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#pushStateOneToHistory');
        await page.click('#pushStateTwoToHistory');
        await page.click('#back');
        await page.click('#back');
        await page.click('#dispatch');

        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        expect(requestBodyText).toContain('BatchId');

        const requestBody = JSON.parse(requestBodyText || '{}');
        const pages = requestBody.RumEvents.filter(
            (e: any) => e.type === PAGE_VIEW_EVENT_TYPE
        ).map((e: any) => JSON.parse(e.details));

        expect(pages[0]['timeOnParentPage']).toBeUndefined();
        expect(pages[1]['timeOnParentPage']).toBeGreaterThanOrEqual(0);
        expect(pages[2]['timeOnParentPage']).toBeGreaterThanOrEqual(0);
    });

    test('when referrer exists, then page view event details records it', async ({
        page
    }) => {
        await page.goto('/page_event.html');

        await page.waitForTimeout(300);
        await page.click('#dispatch');

        let requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        await page.click('#clearRequestResponse');
        await page.waitForTimeout(300);
        await page.click('#createReferrer');
        await page.click('#recordPageView');
        await page.click('#dispatch');

        requestBodyText = await page.locator('#request_body').textContent();
        expect(requestBodyText).toContain('BatchId');

        const requestBody = JSON.parse(requestBodyText || '{}');
        const pages = requestBody.RumEvents.filter(
            (e: any) => e.type === PAGE_VIEW_EVENT_TYPE
        ).map((e: any) => JSON.parse(e.details));

        expect(pages.length).toBe(1);
        expect(pages[0]).toMatchObject({
            referrer: 'http://amazon.com/searchresults/1/',
            referrerDomain: 'amazon.com'
        });
    });
});
