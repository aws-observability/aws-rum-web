import {
    STATUS_202,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../../../test-utils/integ-test-utils';
import { Selector } from 'testcafe';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../utils/constant';

const testButton: Selector = Selector(`#testButton`);
const dispatch: Selector = Selector(`#dispatch`);

fixture('TTI Plugin').page(
    'http://localhost:8080/time_to_interactive_event.html'
);

test('when TTI is recorded, a TTI event is recorded', async (t: TestController) => {
    const browser = t.browser.name;
    // Skip firefox, till Firefox supports longtasks
    if (browser === 'Firefox') {
        return 'Test is skipped';
    }

    await t
        .click(testButton)
        .wait(100)
        .click(dispatch)
        .wait(3000)
        .click(dispatch)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === TIME_TO_INTERACTIVE_EVENT_TYPE
    );
    await t.expect(events.length).eql(1);

    const ttiEvent = JSON.parse(events[0].details);

    await t.expect(ttiEvent.value).typeOf('number');
});
