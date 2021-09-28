import { SESSION_START_EVENT_TYPE } from '../sessions/SessionManager';
import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../test-utils/integ-test-utils';

const dispatch: Selector = Selector(`#dispatch`);
const clear: Selector = Selector(`#clearRequestResponse`);

fixture('Cookies Disabled').page('http://localhost:8080/cookies_disabled.html');

test('when page is re-loaded with cookies disabled, session start is dispatched', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const jsonOne = JSON.parse(await REQUEST_BODY.textContent);
    const eventTypeOne = jsonOne.batch.events[0].type;
    const userIdOne = jsonOne.batch.user.userId;
    const sessionIdOne = jsonOne.batch.user.sessionId;

    await t.click(clear).eval(() => location.reload());

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('batch');

    const jsonTwo = JSON.parse(await REQUEST_BODY.textContent);
    const eventTypeTwo = jsonTwo.batch.events[0].type;
    const userIdTwo = jsonTwo.batch.user.userId;
    const sessionIdTwo = jsonTwo.batch.user.sessionId;

    await t
        .expect(eventTypeOne)
        .eql(SESSION_START_EVENT_TYPE)
        .expect(eventTypeTwo)
        .eql(SESSION_START_EVENT_TYPE)
        .expect(userIdOne)
        .notEql(userIdTwo)
        .expect(sessionIdTwo)
        .notEql(sessionIdOne);
});

test('when page is loaded with cookies disabled, session start includes meta data', async (t: TestController) => {
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
        .eql('http://localhost:8080/cookies_disabled.html');
});
