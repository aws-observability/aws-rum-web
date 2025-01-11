import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../../test-utils/integ-test-utils';
import { CSP_VIOLATION_EVENT_TYPE } from '../../utils/constant';

const triggerSecurityPolicyViolationEvent: Selector = Selector(
    `#triggerSecurityPolicyViolationEvent`
);
const triggerIgnoredSecurityPolicyViolationEvent: Selector = Selector(
    `#triggerIgnoredSecurityPolicyViolationEvent`
);
const recordCspViolationEvent: Selector = Selector(`#recordCspViolationEvent`);
const dispatch: Selector = Selector(`#dispatch`);

fixture('CSPViolationEvent Plugin').page(
    'http://localhost:8080/csp_violation_event.html'
);

const removeUnwantedEvents = (json: any) => {
    const newEventsList = [];
    for (const event of json.RumEvents) {
        if (/(dispatch)/.test(event.details)) {
            // Skip
        } else if (/(session_start_event)/.test(event.type)) {
            // Skip
        } else if (/(page_view_event)/.test(event.type)) {
            // Skip
        } else {
            newEventsList.push(event);
        }
    }

    json.RumEvents = newEventsList;
    return json;
};

test('when a SecurityPolicyViolationEvent is triggered then cspViolationEvent is recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerSecurityPolicyViolationEvent)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === CSP_VIOLATION_EVENT_TYPE
    );
    const eventType = events[0].type;
    const eventDetails = JSON.parse(events[0].details);

    await t
        .expect(eventType)
        .eql(CSP_VIOLATION_EVENT_TYPE)
        .expect(eventDetails.violatedDirective)
        .match(/test:violatedDirective/)
        .expect(eventDetails.documentURI)
        .match(/http:\/\/documentURI/)
        .expect(eventDetails.blockedURI)
        .match(/https:\/\/blockedURI/)
        .expect(eventDetails.originalPolicy)
        .match(/test:originalPolicy/)
        .expect(eventDetails.referrer)
        .match(/test:referrer/)
        .expect(eventDetails.statusCode)
        .match(/200/)
        .expect(eventDetails.effectiveDirective)
        .match(/test:effectiveDirective/)
        .expect(eventDetails.version)
        .match(/1.0.0/);
});

test('when ignore function matches error then the plugin does not record the error', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(triggerIgnoredSecurityPolicyViolationEvent)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );

    await t.expect(json.RumEvents.length).eql(0);
});

test('when error invoked with record method then the plugin records the error', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(recordCspViolationEvent)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents.filter(
        (e) => e.type === CSP_VIOLATION_EVENT_TYPE
    );

    await t.expect(events.length).eql(1);
});
