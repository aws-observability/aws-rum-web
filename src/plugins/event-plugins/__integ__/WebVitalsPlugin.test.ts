import {
    STATUS_202,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../../../test-utils/integ-test-utils';
import { Selector } from 'testcafe';
import {
    CLS_EVENT_TYPE,
    LCP_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE
} from '../../utils/constant';

const testButton: Selector = Selector(`#testButton`);
const makePageHidden: Selector = Selector(`#makePageHidden`);

fixture('WebVitalEvent Plugin').page(
    'http://localhost:8080/web_vital_event.html'
);

// According to https://github.com/GoogleChrome/web-vitals,
// "FID is not reported if the user never interacts with the page."
// It doesn't seem like TestCafe actions are registered as user interactions, so cannot test FID

test('WebVitalEvent records lcp and cls events on chrome', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    const browser = t.browser.name;
    if (browser === 'Safari' || browser === 'Firefox') {
        return 'Test is skipped';
    }
    await t.wait(300);

    await t
        // Interact with page to trigger lcp event
        .click(testButton)
        .click(makePageHidden)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const content = await REQUEST_BODY.textContent;

    const lcpEvents = JSON.parse(content).RumEvents.filter(
        (e) => e.type === LCP_EVENT_TYPE
    );
    const lcpEventDetails = JSON.parse(lcpEvents[0].details);

    const clsEvents = JSON.parse(content).RumEvents.filter(
        (e) => e.type === CLS_EVENT_TYPE
    );
    const clsEventDetails = JSON.parse(clsEvents[0].details);

    await t
        .expect(lcpEventDetails.value)
        .typeOf('number')
        .expect(clsEventDetails.value)
        .typeOf('number')
        .expect(lcpEventDetails.attribution)
        .typeOf('object')
        .expect(clsEventDetails.attribution)
        .typeOf('object');
});

test('when lcp image resource is recorded then it is attributed to lcp', async (t: TestController) => {
    const browser = t.browser.name;
    if (browser === 'Safari' || browser === 'Firefox') {
        return 'Test is skipped';
    }
    await t.wait(300);

    await t
        // Interact with page to trigger lcp event
        .click(testButton)
        .click(makePageHidden)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents;
    const lcp = events.filter(
        (x: { type: string }) => x.type === LCP_EVENT_TYPE
    )[0];
    const resource = events.filter(
        (x: { details: string; type: string }) =>
            x.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
            x.details.includes('lcp.jpg')
    )[0];
    await t.expect(lcp.details).contains(`"lcpResourceEntry":"${resource.id}"`);
});

test('when navigation is recorded then it is attributed to lcp', async (t: TestController) => {
    const browser = t.browser.name;
    if (browser === 'Safari' || browser === 'Firefox') {
        return 'Test is skipped';
    }

    await t.wait(300);
    await t
        // Interact with page to trigger lcp event
        .click(testButton)
        .click(makePageHidden)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents;
    const lcp = events.filter(
        (x: { type: string }) => x.type === LCP_EVENT_TYPE
    )[0];
    const nav = events.filter(
        (x: { type: string }) => x.type === PERFORMANCE_NAVIGATION_EVENT_TYPE
    )[0];

    await t.expect(lcp.details).contains(`"navigationEntry":"${nav.id}"`);
});
