export enum ResourceType {
    OTHER = 'other',
    STYLESHEET = 'stylesheet',
    DOCUMENT = 'document',
    SCRIPT = 'script',
    IMAGE = 'image',
    FONT = 'font'
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/initiatorType
 */
export enum InitiatorType {
    // IMAGES
    // PerformanceResourceTiming with initiatorType=Input must be an image
    // Per MDN docs: "if the request was initiated by an <input> element of type image.""
    IMG = 'img',
    IMAGE = 'image',
    INPUT = 'input',

    // DOCUMENTS
    IFRAME = 'iframe',
    FRAME = 'frame',

    // SCRIPTS
    SCRIPT = 'script',

    // STYLESHEETS
    CSS = 'css'
}

/**
 * Creates key to link a RumEvent to the PerformanceEntry that it is sourced from
 * e.g. performanceKey(ResourceEvent) === performanceKey(PerformanceResourceTiming).
 */
export const performanceKey = (startTime: number, duration: number) =>
    [startTime, duration].join('#');

export const getResourceFileType = (initiatorType: string): ResourceType => {
    switch (initiatorType) {
        case InitiatorType.IMAGE:
        case InitiatorType.IMG:
        case InitiatorType.INPUT:
            return ResourceType.IMAGE;
        case InitiatorType.IFRAME:
        case InitiatorType.FRAME:
            return ResourceType.DOCUMENT;
        case InitiatorType.SCRIPT:
            return ResourceType.SCRIPT;
        case InitiatorType.CSS:
            return ResourceType.STYLESHEET;
        default:
            return ResourceType.OTHER;
    }
};

export interface RumLCPAttribution {
    element?: string;
    url?: string;
    timeToFirstByte: number;
    resourceLoadDelay: number;
    resourceLoadTime: number;
    elementRenderDelay: number;
    lcpResourceEntry?: string;
    navigationEntry?: string;
}

/** Checks at runtime if the web vitals package will record LCP
 * If PerformanceAPI ever changes this API, or if WebVitals package implements a polyfill,
 * then this needs to be updated
 *
 * Reference code from web vitals package:
 * https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/observe.ts#L46
 * Discussion for context:
 * https://github.com/aws-observability/aws-rum-web/pull/448#issuecomment-1734314463
 */
export const isLCPSupported = () => {
    return PerformanceObserver.supportedEntryTypes.includes(
        'largest-contentful-paint'
    );
};

export const isFCPSupported = () => {
    return PerformanceObserver.supportedEntryTypes.includes('paint');
};

export const isLongTaskSupported = () => {
    return PerformanceObserver.supportedEntryTypes.includes('longtask');
};

export const isPutRumEventsCall = (url: string, endpointHost: string) => {
    const pathRegex =
        /.*\/application\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/events/;
    const entryUrl = new URL(url);
    return entryUrl.host === endpointHost && pathRegex.test(entryUrl.pathname);
};

export const isNavigationSupported = () => {
    return PerformanceObserver.supportedEntryTypes.includes('navigation');
};
