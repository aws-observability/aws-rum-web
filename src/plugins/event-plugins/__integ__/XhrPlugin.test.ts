import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from '../../utils/constant';

const sendAsyncXhrRequest: Selector = Selector(`#sendAsyncXhrRequest`);
const sendSyncXhrRequest: Selector = Selector(`#sendSyncXhrRequest`);
const dispatch: Selector = Selector(`#dispatch`);
const clearRequestResponse: Selector = Selector(`#clearRequestResponse`);

fixture('X-Ray XMLHttpRequest Plugin').page(
    'http://localhost:8080/http_xhr_event.html'
);

test('when async XMLHttpRequest is called then a trace is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clearRequestResponse)
        .click(sendAsyncXhrRequest)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === XRAY_TRACE_EVENT_TYPE
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(XRAY_TRACE_EVENT_TYPE)
        .expect(eventDetails.name)
        .eql('sample.rum.aws.amazon.com');
});

test('when sync XMLHttpRequest is called then a trace is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clearRequestResponse)
        .click(sendSyncXhrRequest)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === XRAY_TRACE_EVENT_TYPE
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(XRAY_TRACE_EVENT_TYPE)
        .expect(eventDetails.name)
        .eql('sample.rum.aws.amazon.com');
});

test('when sync XMLHttpRequest is called then an http event is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clearRequestResponse)
        .click(sendSyncXhrRequest)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === HTTP_EVENT_TYPE
    );

    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(HTTP_EVENT_TYPE)
        .expect(eventDetails.request.method)
        .eql('GET');
});
