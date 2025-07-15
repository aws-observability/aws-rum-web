import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { XRAY_TRACE_EVENT_TYPE, HTTP_EVENT_TYPE } from '../../utils/constant';

const sendFetchRequest: Selector = Selector(`#sendFetchRequest`);
const sendDataPlaneRequest: Selector = Selector(`#sendDataPlaneRequest`);
const dispatch: Selector = Selector(`#dispatch`);
const clearRequestResponse: Selector = Selector(`#clearRequestResponse`);
const fetchRequestHeaders: Selector = Selector(`#fetchRequestHeaders`);

fixture('X-Ray Fetch Plugin With W3C Trace Format').page(
    'http://localhost:8080/http_enable_w3c_trace_format.html'
);

test('when fetch is called with w3c format trace id then a trace is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clearRequestResponse)
        .click(sendFetchRequest)
        .expect(fetchRequestHeaders.textContent)
        .match(/00-[0-9a-f]{32}-[0-9a-f]{16}-01/)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = JSON.parse(await REQUEST_BODY.textContent);
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);

    await t
        .expect(eventType)
        .eql(XRAY_TRACE_EVENT_TYPE)
        .expect(eventDetails.name)
        .eql('sample.rum.aws.amazon.com');
});
