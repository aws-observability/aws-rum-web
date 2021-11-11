import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { DOM_EVENT_TYPE } from '../../utils/constant';

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
            e.type === DOM_EVENT_TYPE && JSON.parse(e.details).elementId === 'A'
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(DOM_EVENT_TYPE)
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
