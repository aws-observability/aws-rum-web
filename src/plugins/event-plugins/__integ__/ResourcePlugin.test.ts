import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { Selector } from 'testcafe';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../../utils/constant';

const dispatch: Selector = Selector(`#dispatch`);

fixture('ResourceEvent Plugin').page(
    'http://localhost:8080/delayed_image.html'
);

test('when resource loads before the plugin then the resource is recorded', async (t: TestController) => {
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
            JSON.parse(e.details).targetUrl.includes(
                'rum_javascript_telemetry.js'
            )
    );

    await t.expect(events.length).eql(1);
});

test('when resource loads after window.load then the resource is recorded', async (t: TestController) => {
    await t
        .wait(500)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
            JSON.parse(e.details).targetUrl.includes('blank.png')
    );

    await t.expect(events.length).eql(1);
});
