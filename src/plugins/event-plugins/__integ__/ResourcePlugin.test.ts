import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { Selector } from 'testcafe';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../../utils/constant';

const dispatch: Selector = Selector(`#dispatch`);

fixture('ResourceEvent Plugin').page(
    'http://localhost:8080/delayed_image.html'
);

test('when resource loads after window.load then the resource is recorded', async (t: TestController) => {
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
            JSON.parse(e.details).name.includes('blank.png')
    );
    await t.expect(events.length).eql(1);
});

test('when resource loads before the plugin then the resource is recorded', async (t: TestController) => {
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) =>
            e.type === PERFORMANCE_RESOURCE_EVENT_TYPE &&
            JSON.parse(e.details).name.includes('rum_javascript_telemetry.js')
    );

    await t.expect(events.length).eql(1);
});

test('when resource event is record it contains all fields', async (t: TestController) => {
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const resourceEvent = JSON.parse(
        JSON.parse(await REQUEST_BODY.textContent).RumEvents?.find(
            (e: any) => e.type === PERFORMANCE_RESOURCE_EVENT_TYPE
        )?.details
    );

    await t
        .expect(resourceEvent)
        .ok()
        .expect(resourceEvent.name)
        .ok()
        .expect(resourceEvent.entryType)
        .eql('resource')
        .expect(resourceEvent.duration)
        .gte(0)
        .expect(resourceEvent.initiatorType)
        .ok()
        .expect(resourceEvent.nextHopProtocol)
        .typeOf('string')
        .expect(resourceEvent.redirectStart)
        .gte(0)
        .expect(resourceEvent.redirectEnd)
        .gte(0)
        .expect(resourceEvent.fetchStart)
        .gte(0)
        .expect(resourceEvent.domainLookupStart)
        .gte(0)
        .expect(resourceEvent.domainLookupEnd)
        .gte(0)
        .expect(resourceEvent.connectStart)
        .gte(0)
        .expect(resourceEvent.connectEnd)
        .gte(0)
        .expect(resourceEvent.secureConnectionStart)
        .gte(0)
        .expect(resourceEvent.requestStart)
        .gte(0)
        .expect(resourceEvent.responseStart)
        .gte(0)
        .expect(resourceEvent.responseEnd)
        .gte(0)
        .expect(resourceEvent.transferSize)
        .gte(0)
        .expect(resourceEvent.encodedBodySize)
        .gte(0)
        .expect(resourceEvent.decodedBodySize)
        .gte(0);

    // As of now, RenderBlockingStatus is not experimental but has limited support
    // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming#browser_compatibility
    if (t.browser.name !== 'Firefox' && t.browser.name !== 'Safari') {
        await t.expect(resourceEvent.renderBlockingStatus).ok();
    }
});
