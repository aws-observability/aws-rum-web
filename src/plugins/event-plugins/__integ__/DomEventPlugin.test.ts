import { SESSION_START_EVENT_TYPE } from '../../../sessions/SessionManager';
import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';

const recordDocumentClicks: Selector = Selector(`#recordDocumentClicks`);
const recordButton1Clicks: Selector = Selector(`#recordButton1Clicks`);
const doNotRecordClicks: Selector = Selector(`#doNotRecordClicks`);
const disable: Selector = Selector(`#disable`);
const enable: Selector = Selector(`#enable`);

const button1: Selector = Selector(`#button1`);
const link1: Selector = Selector(`a`);

const dispatch: Selector = Selector(`#dispatch`);
const clear: Selector = Selector(`#clearRequestResponse`);

fixture('DomEventPlugin').page('http://localhost:8080/dom_event.html');

const removeUnwantedEvents = (json: any) => {
    const newEventsList = [];
    for (const event of json.batch.events) {
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

    json.batch.events = newEventsList;
    return json;
};

test('when document click events configured then button click is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordDocumentClicks)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.batch.events[0].type;
    const eventDetails = JSON.parse(json.batch.events[0].details);

    await t
        .expect(eventType)
        .eql('com.amazon.rum.dom_event')
        .expect(eventDetails)
        .contains({
            event: 'click',
            elementId: 'button1'
        });
});

test('when element without an id is clicked then node type is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordDocumentClicks)
        .click(link1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.batch.events[0].type;
    const eventDetails = JSON.parse(json.batch.events[0].details);

    await t
        .expect(eventType)
        .eql('com.amazon.rum.dom_event')
        .expect(eventDetails)
        .contains({
            event: 'click',
            elementId: 'A'
        });
});

test('when element id click event configured then button click is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordButton1Clicks)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.batch.events[0].type;
    const eventDetails = JSON.parse(json.batch.events[0].details);

    await t
        .expect(eventType)
        .eql('com.amazon.rum.dom_event')
        .expect(eventDetails)
        .contains({
            event: 'click',
            elementId: 'button1'
        });
});

test('when client is disabled prior to config then button click is not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(disable)
        .click(recordButton1Clicks)
        .click(button1)
        .click(enable)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const json = JSON.parse(await REQUEST_BODY.textContent);
    const eventType = json.batch.events[0].type;

    await t
        .expect(json.batch.events.length)
        .eql(2)
        .expect(eventType)
        .eql(SESSION_START_EVENT_TYPE);
});

test('when client is disabled after config then button click is not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordButton1Clicks)
        .click(disable)
        .click(button1)
        .click(enable)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const json = JSON.parse(await REQUEST_BODY.textContent);
    const eventType = json.batch.events[0].type;

    await t
        .expect(json.batch.events.length)
        .eql(2)
        .expect(eventType)
        .eql(SESSION_START_EVENT_TYPE);
});

test('when client is disabled and enabled then button click is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordButton1Clicks)
        .click(disable)
        .click(enable)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.batch.events[0].type;
    const eventDetails = JSON.parse(json.batch.events[0].details);

    await t
        .expect(eventType)
        .eql('com.amazon.rum.dom_event')
        .expect(eventDetails)
        .contains({
            event: 'click',
            elementId: 'button1'
        });
});
