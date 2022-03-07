const successfulLoad = '#successfulLoad';
const timeoutLoad = '#timeoutLoad';
const dispatch = '#dispatch';

const navigation_paths = [
    { pageId: '/spa.html', interaction: 0, initiatorType: 'navigation' },
    {
        pageId: '/spa.html#strawberries',
        interaction: 1,
        initiatorType: 'route_change'
    },
    { pageId: '/spa.html', interaction: 2, initiatorType: 'route_change' }
];
describe('PageManager SPA feature test', function () {
    test('when route change is detected then both navigation event and page view event are recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(successfulLoad)
            .pause(300)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = request_body.RumEvents.filter(
            (e) => e.type === 'com.amazon.rum.performance_navigation_event'
        ).map((e) => JSON.parse(e.metadata).pageId);
        const page_view_events_pageId = request_body.RumEvents.filter(
            (e) => e.type === 'com.amazon.rum.page_view_event'
        ).map((e) => JSON.parse(e.details).pageId);

        for (let i = 0; i < 2; i++) {
            browser.assert.equal(
                nav_event_pageId[i],
                page_view_events_pageId[i]
            );
        }
        browser.end();
    });

    test('when virtual page load times out then only page view event is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(timeoutLoad)
            .pause(500)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = request_body.RumEvents.filter(
            (e) => e.type === 'com.amazon.rum.performance_navigation_event'
        ).map((e) => JSON.parse(e.metadata).pageId);
        const page_view_events_pageId = request_body.RumEvents.filter(
            (e) => e.type === 'com.amazon.rum.page_view_event'
        ).map((e) => JSON.parse(e.details).pageId);

        // Only one navigation event is recorded
        browser.assert.equal(nav_event_pageId.length, 1);
        browser.assert.equal(nav_event_pageId[0], '/spa.html');
        // Two page view events are recorded
        browser.assert.equal(page_view_events_pageId.length, 2);
        browser.end();
    });
});
