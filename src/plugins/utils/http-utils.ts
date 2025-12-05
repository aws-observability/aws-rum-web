import {
    Http,
    Subsegment,
    XRayTraceEvent
} from '../../events/xray-trace-event';
import { getRandomValues } from '../../utils/random';

// All one-byte hex strings from 0x00 to 0xff.
export const byteToHex: string[] = [];
for (let i = 0; i < 256; i++) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

export const X_AMZN_TRACE_ID = 'X-Amzn-Trace-Id';
export const W3C_TRACEPARENT_HEADER_NAME = 'traceparent';

export const TRACEPARENT_VERSION_LENGTH = 2;
export const TRACEPARENT_TRACE_ID_LENGTH = 32;
export const TRACEPARENT_PARENT_ID_LENGTH = 16;
export const TRACEPARENT_NUMBER_OF_FIELDS = 4;

export type HttpPluginConfig = {
    logicalServiceName: string;
    urlsToInclude: RegExp[];
    urlsToExclude: RegExp[];
    stackTraceLength: number;
    recordAllRequests: boolean;
    // Adding the trace ID header to the request is risky. It may:
    // 1. Cause CORS to fail if the server's CORS configuration does not accept
    //    the X-Amzn-Trace-Id header.
    // 2. Cause sigv4 to fail on the server if the request has been signed.
    //
    // Applications that wish to link their client and server traces by enabling
    // the X-Amzn-Trace-Id header should test their applications before enabling
    // it in a production environment.
    addXRayTraceIdHeader: boolean | RegExp[];
    /**
     * Use this function to normalize URLs before recording the HTTP Event in RUM.
     * This is useful when you want to obfuscate sensitive information in the URL or group URLs with similar patterns together (i.e. path parameters)
     * Or even, to have a clearer naming for known services.
     *
     * Example use cases:
     *
     * @example normalizing path params
     *  /users/1234
     *  /users/5678
     * can be normalized to
     *  /users/{userId}
     * @example
     *  /users/1234
     * can be normalized to
     *  GetUsersById
     */
    eventURLNormalizer?: (url: string) => string;
};

export const isTraceIdHeaderEnabled = (
    url: string,
    addXrayTraceIdHeader: boolean | RegExp[]
): boolean => {
    if (Array.isArray(addXrayTraceIdHeader)) {
        return addXrayTraceIdHeader.some((matcher) => matcher.test(url));
    }
    return addXrayTraceIdHeader;
};

export type TraceHeader = {
    traceId?: string;
    segmentId?: string;
};

export const defaultConfig: HttpPluginConfig = {
    logicalServiceName: 'rum.aws.amazon.com',
    urlsToInclude: [/.*/],
    urlsToExclude: [
        // Cognito endpoints https://docs.aws.amazon.com/general/latest/gr/cognito_identity.html
        /cognito\-identity\.([^\.]*\.)?amazonaws\.com/,
        // STS endpoints https://docs.aws.amazon.com/general/latest/gr/sts.html
        /sts\.([^\.]*\.)?amazonaws\.com/
    ],
    stackTraceLength: 200,
    recordAllRequests: false,
    addXRayTraceIdHeader: false
};

export const is2xx = (status: number) => 200 <= status && status < 300;

export const is4xx = (status: number) => {
    return Math.floor(status / 100) === 4;
};

export const is5xx = (status: number) => {
    return Math.floor(status / 100) === 5;
};

export const is429 = (status: number) => {
    return status === 429;
};

export const isUrlAllowed = (url: string, config: HttpPluginConfig) => {
    const include = config.urlsToInclude.some((urlPattern) =>
        urlPattern.test(url)
    );
    const exclude = config.urlsToExclude.some((urlPattern) =>
        urlPattern.test(url)
    );
    return include && !exclude;
};

/**
 * Returns the current time, in floating point seconds in epoch time, accurate to milliseconds.
 */
export const epochTime = () => {
    return Date.now() / 1000;
};

export const createXRayTraceEventHttp = (
    input: RequestInfo | URL | string,
    init: RequestInit | undefined,
    traced: boolean
): Http => {
    const http: Http = { request: {} };
    http.request!.method = init?.method ? init.method : 'GET';
    http.request!.traced = traced;
    http.request!.url = resourceToUrlString(input);
    return http;
};

export const createXRayTraceEvent = (
    name: string,
    startTime: number,
    w3cTraceId: boolean,
    http?: Http
): XRayTraceEvent => {
    const traceEvent: XRayTraceEvent = {
        version: '1.0.0',
        name,
        origin: 'AWS::RUM::AppMonitor',
        id: generateSegmentId(),
        start_time: startTime,
        trace_id: w3cTraceId ? generateW3CTraceId() : generateTraceId(),
        end_time: undefined,
        subsegments: [],
        in_progress: false
    };
    if (http) {
        traceEvent.http = http;
    }
    return traceEvent;
};

export const createXRaySubsegment = (
    name: string,
    startTime: number,
    http?: Http
): Subsegment => {
    const subsegment: Subsegment = {
        id: generateSegmentId(),
        name,
        start_time: startTime,
        end_time: undefined,
        in_progress: false,
        namespace: name.endsWith('amazonaws.com') ? 'aws' : 'remote'
    };
    if (http) {
        subsegment.http = http;
    }
    return subsegment;
};

export const requestInfoToHostname = (request: Request | URL | string) => {
    try {
        if ((request as URL).hostname) {
            return (request as URL).hostname;
        } else if ((request as Request).url) {
            return new URL((request as Request).url).hostname;
        } else {
            return new URL(request.toString()).hostname;
        }
    } catch (e) {
        // The URL could not be parsed. This library's convention is to fail
        // silently to limit the risk of impacting the application being
        // monitored.  We will use the hostname of the current page instead.
        return window.location.hostname;
    }
};

export const addAmznTraceIdHeaderToInit = (
    init: RequestInit,
    traceId: string,
    segmentId: string,
    w3cTraceIdEnabled: boolean
) => {
    if (!init.headers) {
        init.headers = {};
    }
    if (w3cTraceIdEnabled) {
        (init.headers as any)[W3C_TRACEPARENT_HEADER_NAME] =
            getW3CTraceIdHeaderValue(traceId, segmentId);
    } else {
        (init.headers as any)[X_AMZN_TRACE_ID] = getAmznTraceIdHeaderValue(
            traceId,
            segmentId
        );
    }
};

export const addAmznTraceIdHeaderToHeaders = (
    headers: Headers,
    traceId: string,
    segmentId: string,
    w3cTraceIdEnabled: boolean
) => {
    if (w3cTraceIdEnabled) {
        headers.set(
            W3C_TRACEPARENT_HEADER_NAME,
            getW3CTraceIdHeaderValue(traceId, segmentId)
        );
    } else {
        headers.set(
            X_AMZN_TRACE_ID,
            getAmznTraceIdHeaderValue(traceId, segmentId)
        );
    }
};

export const getAmznTraceIdHeaderValue = (
    traceId: string,
    segmentId: string
) => {
    return 'Root=' + traceId + ';Parent=' + segmentId + ';Sampled=1';
};

export const getW3CTraceIdHeaderValue = (
    traceId: string,
    segmentId: string
) => {
    return '00-' + traceId + '-' + segmentId + '-01';
};

/**
 * Check if the header is a valid w3c traceparent header.
 *
 * See https://www.w3.org/TR/trace-context/#traceparent-header-field-values
 *
 * @returns true if the header is a valid w3c traceparent header
 */
export const isValidW3CHeader = (headerComponents: string[]) => {
    return (
        headerComponents?.length === TRACEPARENT_NUMBER_OF_FIELDS &&
        headerComponents[0].length === TRACEPARENT_VERSION_LENGTH &&
        headerComponents[1].length === TRACEPARENT_TRACE_ID_LENGTH &&
        headerComponents[2].length === TRACEPARENT_PARENT_ID_LENGTH &&
        (headerComponents[3] === '00' || headerComponents[3] === '01')
    );
};

export const getTraceHeader = (
    headers: Headers,
    w3cTraceIdEnabled: boolean
) => {
    const traceHeader: TraceHeader = {};

    if (headers) {
        if (w3cTraceIdEnabled) {
            const headerComponents = headers
                .get(W3C_TRACEPARENT_HEADER_NAME)
                ?.split('-');
            if (headerComponents && isValidW3CHeader(headerComponents)) {
                traceHeader.traceId = headerComponents[1];
                traceHeader.segmentId = headerComponents[2];
            }
        } else {
            const headerComponents = headers.get(X_AMZN_TRACE_ID)?.split(';');
            if (headerComponents?.length === 3) {
                traceHeader.traceId = headerComponents[0].split('Root=')[1];
                traceHeader.segmentId = headerComponents[1].split('Parent=')[1];
            }
        }
    }
    return traceHeader;
};
/**
 * Extracts an URL string from the fetch resource parameter.
 */
export const resourceToUrlString = (resource: Request | URL | string) => {
    return (resource as Request).url
        ? (resource as Request).url
        : resource.toString();
};

/**
 * Generate a globally unique trace ID.
 *
 * See https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sendingdata.html
 *
 * @returns a trace id with the form '1-[unix epoch time in 8 hex digits]-[random in 24 hex digits]'
 */
const generateTraceId = (): string => {
    return `1-${hexTime()}-${guid()}`;
};

/**
 * Generate a globally unique trace ID in w3c format.
 *
 * See https://www.w3.org/TR/trace-context/#trace-id
 *
 * @returns a trace id with the form '[random in 32 hex digits]'
 */
const generateW3CTraceId = (): string => {
    const randomBytes = new Uint8Array(16);
    getRandomValues(randomBytes);
    return `${uint8ArrayToHexString(randomBytes)}`;
};

/**
 * Generate a segment ID that is unique within a trace.
 *
 * See https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sendingdata.html
 *
 * @returns a segment id, which is 16 random hex digits
 */
const generateSegmentId = (): string => {
    const randomBytes = new Uint8Array(8);
    getRandomValues(randomBytes);
    return uint8ArrayToHexString(randomBytes);
};

const hexTime = (): string => {
    return Math.floor(Date.now() / 1000).toString(16);
};

const guid = (): string => {
    const randomBytes = new Uint8Array(12);
    getRandomValues(randomBytes);
    return uint8ArrayToHexString(randomBytes);
};

const uint8ArrayToHexString = (bytes: Uint8Array): string => {
    let hexString = '';
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < bytes.length; i++) {
        hexString += byteToHex[bytes[i]];
    }
    return hexString;
};
