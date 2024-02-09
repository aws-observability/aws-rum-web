import {
    CLS_EVENT_TYPE,
    DOM_EVENT_TYPE,
    FID_EVENT_TYPE,
    HTTP_EVENT_TYPE,
    JS_ERROR_EVENT_TYPE,
    LCP_EVENT_TYPE,
    PAGE_VIEW_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE,
    RUM_AMZ_PREFIX,
    SESSION_START_EVENT_TYPE,
    TIME_TO_INTERACTIVE_EVENT_TYPE,
    XRAY_TRACE_EVENT_TYPE
} from '../constant';

describe('Constants', () => {
    const types = [
        HTTP_EVENT_TYPE,
        XRAY_TRACE_EVENT_TYPE,
        LCP_EVENT_TYPE,
        FID_EVENT_TYPE,
        CLS_EVENT_TYPE,
        PERFORMANCE_NAVIGATION_EVENT_TYPE,
        PERFORMANCE_RESOURCE_EVENT_TYPE,
        DOM_EVENT_TYPE,
        JS_ERROR_EVENT_TYPE,
        PAGE_VIEW_EVENT_TYPE,
        SESSION_START_EVENT_TYPE,
        TIME_TO_INTERACTIVE_EVENT_TYPE
    ];
    test('rum event type names are valid', async () => {
        types.forEach((type) => {
            // uses rum prefix
            expect(type.startsWith(RUM_AMZ_PREFIX)).toBe(true);
            // has snake case phrases delimited by periods
            type.split('.').forEach((phrase) => {
                expect(phrase).not.toEqual('');
                phrase.split('_').forEach((word) => {
                    expect(/[a-z]+/.test(word)).toBe(true);
                });
            });
        });
    });
});
