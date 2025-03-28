import { Selector } from 'testcafe';
import {
    STATUS_202,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../test-utils/integ-test-utils';

const testButton: Selector = Selector(`#testButton`);
const dispatch: Selector = Selector(`#dispatch`);

fixture('Alias Included').page('http://localhost:8080/alias_included.html');

test('when alias is included and events are recorded, PutRumEvents requests contains the alias', async (t: TestController) => {
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

    const requestBody = JSON.parse(await REQUEST_BODY.textContent);
    await t.expect(requestBody['Alias']).eql('test123');
});
