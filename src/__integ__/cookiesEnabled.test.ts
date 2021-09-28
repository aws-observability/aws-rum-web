import { SESSION_START_EVENT_TYPE } from '../sessions/SessionManager';
import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../test-utils/integ-test-utils';

const dispatch: Selector = Selector(`#dispatch`);
const clear: Selector = Selector(`#clearRequestResponse`);

fixture('Cookies Enabled').page('http://localhost:8080/cookies_enabled.html');

test('when page is re-loaded with cookies enabled, session start is not dispatched', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const jsonOne = JSON.parse(await REQUEST_BODY.textContent);
    const eventTypeOne = jsonOne.batch.events[0].type;

    await t
        .expect(eventTypeOne)
        .eql(SESSION_START_EVENT_TYPE)
        .click(clear)
        .eval(() => location.reload());

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch')
        .expect(REQUEST_BODY.textContent)
        .notContains(SESSION_START_EVENT_TYPE);
});

test('when page is loaded with cookies enabled, session start includes meta data', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const jsonOne = JSON.parse(await REQUEST_BODY.textContent);
    const eventTypeOne = jsonOne.batch.events[0].type;
    const metaDataOne = JSON.parse(jsonOne.batch.events[0].metadata);

    await t
        .expect(eventTypeOne)
        .eql(SESSION_START_EVENT_TYPE)
        .expect(metaDataOne.url)
        .eql('http://localhost:8080/cookies_enabled.html');
});
