import {
    STATUS_202,
    DISPATCH_COMMAND,
    COMMAND,
    PAYLOAD,
    SUBMIT,
    REQUEST_BODY,
    RESPONSE_STATUS,
    ID,
    TIMESTAMP
} from '../../../test-utils/integ-test-utils';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../utils/constant';

const INITIATOR_TYPE = 'initiatorType';
const NAVIGATION_TYPE = 'navigationType';
const START_TIME = 'startTime';
const UNLOAD_EVENT_START = 'unloadEventStart';
const PROMPT_FOR_UNLOAD = 'promptForUnload';
const REDIRECT_COUNT = 'redirectCount';
const REDIRECT_START = 'redirectStart';
const REDIRECT_TIME = 'redirectTime';
const WORKER_START = 'workerStart';
const WORKER_TIME = 'workerTime';
const FETCH_START = 'fetchStart';
const DOMAIN_LOOKUP_START = 'domainLookupStart';
const DNS = 'dns';
const NEXT_HOP_PROTOCOL = 'nextHopProtocol';
const CONNECT_START = 'connectStart';
const CONNECT = 'connect';
const SECURE_CONNECTION_START = 'secureConnectionStart';
const TLS_TIME = 'tlsTime';
const REQUEST_START = 'requestStart';
const TIME_TO_FIRST_BYTE = 'timeToFirstByte';
const RESPONSE_START = 'responseStart';
const RESPONSE_TIME = 'responseTime';
const DOM_INTERACTIVE = 'domInteractive';
const DOM_CONTENT_LOADED_EVENT_START = 'domContentLoadedEventStart';
const DOM_CONTENT_LOADED = 'domContentLoaded';
const DOM_COMPLETE = 'domComplete';
const DOM_PROCESSING_TIME = 'domProcessingTime';
const LOAD_EVENT_START = 'loadEventStart';
const LOAD_EVENT_TIME = 'loadEventTime';
const DURATION = 'duration';
const HEADER_SIZE = 'headerSize';
const TRANSFER_SIZE = 'transferSize';
const COMPRESSION_RATIO = 'compressionRatio';
const SAFARI = 'Safari';

fixture('NagivationEvent Plugin').page(
    'http://localhost:8080/delayed_page.html'
);

test('when plugin loads after window.load then navigation timing events are recorded', async (t: TestController) => {
    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    const isBrowserSafari =
        (await REQUEST_BODY.textContent).indexOf(SAFARI) > -1;

    await t
        .expect(REQUEST_BODY.textContent)
        .contains(PERFORMANCE_NAVIGATION_EVENT_TYPE)
        .expect(REQUEST_BODY.textContent)
        .contains(ID)
        .expect(REQUEST_BODY.textContent)
        .contains(TIMESTAMP)

        .expect(REQUEST_BODY.textContent)
        .contains(INITIATOR_TYPE)
        .expect(REQUEST_BODY.textContent)
        .contains(START_TIME)
        .expect(REQUEST_BODY.textContent)
        .contains(UNLOAD_EVENT_START)
        .expect(REQUEST_BODY.textContent)
        .contains(PROMPT_FOR_UNLOAD)
        .expect(REQUEST_BODY.textContent)
        .contains(REDIRECT_START)
        .expect(REQUEST_BODY.textContent)
        .contains(REDIRECT_TIME)

        .expect(REQUEST_BODY.textContent)
        .contains(FETCH_START)
        .expect(REQUEST_BODY.textContent)
        .contains(DOMAIN_LOOKUP_START)
        .expect(REQUEST_BODY.textContent)
        .contains(DNS)

        .expect(REQUEST_BODY.textContent)
        .contains(CONNECT_START)
        .expect(REQUEST_BODY.textContent)
        .contains(CONNECT)
        .expect(REQUEST_BODY.textContent)
        .contains(SECURE_CONNECTION_START)
        .expect(REQUEST_BODY.textContent)
        .contains(TLS_TIME)
        .expect(REQUEST_BODY.textContent)
        .contains(REQUEST_START)
        .expect(REQUEST_BODY.textContent)
        .contains(TIME_TO_FIRST_BYTE)
        .expect(REQUEST_BODY.textContent)
        .contains(RESPONSE_START)
        .expect(REQUEST_BODY.textContent)
        .contains(RESPONSE_TIME)
        .expect(REQUEST_BODY.textContent)
        .contains(DOM_INTERACTIVE)
        .expect(REQUEST_BODY.textContent)
        .contains(DOM_CONTENT_LOADED_EVENT_START)
        .expect(REQUEST_BODY.textContent)
        .contains(DOM_CONTENT_LOADED)
        .expect(REQUEST_BODY.textContent)
        .contains(DOM_COMPLETE)
        .expect(REQUEST_BODY.textContent)
        .contains(DOM_PROCESSING_TIME)
        .expect(REQUEST_BODY.textContent)
        .contains(LOAD_EVENT_START)
        .expect(REQUEST_BODY.textContent)
        .contains(LOAD_EVENT_TIME)
        .expect(REQUEST_BODY.textContent)
        .contains(DURATION)

        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString())
        .expect((await REQUEST_BODY.textContent).indexOf(DURATION))
        .gt(0);

    /**
     * Deprecated Timing Level1 used for Safari browser do not contain following attributes
     * https://nicj.net/navigationtiming-in-practice/
     */
    if (!isBrowserSafari) {
        await t
            .expect(REQUEST_BODY.textContent)
            .contains(REDIRECT_COUNT)
            .expect(REQUEST_BODY.textContent)
            .contains(NAVIGATION_TYPE)
            .expect(REQUEST_BODY.textContent)
            .contains(WORKER_START)
            .expect(REQUEST_BODY.textContent)
            .contains(WORKER_TIME)
            .expect(REQUEST_BODY.textContent)
            .contains(NEXT_HOP_PROTOCOL)
            .expect(REQUEST_BODY.textContent)
            .contains(HEADER_SIZE)
            .expect(REQUEST_BODY.textContent)
            .contains(TRANSFER_SIZE)
            .expect(REQUEST_BODY.textContent)
            .contains(COMPRESSION_RATIO);
    }
});
