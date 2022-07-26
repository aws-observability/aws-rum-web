import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { JS_GENERAL_EVENT_TYPE } from '../../utils/constant';

const recordEventNoData: Selector = Selector(`#recordEventWithoutData`);
const recordEvent: Selector = Selector(`#recordEventWithData`);

const dispatch: Selector = Selector(`#dispatch`);

fixture('JSEvent Plugin').page('http://localhost:8080/js_general_event.html');

const removeUnwantedEvents = (json: any) => {
    const newEventsList = [];
    for (const event of json.RumEvents) {
        if (/(js_general_event)/.test(event.type)) {
            newEventsList.push(event);
        }
    }

    json.RumEvents = newEventsList;
    return json;
};

test('when event with record method then the plugin records the event', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordEvent)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);

    await t
        .expect(eventType)
        .eql(JS_GENERAL_EVENT_TYPE)
        .expect(eventDetails.name)
        .eql('random-event')
        .expect(eventDetails.data)
        .eql('Some random event');
});
test('when event with record method then the plugin records the event with no data', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordEventNoData)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);

    await t
        .expect(eventType)
        .eql(JS_GENERAL_EVENT_TYPE)
        .expect(eventDetails.name)
        .eql('random-no-data-event');
});
