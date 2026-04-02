const pushStateOne = '#pushStateOneToHistory';
const pushStateTwo = '#pushStateTwoToHistory';
const back = '#back';
const dispatch = '#dispatch';
const clear = '#clearRequestResponse';
const parse = '#clean-data';

/**
 * TestCafe and Cypress drive the browser by injecting javascript into the page.
 * This involves monkey patching the window.history APIs. This somehow prevents
 * the plugin from monkey patching the window.history API. To solve this problem,
 * we use nightwatch instead of TestCafe. Nightwatch uses the W3C WebDriver
 * protocol and therefore does not interfere with monkey patching.
 */
describe('Page Event History Patch Plugin', function () {
    test('when window.history.pushState() is called then a page view event is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/page_event.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(pushStateOne)
            .click(pushStateTwo)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const pages = request_body.RumEvents.filter(
            (e) => e.type === 'com.amazon.rum.page_view_event'
        ).map((e) => JSON.parse(e.details).pageId);

        browser.assert.equal(
            pages.includes('/page_event.html'),
            true,
            '/page_event.html was recorded'
        );
        browser.assert.equal(
            pages.includes('/page_view_one'),
            true,
            '/page_view_one was recorded'
        );
        browser.assert.equal(
            pages.includes('/page_view_two'),
            true,
            '/page_view_two was recorded'
        );

        browser.end();
    });

    test('when window.history.back() is called then a page view event is recorded', async function (browser) {
        browser
            .url('http://localhost:8080/page_event.html')
            .pause(300)
            .waitForElementVisible('body')
            .click(pushStateOne)
            .click(pushStateTwo)
            .click(dispatch)
            .click(clear)
            .click(back)
            .click(back)
            .click(dispatch);

        const request_body = JSON.parse(await browser.getText('#request_body'));

        const pages = request_body.RumEvents.filter(
            (e) => e.type === 'com.amazon.rum.page_view_event'
        ).map((e) => JSON.parse(e.details).pageId);

        browser.assert.equal(
            pages.includes('/page_event.html'),
            true,
            '/page_event.html was recorded'
        );
        browser.assert.equal(
            pages.includes('/page_view_one'),
            true,
            '/page_view_one was recorded'
        );

        browser.end();
    });
});
