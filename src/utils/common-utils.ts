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
    /**
     * IMAGES
     * PerformanceResourceTiming with initiatorType=Input must be an image
     * Per MDN docs: "if the request was initiated by an <input> element of type image.""
     */
    IMG = 'img',
    IMAGE = 'image',
    INPUT = 'input',

    /**
     * DOCUMENTS
     */
    IFRAME = 'iframe',
    FRAME = 'frame',

    /**
     * SCRIPTS
     */
    SCRIPT = 'script',

    /**
     * STYLESHEETS
     */
    CSS = 'css'
}

/**
 * Creates key to link a RumEvent to the PerformanceEntry that it is sourced from
 * e.g. performanceKey(ResourceEvent) === performanceKey(PerformanceResourceTiming).
 */
export const performanceKey = (details: PerformanceEntry) =>
    [details.name, details.startTime].join('#');

const extensions = [
    {
        name: ResourceType.STYLESHEET,
        list: ['css', 'less']
    },
    {
        name: ResourceType.DOCUMENT,
        list: ['htm', 'html', 'ts', 'doc', 'docx', 'pdf', 'xls', 'xlsx']
    },
    {
        name: ResourceType.SCRIPT,
        list: ['js']
    },
    {
        name: ResourceType.IMAGE,
        list: [
            'ai',
            'bmp',
            'gif',
            'ico',
            'jpeg',
            'jpg',
            'png',
            'ps',
            'psd',
            'svg',
            'tif',
            'tiff'
        ]
    },
    {
        name: ResourceType.FONT,
        list: ['fnt', 'fon', 'otf', 'ttf', 'woff']
    }
];

export const getResourceFileType = (
    url: string,
    initiatorType?: string
): ResourceType => {
    let ext = ResourceType.OTHER;
    const filename = url.substring(url.lastIndexOf('/') + 1);
    const extension = filename
        .substring(filename.lastIndexOf('.') + 1)
        .split(/[?#]/)[0];
    ext = extensions.find((e) => e.list.includes(extension))?.name ?? ext;

    /**
     * Resource name sometimes does not have the correct file extension names due to redirects.
     * In these cases, they are mislablled as "other". In these cases, we can infer the correct
     * fileType from the initiator.
     */
    if (initiatorType && ext === ResourceType.OTHER) {
        switch (initiatorType) {
            case InitiatorType.IMAGE:
            case InitiatorType.IMG:
            case InitiatorType.INPUT:
                ext = ResourceType.IMAGE;
                break;
            case InitiatorType.IFRAME:
            case InitiatorType.FRAME:
                ext = ResourceType.DOCUMENT;
                break;
            case InitiatorType.SCRIPT:
                ext = ResourceType.SCRIPT;
                break;
            case InitiatorType.CSS:
                ext = ResourceType.STYLESHEET;
                break;
        }
    }
    return ext;
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
