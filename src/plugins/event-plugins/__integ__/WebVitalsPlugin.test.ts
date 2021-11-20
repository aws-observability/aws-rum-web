import {
    STATUS_202,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../../../test-utils/integ-test-utils';
import { Selector } from 'testcafe';
import { CLS_EVENT_TYPE, LCP_EVENT_TYPE } from '../../utils/constant';

const testButton: Selector = Selector(`#testButton`);
const makePageHidden: Selector = Selector(`#makePageHidden`);

fixture('WebVitalEvent Plugin').page(
    'http://localhost:8080/web_vital_event.html'
);

const browserAgent = navigator.userAgent.toLowerCase();
if (browserAgent.indexOf('safari') < 0 && browserAgent.indexOf('firefox') < 0) {
    // According to https://github.com/GoogleChrome/web-vitals, "FID is not reported if the user never interacts with the page."
    // It doesn't seem like TestCafe actions are registered as user interactions, so cannot test FID

    const removeUnwantedEvents = (json: any) => {
        const newEventsList = [];
        for (const event of json.RumEvents) {
            if (/(dispatch)/.test(event.details)) {
                // Skip
            } else if (/(session_start_event)/.test(event.type)) {
                // Skip
            } else if (/(page_view_event)/.test(event.type)) {
                // Skip
            } else {
                newEventsList.push(event);
            }
        }

        json.RumEvents = newEventsList;
        return json;
    };

    test('WebVitalEvent records lcp and cls events', async (t: TestController) => {
        // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
        // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
        await t.wait(300);

        await t
            // Interact with page to trigger lcp event
            .click(testButton)
            .click(makePageHidden)
            .expect(RESPONSE_STATUS.textContent)
            .eql(STATUS_202.toString())
            .expect(REQUEST_BODY.textContent)
            .contains('BatchId');

        const json = removeUnwantedEvents(
            JSON.parse(await REQUEST_BODY.textContent)
        );
        const eventType1 = json.RumEvents[0].type;
        const eventDetails1 = JSON.parse(json.RumEvents[0].details);
        const eventType2 = json.RumEvents[1].type;
        const eventDetails2 = JSON.parse(json.RumEvents[1].details);

        await t
            .expect(eventType1)
            .eql(LCP_EVENT_TYPE)
            .expect(eventDetails1.value)
            .typeOf('number')
            .expect(eventType2)
            .eql(CLS_EVENT_TYPE)
            .expect(eventDetails2.value)
            .typeOf('number');
    });
}
