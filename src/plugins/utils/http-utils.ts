import { getHost } from '../../utils/common-utils';
import {
    Http,
    Subsegment,
    XRayTraceEvent
} from '../../events/xray-trace-event';
import { getRandomValues } from '../../utils/random';

// All one-byte hex strings from 0x00 to 0xff.
export const byteToHex = [];
for (let i = 0; i < 256; i++) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

export const X_AMZN_TRACE_ID = 'X-Amzn-Trace-Id';

export type PartialHttpPluginConfig = {
    logicalServiceName?: string;
    urlsToInclude?: RegExp[];
    urlsToExclude?: RegExp[];
    stackTraceLength?: number;
    recordAllRequests?: boolean;
    addXRayTraceIdHeader?: boolean;
};

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
    addXRayTraceIdHeader: boolean;
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
    init: RequestInit,
    traced: boolean
): Http => {
    const http: Http = { request: {} };
    http.request.method = init?.method ? init.method : 'GET';
    http.request.traced = traced;
    return http;
};

export const createXRayTraceEvent = (
    name: string,
    startTime: number,
    http?: Http
): XRayTraceEvent => {
    const traceEvent: XRayTraceEvent = {
        version: '1.0.0',
        name,
        origin: 'AWS::RUM::Application',
        id: generateSegmentId(),
        start_time: startTime,
        trace_id: generateTraceId(),
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
    startTime,
    http?: Http
): Subsegment => {
    const subsegment: Subsegment = {
        id: generateSegmentId(),
        name,
        start_time: startTime,
        end_time: undefined,
        in_progress: false,
        namespace: 'remote'
    };
    if (http) {
        subsegment.http = http;
    }
    return subsegment;
};

export const requestInfoToHostname = (request: Request | URL | string) => {
    let hostname = '';
    if ((request as URL).hostname) {
        hostname = (request as URL).hostname;
    } else if ((request as Request).url) {
        hostname = getHost((request as Request).url);
    } else {
        hostname = getHost(request.toString());
    }
    return hostname ? hostname : window.location.hostname;
};

export const addAmznTraceIdHeader = (
    init: RequestInit,
    traceId: string,
    segmentId: string
) => {
    if (!init.headers) {
        init.headers = {};
    }
    init.headers[X_AMZN_TRACE_ID] = getAmznTraceIdHeaderValue(
        traceId,
        segmentId
    );
};

export const getAmznTraceIdHeaderValue = (
    traceId: string,
    segmentId: string
) => {
    return 'Root=' + traceId + ';Parent=' + segmentId + ';Sampled=1';
};

/**
 * Generate a globally unique trace ID.
 *
 * See https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sendingdata.html
 * @returns a trace id with the form '1-[unix epoch time in 8 hex digits]-[random in 24 hex digits]'
 */
const generateTraceId = (): string => {
    return `1-${hexTime()}-${guid()}`;
};

/**
 * Generate a segment ID that is unique within a trace.
 *
 * See https://docs.aws.amazon.com/xray/latest/devguide/xray-api-sendingdata.html
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
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < bytes.length; i++) {
        hexString += byteToHex[bytes[i]];
    }
    return hexString;
};
