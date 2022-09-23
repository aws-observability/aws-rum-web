import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { DOM_EVENT_TYPE } from '../../utils/constant';

const disable: Selector = Selector(`#disable`);
const enable: Selector = Selector(`#enable`);

const button1: Selector = Selector(`#button1`);
const link1: Selector = Selector(`a`);

const button2: Selector = Selector(`#button2`);
const button3: Selector = Selector(`#button3`);

const registerDomEvents: Selector = Selector(`#registerDomEvents`);
const dynamicallyCreateButton: Selector = Selector(`#dynamicallyCreateButton`);
const button4: Selector = Selector(`#button4`);
const button5: Selector = Selector(`#button5`);

const dispatch: Selector = Selector(`#dispatch`);

fixture('DomEventPlugin').page('http://localhost:8080/dom_event.html');

test('when document click events configured then button click is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button1'
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
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
        .click(link1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE && JSON.parse(e.details).element === 'A'
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
        .expect(eventDetails)
        .contains({
            event: 'click',
            element: 'A'
        });
});

test('when element id click event configured then button click is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button1'
    );

    await t.expect(JSON.parse(events[0].details)).contains({
        event: 'click',
        elementId: 'button1'
    });
});

test('when client is disabled then button click is not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(disable)
        .click(button1)
        .click(enable)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button1'
    );

    await t.expect(events.length).eql(0);
});

test('when client is disabled and enabled then button click is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(disable)
        .click(enable)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button1'
    );

    await t.expect(JSON.parse(events[0].details)).contains({
        event: 'click',
        elementId: 'button1'
    });
});

test('when element identified by a CSS selector is clicked then CSS selector is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(button2)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).cssLocator === '[label="label1"]'
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
        .expect(eventDetails)
        .contains({
            event: 'click',
            cssLocator: '[label="label1"]'
        });
});
test('when two elements identified by a CSS selector are clicked then CSS selector is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(button2)
        .click(button3)
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

test('when element not identified by a CSS selector is clicked then CSS selector field is not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(button1)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button1'
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
        .expect(eventDetails)
        .notContains({
            cssLocator: '[label="label1"]'
        });
});

test('when element ID and CSS selector are specified then only event for element identified by CSS selector is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(button1)
        .click(button3)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).cssLocator === '[label="label1"]'
    );
    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
        .expect(eventDetails)
        .notContains({
            elementId: 'button1'
        });
});

test('when new DOM events are registered and then a button is clicked, the event is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(registerDomEvents)
        .click(button5)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).cssLocator === '[label="label2"]'
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
                cssLocator: '[label="label2"]'
            });
    });
});

test('when enableMutationObserver is false by default and listening for a click on a dynamically added element given an element id, the event is not recorded', async (t: TestController) => {
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

    // plugin initialized to listen to click events on document so one event will be recorded
    await t.expect(events.length).eql(1);
});

test('when enableMutationObserver is false by default and listening for a click on a dynamically added element given a CSS locator, the event is not recorded', async (t: TestController) => {
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
            .notContains({
                event: 'click',
                cssLocator: '[label="label1"]'
            });
    });
});

test('when enableMutationObserver is false by default and listening for a click given a CSS selector on an existing element and a dynamically added element, only one event is recorded', async (t: TestController) => {
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

test('when client is disabled then click on dynamically added element is not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(disable)
        .click(dynamicallyCreateButton)
        .wait(300)
        .click(button4)
        .click(enable)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button4'
    );

    await t.expect(events.length).eql(0);
});

test('when client is disabled then clicks on existing or dynamically added element are not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(disable)
        .click(dynamicallyCreateButton)
        .wait(300)
        .click(button4)
        .click(button2)
        .click(enable)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === DOM_EVENT_TYPE &&
            JSON.parse(e.details).elementId === 'button2'
    );

    await t.expect(events.length).eql(0);
});
