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
        .contains('BatchId');

    const jsonA = JSON.parse(await REQUEST_BODY.textContent);
    const sessionStartEventsA = jsonA.RumEvents.filter(
        (e) => e.type === SESSION_START_EVENT_TYPE
    );

    await t
        .expect(sessionStartEventsA.length)
        .eql(1)
        .click(clear)
        .eval(() => location.reload());

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const jsonB = JSON.parse(await REQUEST_BODY.textContent);
    const sessionStartEventsB = jsonB.RumEvents.filter(
        (e) => e.type === SESSION_START_EVENT_TYPE
    );

    await t.expect(sessionStartEventsB.length).eql(0);
});

test('when page is loaded with cookies enabled, session start includes meta data', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = JSON.parse(await REQUEST_BODY.textContent);
    const sessionStartEvents = json.RumEvents.filter(
        (e) => e.type === SESSION_START_EVENT_TYPE
    );

    const metaData = JSON.parse(sessionStartEvents[0].metadata);

    await t.expect(metaData.pageId).eql('/cookies_enabled.html');
});
