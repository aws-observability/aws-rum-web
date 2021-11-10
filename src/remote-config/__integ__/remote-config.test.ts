import { Selector } from 'testcafe';
import { JS_ERROR_EVENT_TYPE } from '../../plugins/utils/constant';
import { REQUEST_BODY } from '../../test-utils/integ-test-utils';

const dispatch: Selector = Selector(`#dispatch`);
const triggerTypeError: Selector = Selector(`#triggerTypeError`);

fixture('Remote config file download Tests').page(
    'http://localhost:8080/remote_config.html'
);

test('When configURI is provided, then remote config is used', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with tracker load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerTypeError)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === JS_ERROR_EVENT_TYPE
    );

    // An error event should not have been recorded, since the error plugin is
    // omitted from the telemetries list in the remote config.
    await t.expect(events.length).eql(0);
});
