import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { JS_ERROR_EVENT_TYPE } from '../../utils/constant';

const triggerTypeError: Selector = Selector(`#triggerTypeError`);
const throwErrorString: Selector = Selector(`#throwErrorString`);
const recordCaughtError: Selector = Selector(`#recordCaughtError`);
const triggerResizeObserver: Selector = Selector(`#resizeObserverLoopError`);
const recordResizeObserver: Selector = Selector(`#recordObserverLoopError`);
const triggerPromiseRejection: Selector = Selector(`#uncaughtPromiseRejection`);

const dispatch: Selector = Selector(`#dispatch`);

fixture('JSErrorEvent Plugin').page(
    'http://localhost:8080/js_error_event.html'
);

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

test('when a TypeError is thrown then name and message are recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerTypeError)
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
        .eql(JS_ERROR_EVENT_TYPE)
        .expect(eventDetails.type)
        .contains('TypeError')
        .expect(eventDetails.message)
        .match(/(undefined|null)/)
        .expect(eventDetails.filename)
        .match(/js_error_event.html/)
        .expect(eventDetails.lineno)
        .match(/\d+/)
        .expect(eventDetails.colno)
        .match(/\d+/);
});

test('when a promise rejection is thrown then name is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with tracker load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerPromiseRejection)
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
        .eql(JS_ERROR_EVENT_TYPE)
        .expect(eventDetails.type)
        .contains('unhandledrejection')
        .expect(eventDetails.message)
        .match(/promise is rejected/);
});

test('stack trace is recorded by default', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerTypeError)
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
        .eql(JS_ERROR_EVENT_TYPE)
        .expect(eventDetails.stack)
        .contains('triggerTypeError');
});

test('when a string is thrown then name and message are recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(throwErrorString)
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
        .eql(JS_ERROR_EVENT_TYPE)
        .expect(eventDetails.type)
        .contains('thrown string')
        .expect(eventDetails.message)
        .contains('thrown string')
        .expect(eventDetails.filename)
        .match(/js_error_event.html/)
        .expect(eventDetails.lineno)
        .match(/\d+/)
        .expect(eventDetails.colno)
        .match(/\d+/);
});

test('when the application records a caught error then the plugin records the error', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordCaughtError)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === JS_ERROR_EVENT_TYPE
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(events.length)
        .eql(1)
        .expect(eventType)
        .eql(JS_ERROR_EVENT_TYPE)
        .expect(eventDetails.type)
        .contains('Error')
        .expect(eventDetails.message)
        .contains('My error message');
});

test('when ignore function matches error then the plugin does not record the error', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerResizeObserver)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );

    await t.expect(json.RumEvents.length).eql(0);
});

test('when error invoked with record method then the plugin records the error', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordResizeObserver)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );

    await t.expect(json.RumEvents.length).eql(1);
});
