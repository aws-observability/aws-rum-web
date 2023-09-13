import { X_AMZN_TRACE_ID, getTraceHeader } from '../http-utils';

const Request = function (input: RequestInfo, init?: RequestInit) {
    if (typeof input === 'string') {
        this.url = input;
        this.method = 'GET';
        this.headers = new Headers();
    } else {
        this.url = input.url;
        this.method = input.method ? input.method : 'GET';
        this.headers = input.headers ? input.headers : new Headers();
    }
    if (init) {
        this.method = init.method ? init.method : this.method;
        if (
            this.headers &&
            typeof (init.headers as Headers).get === 'function'
        ) {
            this.headers = init.headers;
        } else if (this.headers) {
            this.headers = new Headers(init.headers as Record<string, string>);
        }
    }
};

describe('http-utils', () => {
    test('when request header contains trace header then return traceId and segmentId', async () => {
        const existingTraceId = '1-0-000000000000000000000001';
        const existingSegmentId = '0000000000000001';
        const existingTraceHeaderValue = `Root=${existingTraceId};Parent=${existingSegmentId};Sampled=1`;

        const init: RequestInit = {
            headers: {
                [X_AMZN_TRACE_ID]: existingTraceHeaderValue
            }
        };
        const request: Request = new Request('https://aws.amazon.com', init);

        const traceHeader = getTraceHeader(request.headers);

        expect(traceHeader.traceId).toEqual(existingTraceId);
        expect(traceHeader.segmentId).toEqual(existingSegmentId);
    });

    test('when request header does not contain trace header then returned traceId and segmentId are undefined', async () => {
        const request: Request = new Request('https://aws.amazon.com');

        const traceHeader = getTraceHeader(request.headers);

        expect(traceHeader.traceId).toEqual(undefined);
        expect(traceHeader.segmentId).toEqual(undefined);
    });
});
