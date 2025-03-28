import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../test-utils/integ-test-utils';

const dispatch: Selector = Selector(`#dispatch`);
const recordEventAPI: Selector = Selector(`#recordEventAPI`);
const recordEventApiEmptyEvent: Selector = Selector(`#recordEventAPIEmpty`);
const pluginRecord: Selector = Selector(`#pluginRecord`);
const pluginRecordEmptyEvent: Selector = Selector(`#pluginRecordEmpty`);

const API_EVENT_TYPE = 'custom_event_api';
const PLUGIN_EVENT_TYPE = 'custom_event_plugin';
const COUNT = 5;

fixture('Custom Events API & Plugin').page(
    'http://localhost:8080/custom_event.html'
);

const removeUnwantedEvents = (json: any) => {
    const newEventsList = json.RumEvents.filter(
        (e) =>
            /(custom_event_api)/.test(e.type) ||
            /(custom_event_plugin)/.test(e.type)
    );

    json.RumEvents = newEventsList;
    return json;
};

test('when a recordEvent API is called then event is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordEventAPI)
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
        .eql(API_EVENT_TYPE)
        .expect(eventDetails.customEventVersion)
        .eql(255);
});

test('when a recordEvent API is called x times then event is recorded x times', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    // Record event 5 times.
    await t.wait(300);
    for (let i = 0; i < COUNT; i++) {
        await t.click(recordEventAPI);
    }

    await t
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );

    await t.expect(json.RumEvents.length).eql(COUNT);
    json.RumEvents.forEach(async (item) => {
        const eventType = item.type;
        const eventDetails = JSON.parse(item.details);
        await t
            .expect(eventType)
            .eql(API_EVENT_TYPE)
            .expect(eventDetails.customEventVersion)
            .eql(255);
    });
});

test('when a recordEvent API has empty event_data then RumEvent detail is empty', async (t: TestController) => {
    await t
        .wait(300)
        .click(recordEventApiEmptyEvent)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    await t
        .expect(json.RumEvents.length)
        .eql(1)
        .expect(json.RumEvents[0].type)
        .eql(API_EVENT_TYPE)
        .expect(json.RumEvents[0].details)
        .eql('{}');
});

test('when a plugin calls recordEvent then the event is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(pluginRecord)
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
        .eql(PLUGIN_EVENT_TYPE)
        .expect(eventDetails.intField)
        .eql(1)
        .expect(eventDetails.stringField)
        .eql('string')
        .expect(eventDetails.nestedField)
        .eql({ subfield: 1 });
});

test('when a plugin calls recordEvent x times then event is recorded x times', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    // Record event 5 times.
    await t.wait(300);
    for (let i = 0; i < COUNT; i++) {
        await t.click(pluginRecord);
    }
    await t
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );

    await t.expect(json.RumEvents.length).eql(COUNT);
    json.RumEvents.forEach(async (item) => {
        const eventType = item.type;
        const eventDetails = JSON.parse(item.details);
        await t
            .expect(eventType)
            .eql(PLUGIN_EVENT_TYPE)
            .expect(eventDetails.intField)
            .eql(1)
            .expect(eventDetails.stringField)
            .eql('string')
            .expect(eventDetails.nestedField)
            .eql({ subfield: 1 });
    });
});

test('when plugin recordEvent has empty event_data then RumEvent details is empty', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t.wait(300);

    await t
        .click(pluginRecordEmptyEvent)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    await t
        .expect(json.RumEvents.length)
        .eql(1)
        .expect(json.RumEvents[0].type)
        .eql(PLUGIN_EVENT_TYPE)
        .expect(json.RumEvents[0].details)
        .eql('{}');
});
