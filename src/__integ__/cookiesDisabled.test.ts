import { SESSION_START_EVENT_TYPE } from '../sessions/SessionManager';
import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../test-utils/integ-test-utils';

const dispatch: Selector = Selector(`#dispatch`);
const clear: Selector = Selector(`#clearRequestResponse`);

fixture('Cookies Disabled').page('http://localhost:8080/cookies_disabled.html');

test('when cookies are disabled, no session start event is dispatched', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .wait(300)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = JSON.parse(await REQUEST_BODY.textContent);
    const sessionStartEvents = json.RumEvents.filter(
        (e) => e.eventType === SESSION_START_EVENT_TYPE
    );

    await t.expect(sessionStartEvents.length).eql(0);
});
