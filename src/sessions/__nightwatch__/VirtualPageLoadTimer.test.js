const pushStateOne = '#pushStateOneToHistory';
const pushStateTwo = '#pushStateTwoToHistory';
const replaceState = '#replaceState';
const replaceDefault = '#replaceDefault';
const hashChange = '#createHashChange';
const timeout = '#timeOutLoad';
const back = '#back';
const forward = '#forward';
const goBack = '#go-back';
const goForward = '#go-forward';
const dispatch = '#dispatch';
const routeChange = 'route_change';
const initialLoad = 'navigation';

function getNavigationEventPageId(request_body) {
    return request_body.RumEvents.filter(
        (e) => e.type === 'com.amazon.rum.performance_navigation_event'
    ).map((e) => JSON.parse(e.metadata).pageId);
}

function getPageEventPageId(request_body) {
    return request_body.RumEvents.filter(
        (e) => e.type === 'com.amazon.rum.page_view_event'
    ).map((e) => JSON.parse(e.details).pageId);
}

function getNavigationInitiatorType(request_body) {
    return request_body.RumEvents.filter(
        (e) => e.type === 'com.amazon.rum.performance_navigation_event'
    ).map((e) => JSON.parse(e.details).initiatorType);
}

describe('PageManager Virtual Page Load Timing', function () {
    test('when pushState is invoked twice then route change is recorded twice', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(pushStateOne)
            .pause(800)
            .click(pushStateTwo)
            .pause(800)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);
        const initiatorType = getNavigationInitiatorType(request_body);
        const expected_length = 3;

        browser.assert.equal(
            expected_length,
            nav_event_pageId.length,
            page_view_events_pageId.length
        );
        // The pageIds of page events and navigation events should match 3 times
        for (let i = 0; i < expected_length; i++) {
            browser.assert.equal(
                nav_event_pageId[i],
                page_view_events_pageId[i]
            );
        }

        // Only first navigation event is initial load.
        browser.assert.equal(initiatorType[0], initialLoad);
        for (let i = 1; i < expected_length; i++) {
            browser.assert.equal(initiatorType[i], routeChange);
        }
        browser.end();
    });

    test('when hashChange occurs then route change is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(hashChange)
            .pause(800)
            .click(dispatch);
        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);
        const initiatorType = getNavigationInitiatorType(request_body);
        const expected_length = 2;

        browser.assert.equal(
            expected_length,
            nav_event_pageId.length,
            page_view_events_pageId.length
        );
        // The pageIds of page events and navigation events should match 2 times
        for (let i = 0; i < expected_length; i++) {
            browser.assert.equal(
                nav_event_pageId[i],
                page_view_events_pageId[i]
            );
        }

        // Only first navigation event is initial load.
        browser.assert.equal(initiatorType[0], initialLoad);
        for (let i = 1; i < expected_length; i++) {
            browser.assert.equal(initiatorType[i], routeChange);
        }
        browser.end();
    });

    test('when replaceState occurs then route change is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(replaceState)
            .pause(800)
            .click(dispatch);
        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);
        const initiatorType = getNavigationInitiatorType(request_body);
        const expected_length = 2;

        browser.assert.equal(
            expected_length,
            nav_event_pageId.length,
            page_view_events_pageId.length
        );
        // The pageIds of page events and navigation events should match 2 times
        for (let i = 0; i < expected_length; i++) {
            browser.assert.equal(
                nav_event_pageId[i],
                page_view_events_pageId[i]
            );
        }

        // Only first navigation event is initial load.
        browser.assert.equal(initiatorType[0], initialLoad);
        for (let i = 1; i < expected_length; i++) {
            browser.assert.equal(initiatorType[i], routeChange);
        }
        browser.end();
    });

    test('when back/forward/go is invoked then route change is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(pushStateOne)
            .pause(800)
            .click(back)
            .pause(800)
            .click(forward)
            .pause(800)
            .click(pushStateTwo)
            .pause(800)
            .click(goBack)
            .pause(800)
            .click(goForward)
            .pause(800)
            .click(dispatch);
        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);
        const initiatorType = getNavigationInitiatorType(request_body);
        const expected_length = 7;

        browser.assert.equal(
            expected_length,
            nav_event_pageId.length,
            page_view_events_pageId.length
        );

        // The pageIds of page events and navigation events should match 7 times
        for (let i = 0; i < expected_length; i++) {
            browser.assert.equal(
                nav_event_pageId[i],
                page_view_events_pageId[i]
            );
        }

        // The back/forward must match with navigation history
        browser.assert.equal(
            page_view_events_pageId[0],
            page_view_events_pageId[2]
        );
        browser.assert.equal(
            page_view_events_pageId[1],
            page_view_events_pageId[3],
            page_view_events_pageId[5]
        );
        browser.assert.equal(
            page_view_events_pageId[4],
            page_view_events_pageId[6]
        );

        // Only first navigation event is initial load.
        browser.assert.equal(initiatorType[0], initialLoad);
        for (let i = 1; i < expected_length; i++) {
            browser.assert.equal(initiatorType[i], routeChange);
        }
        browser.end();
    });

    test('when page load times out then route change is not recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(timeout)
            .pause(2000)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);

        // Only the initial load should be recorded
        browser.assert.equal(nav_event_pageId.length, 1);
        // Both page view events should be recorded
        browser.assert.equal(page_view_events_pageId.length, 2);
    });

    test('when page load times out then subsequent route changes should be recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(timeout)
            .pause(2000)
            .click(pushStateOne)
            .pause(800)
            .click(pushStateTwo)
            .pause(800)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);
        const initiatorType = getNavigationInitiatorType(request_body);

        // Three navigation events should be recorded
        browser.assert.equal(nav_event_pageId.length, 3);
        // All four pages should be recorded
        browser.assert.equal(page_view_events_pageId.length, 4);

        browser.assert.equal(initiatorType[0], initialLoad);
        browser.assert.equal(initiatorType[1], routeChange);
        browser.assert.equal(initiatorType[2], routeChange);
    });

    test('when user navigates away mid route change then only the later completed route change is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/spa.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(pushStateOne)
            .pause(300)
            .click(pushStateTwo)
            .pause(300)
            .click(hashChange)
            .pause(800)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const nav_event_pageId = getNavigationEventPageId(request_body);
        const page_view_events_pageId = getPageEventPageId(request_body);
        const initiatorType = getNavigationInitiatorType(request_body);

        // Two navigation events should be recorded
        browser.assert.equal(nav_event_pageId.length, 2);
        browser.assert.equal(nav_event_pageId[1], '/page_view_two#hash_change');
        // All three pages should be recorded
        browser.assert.equal(page_view_events_pageId.length, 4);

        browser.assert.equal(initiatorType[0], initialLoad);
        browser.assert.equal(initiatorType[1], routeChange);
    });
});
