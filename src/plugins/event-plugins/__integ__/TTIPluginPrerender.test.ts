import {
    STATUS_202,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../../../test-utils/integ-test-utils';
import { Selector } from 'testcafe';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../utils/constant';

const testButton: Selector = Selector(`#testButton`);
const dispatch: Selector = Selector(`#dispatch`);
const prerenderButton: Selector = Selector(`#prerenderedNav`);
const standardNavButton: Selector = Selector(`#standardNav`);

// Add a longer wait time to ensure TTI events are captured
const TTI_WAIT_TIME = 5000;

fixture('TTI Plugin Prerender Navigation').page(
    'http://localhost:8080/index.html'
);

test('prerendered navigation records TTI events', async (t: TestController) => {
    const browser = t.browser.name;
    // Skip firefox, till Firefox supports longtasks
    if (browser === 'Firefox') {
        return 'Test is skipped';
    }

    // Click the prerendered navigation button to navigate to index.html
    await t.click(prerenderButton).wait(1000);

    await t
        .click(testButton)
        .wait(100)
        .click(dispatch)
        .wait(3000)
        .click(dispatch)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    // Check if events were recorded
    await t
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    console.log('request body ' + REQUEST_BODY.textContent);
    // Verify TTI events were recorded
    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === TIME_TO_INTERACTIVE_EVENT_TYPE
    );

    // We should have at least one TTI event
    await t.expect(events.length).gte(1);

    // Check the TTI event structure
    if (events.length > 0) {
        const ttiEvent = JSON.parse(events[0].details);
        await t.expect(ttiEvent.value).typeOf('number');
    }

    // Navigate back to the test page for the next test
    await t.navigateTo('http://localhost:8080/index.html');
});

test('standard navigation records TTI events', async (t: TestController) => {
    const browser = t.browser.name;
    // Skip firefox, till Firefox supports longtasks
    if (browser === 'Firefox') {
        return 'Test is skipped';
    }

    // Click the standard navigation button to navigate to index.html
    await t.click(standardNavButton).wait(1000);

    // On index.html, wait for TTI to be calculated
    await t.wait(TTI_WAIT_TIME);

    await t
        .click(testButton)
        .wait(100)
        .click(dispatch)
        .wait(3000)
        .click(dispatch)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    // Check if events were recorded
    await t
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    // Verify TTI events were recorded
    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === TIME_TO_INTERACTIVE_EVENT_TYPE
    );

    // We should have at least one TTI event
    await t.expect(events.length).gte(1);

    // Check the TTI event structure
    if (events.length > 0) {
        const ttiEvent = JSON.parse(events[0].details);
        await t.expect(ttiEvent.value).typeOf('number');
    }

    // Navigate back to the test page for the next test
    await t.navigateTo('http://localhost:8080/index.html');
});
