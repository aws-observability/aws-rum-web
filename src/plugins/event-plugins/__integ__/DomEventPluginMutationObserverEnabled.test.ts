import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { DOM_EVENT_TYPE } from '../../utils/constant';

const button2: Selector = Selector(`#button2`);

const dynamicallyCreateButton: Selector = Selector(`#dynamicallyCreateButton`);
const button4: Selector = Selector(`#button4`);

const dispatch: Selector = Selector(`#dispatch`);

fixture('DomEventPluginMutationObserverEnabled').page(
    'http://localhost:8080/dom_event_mutation_observer_enabled.html'
);

test('when enableMutationObserver is true by default and listening for a click on a dynamically added element given an element id, the event is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dynamicallyCreateButton)
        .wait(300)
        .click(button4)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button4'
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
        .expect(eventDetails)
        .contains({
            event: 'click',
            elementId: 'button4'
        });
});

test('when enableMutationObserver is true by default and listening for a click on a dynamically added element given a CSS locator, the event is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dynamicallyCreateButton)
        .wait(300)
        .click(button4)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).cssLocator === '[label="label1"]'
    );

    events.forEach(async (event) => {
        const eventType = event.type;
        const eventDetails = JSON.parse(event.details);

        await t
            .expect(events.length)
            .eql(1)
            .expect(eventType)
            .eql(DOM_EVENT_TYPE)
            .expect(eventDetails)
            .contains({
                event: 'click',
                cssLocator: '[label="label1"]'
            });
    });
});

test('when enableMutationObserver is true by default and listening for a click given a CSS selector on an existing element and a dynamically added element, both events are recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dynamicallyCreateButton)
        .wait(300)
        .click(button4)
        .click(button2)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).cssLocator === '[label="label1"]'
    );

    events.forEach(async (event) => {
        const eventType = event.type;
        const eventDetails = JSON.parse(event.details);

        await t
            .expect(events.length)
            .eql(2)
            .expect(eventType)
            .eql(DOM_EVENT_TYPE)
            .expect(eventDetails)
            .contains({
                event: 'click',
                cssLocator: '[label="label1"]'
            });
    });
});
