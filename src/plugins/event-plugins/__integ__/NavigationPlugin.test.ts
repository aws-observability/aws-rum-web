import {
    DISPATCH_COMMAND,
    COMMAND,
    PAYLOAD,
    SUBMIT,
    REQUEST_BODY
} from '../../../test-utils/integ-test-utils';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../utils/constant';

fixture('NavigationEvent Plugin').page(
    'http://localhost:8080/delayed_page.html'
);

test('when plugin loads after window.load then navigation timing events are recorded', async (t: TestController) => {
    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const navigationEvent = JSON.parse(
        JSON.parse(await REQUEST_BODY.textContent).RumEvents?.find(
            (e: any) => e.type === PERFORMANCE_NAVIGATION_EVENT_TYPE
        )?.details
    );

    await t
        .expect(navigationEvent)
        .ok()
        .expect(navigationEvent.name)
        .ok()
        .expect(navigationEvent.entryType)
        .eql('navigation')
        .expect(navigationEvent.startTime)
        .gte(0)
        .expect(navigationEvent.duration)
        .gte(0)
        .expect(navigationEvent.initiatorType)
        .eql('navigation')
        .expect(navigationEvent.nextHopProtocol)
        .typeOf('string')
        .expect(navigationEvent.redirectStart)
        .gte(0)
        .expect(navigationEvent.redirectEnd)
        .gte(0)
        .expect(navigationEvent.fetchStart)
        .gte(0)
        .expect(navigationEvent.domainLookupStart)
        .gte(0)
        .expect(navigationEvent.domainLookupEnd)
        .gte(0)
        .expect(navigationEvent.connectStart)
        .gte(0)
        .expect(navigationEvent.connectEnd)
        .gte(0)
        .expect(navigationEvent.secureConnectionStart)
        .gte(0)
        .expect(navigationEvent.requestStart)
        .gte(0)
        .expect(navigationEvent.responseStart)
        .gte(0)
        .expect(navigationEvent.responseEnd)
        .gte(0)
        .expect(navigationEvent.transferSize)
        .gte(0)
        .expect(navigationEvent.encodedBodySize)
        .gte(0)
        .expect(navigationEvent.decodedBodySize)
        .gte(0)
        .expect(navigationEvent.domComplete)
        .gte(0)
        .expect(navigationEvent.domContentLoadedEventEnd)
        .gte(0)
        .expect(navigationEvent.domContentLoadedEventStart)
        .gte(0)
        .expect(navigationEvent.domInteractive)
        .gte(0)
        .expect(navigationEvent.loadEventEnd)
        .gte(0)
        .expect(navigationEvent.loadEventStart)
        .gte(0)
        .expect(navigationEvent.redirectCount)
        .gte(0)
        .expect(navigationEvent.type)
        .ok()
        .expect(navigationEvent.unloadEventEnd)
        .gte(0)
        .expect(navigationEvent.unloadEventStart)
        .gte(0);
});
