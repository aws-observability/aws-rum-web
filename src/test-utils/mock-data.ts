/* eslint-disable max-classes-per-file */
export const firstPaintEvent = {
    name: 'first-paint',
    duration: 0,
    entryType: 'paint',
    startTime: 306.44000000029337
};

export const firstContentfulPaintEvent = {
    name: 'first-contentful-paint',
    duration: 0,
    entryType: 'paint',
    startTime: 306.44000000029337
};

export const navigationEvent = {
    connectEnd: 6.495000001450535,
    connectStart: 6.495000001450535,
    decodedBodySize: 149690,
    domComplete: 904.4250000006286,
    domContentLoadedEventEnd: 405.5950000001758,
    domContentLoadedEventStart: 380.26000000172644,
    domInteractive: 380.2250000007916,
    domainLookupEnd: 6.495000001450535,
    domainLookupStart: 6.495000001450535,
    duration: 905.125000001135,
    encodedBodySize: 35941,
    entryType: 'navigation',
    fetchStart: 6.495000001450535,
    initiatorType: 'navigation',
    loadEventEnd: 905.125000001135,
    loadEventStart: 904.4549999998708,
    name:
        'https://stackoverflow.com/questions/53224116/nodejs-performance-hooks-crash-when-calling-performance-getentriesbytype',
    nextHopProtocol: 'h2',
    redirectCount: 0,
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 30.170000001817243,
    responseEnd: 356.44999999931315,
    responseStart: 174.32499999995343,
    secureConnectionStart: 6.495000001450535,
    serverTiming: [],
    startTime: 0,
    transferSize: 36525,
    type: 'navigate',
    unloadEventEnd: 0,
    unloadEventStart: 0,
    workerStart: 0,
    navigationTimingLevel: 2
};

export const navigationEventNotLoaded = {
    connectEnd: 6.495000001450535,
    connectStart: 6.495000001450535,
    decodedBodySize: 149690,
    domComplete: 904.4250000006286,
    domContentLoadedEventEnd: 405.5950000001758,
    domContentLoadedEventStart: 380.26000000172644,
    domInteractive: 380.2250000007916,
    domainLookupEnd: 6.495000001450535,
    domainLookupStart: 6.495000001450535,
    duration: 905.125000001135,
    encodedBodySize: 35941,
    entryType: 'navigation',
    fetchStart: 6.495000001450535,
    initiatorType: 'navigation',
    loadEventEnd: 0,
    loadEventStart: 0,
    name:
        'https://stackoverflow.com/questions/53224116/nodejs-performance-hooks-crash-when-calling-performance-getentriesbytype',
    nextHopProtocol: 'h2',
    redirectCount: 0,
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 30.170000001817243,
    responseEnd: 356.44999999931315,
    responseStart: 174.32499999995343,
    secureConnectionStart: 6.495000001450535,
    serverTiming: [],
    startTime: 0,
    transferSize: 36525,
    type: 'navigate',
    unloadEventEnd: 0,
    unloadEventStart: 0,
    workerStart: 0,
    navigationTimingLevel: 2
};

export const resourceEvent = {
    connectEnd: 0,
    connectStart: 0,
    decodedBodySize: 0,
    domainLookupEnd: 0,
    domainLookupStart: 0,
    duration: 438.39999999909196,
    encodedBodySize: 0,
    entryType: 'resource',
    fetchStart: 357.59500000131084,
    initiatorType: 'script',
    name:
        'https://www.gravatar.com/avatar/47a91063fb01317639d57d5fc9c9d9c7?s=32&d=identicon&r=PG',
    nextHopProtocol: 'h2',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 0,
    responseEnd: 795.9950000004028,
    responseStart: 0,
    secureConnectionStart: 0,
    serverTiming: [],
    startTime: 357.59500000131084,
    transferSize: 0,
    workerStart: 0,
    fileType: 'other'
};

export const resourceEvent2 = {
    connectEnd: 386.37999998172745,
    connectStart: 386.37999998172745,
    decodedBodySize: 79,
    domainLookupEnd: 386.37999998172745,
    domainLookupStart: 386.37999998172745,
    duration: 2.640000020619482,
    encodedBodySize: 79,
    entryType: 'resource',
    fetchStart: 386.37999998172745,
    initiatorType: 'script',
    name: 'http://localhost:9000/sockjs-node/info?t=1616810767123',
    nextHopProtocol: 'http/1.1',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 388.2449999800883,
    responseEnd: 389.02000000234693,
    responseStart: 388.71499997912906,
    secureConnectionStart: 0,
    serverTiming: [],
    startTime: 386.37999998172745,
    transferSize: 368,
    workerStart: 0,
    fileType: 'image'
};

export const dataPlaneResourceEvent = {
    connectEnd: 0,
    connectStart: 0,
    decodedBodySize: 0,
    domainLookupEnd: 0,
    domainLookupStart: 0,
    duration: 438.39999999909196,
    encodedBodySize: 0,
    entryType: 'resource',
    fetchStart: 357.59500000131084,
    initiatorType: 'link',
    name:
        'https://dataplane.rum.us-west-2.amazonaws.com/application/aa17a42c-e737-48f7-adaf-2e0905f48073/events',
    nextHopProtocol: 'h2',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 0,
    responseEnd: 795.9950000004028,
    responseStart: 0,
    secureConnectionStart: 0,
    serverTiming: [],
    startTime: 357.59500000131084,
    transferSize: 0,
    workerStart: 0,
    fileType: 'document'
};

export const scriptResourceEvent = {
    connectEnd: 386.37999998172745,
    connectStart: 386.37999998172745,
    decodedBodySize: 79,
    domainLookupEnd: 386.37999998172745,
    domainLookupStart: 386.37999998172745,
    duration: 2.640000020619482,
    encodedBodySize: 79,
    entryType: 'resource',
    fetchStart: 386.37999998172745,
    initiatorType: 'script',
    name: 'http://localhost:9000/main.js',
    nextHopProtocol: 'http/1.1',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 388.2449999800883,
    responseEnd: 389.02000000234693,
    responseStart: 388.71499997912906,
    secureConnectionStart: 0,
    serverTiming: [],
    startTime: 386.37999998172745,
    transferSize: 368,
    workerStart: 0,
    fileType: 'script'
};

export const imageResourceEvent = {
    connectEnd: 386.37999998172745,
    connectStart: 386.37999998172745,
    decodedBodySize: 79,
    domainLookupEnd: 386.37999998172745,
    domainLookupStart: 386.37999998172745,
    duration: 2.640000020619482,
    encodedBodySize: 79,
    entryType: 'resource',
    fetchStart: 386.37999998172745,
    initiatorType: 'script',
    name: 'http://localhost:9000/picture.jpg',
    nextHopProtocol: 'http/1.1',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 388.2449999800883,
    responseEnd: 389.02000000234693,
    responseStart: 388.71499997912906,
    secureConnectionStart: 0,
    serverTiming: [],
    startTime: 386.37999998172745,
    transferSize: 368,
    workerStart: 0,
    fileType: 'image'
};

export const cssResourceEvent = {
    connectEnd: 386.37999998172745,
    connectStart: 386.37999998172745,
    decodedBodySize: 79,
    domainLookupEnd: 386.37999998172745,
    domainLookupStart: 386.37999998172745,
    duration: 2.640000020619482,
    encodedBodySize: 79,
    entryType: 'resource',
    fetchStart: 386.37999998172745,
    initiatorType: 'script',
    name: 'http://localhost:9000/style.css',
    nextHopProtocol: 'http/1.1',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 388.2449999800883,
    responseEnd: 389.02000000234693,
    responseStart: 388.71499997912906,
    secureConnectionStart: 0,
    serverTiming: [],
    startTime: 386.37999998172745,
    transferSize: 368,
    workerStart: 0,
    fileType: 'stylesheet'
};

export interface ObserveInterface {
    type: string;
    buffered: boolean;
}

const entries = [navigationEvent, resourceEvent];

export class MockPerformanceObserver {
    static simulateErrorOnObserve = false;

    constructor(cb: any) {
        (this as any).observe = (options: ObserveInterface) => {
            if (MockPerformanceObserver.simulateErrorOnObserve) {
                MockPerformanceObserver.simulateErrorOnObserve = false;
                throw new Error('Simulated Error');
            }
            cb({ getEntries: () => [...entries] });
            return {};
        };
    }
}

export const MockPerformanceTiming: PerformanceTiming = {
    connectEnd: 1618335687913,
    connectStart: 1618335687836,
    domComplete: 1618335688379,
    domContentLoadedEventEnd: 1618335688365,
    domContentLoadedEventStart: 1618335688365,
    domInteractive: 1618335688268,
    domLoading: 1618335688091,
    domainLookupEnd: 1618335687836,
    domainLookupStart: 1618335687836,
    fetchStart: 1618335687836,
    loadEventEnd: 1618335688383,
    loadEventStart: 1618335688379,
    navigationStart: 1618335687836,
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 1618335687914,
    responseEnd: 1618335688210,
    responseStart: 1618335688078,
    secureConnectionStart: 1618335687847,
    unloadEventEnd: 0,
    unloadEventStart: 0,
    toJSON: () => ({})
};

export class MockEmptyPerformanceObserver {
    constructor(cb: any) {
        (this as any).observe = (options: ObserveInterface) => {
            return cb({ getEntries: () => [] });
        };
    }
}

export const performanceEvent = {
    performance: () => {
        delete (window as any).performance;
        const performance = {
            getEntriesByType: (entryType: string) => {
                if (entryType === 'navigation') {
                    return [navigationEvent];
                }

                if (entryType === 'resource') {
                    return [resourceEvent2];
                }

                if (entryType === 'paint') {
                    return [firstPaintEvent, firstContentfulPaintEvent];
                }
                return [];
            },
            now: () => {
                return Date.now();
            },
            timing: MockPerformanceTiming
        };
        Object.defineProperty(window, 'performance', {
            configurable: true,
            enumerable: true,
            value: performance,
            writable: true
        });
        return window.performance;
    },
    PerformanceObserver: MockPerformanceObserver
};

export const performanceEventNotLoaded = {
    performance: () => {
        delete (window as any).performance;
        const performance = {
            getEntriesByType: (entryType: string) => {
                if (entryType === 'navigation') {
                    return [navigationEventNotLoaded];
                }

                if (entryType === 'resource') {
                    return [resourceEvent2];
                }

                if (entryType === 'paint') {
                    return [firstPaintEvent, firstContentfulPaintEvent];
                }
                return [];
            },
            now: () => {
                return Date.now();
            },
            timing: MockPerformanceTiming
        };
        Object.defineProperty(window, 'performance', {
            configurable: true,
            enumerable: true,
            value: performance,
            writable: true
        });
        return window.performance;
    },
    PerformanceObserver: MockPerformanceObserver
};

export const mockPerformanceObject = () => {
    delete (window as any).performance;
    const performanceObject = {
        getEntriesByType: (entryType: string) => {
            if (entryType === 'resource') {
                return [dataPlaneResourceEvent];
            }
            if (entryType === 'paint') {
                return [];
            }
            return [];
        },
        now: () => {
            return Date.now();
        },
        timing: MockPerformanceTiming
    };
    Object.defineProperty(window, 'performance', {
        configurable: true,
        enumerable: true,
        value: performanceObject,
        writable: true
    });
};

export const mockPerformanceObjectWithResources = () => {
    delete (window as any).performance;
    const performanceObject = {
        getEntriesByType: (entryType: string) => {
            if (entryType === 'resource') {
                return [
                    scriptResourceEvent,
                    imageResourceEvent,
                    cssResourceEvent
                ];
            }
            if (entryType === 'paint') {
                return [];
            }
            return [];
        },
        now: () => {
            return Date.now();
        },
        timing: MockPerformanceTiming
    };
    Object.defineProperty(window, 'performance', {
        configurable: true,
        enumerable: true,
        value: performanceObject,
        writable: true
    });
};

export const mockPaintPerformanceObject = () => {
    delete (window as any).performance;
    const performanceObject = {
        getEntriesByType: (entryType: string) => {
            if (entryType === 'resource') {
                return [resourceEvent];
            }
            if (entryType === 'paint') {
                return [];
            }
            if (entryType === 'navigation') {
                return [navigationEvent];
            }
            return [];
        },
        now: () => {
            return Date.now();
        },
        timing: MockPerformanceTiming
    };
    Object.defineProperty(window, 'performance', {
        configurable: true,
        enumerable: true,
        value: performanceObject,
        writable: true
    });
};

export class MockPaintPerformanceObserver {
    static simulateErrorOnObserve = false;

    constructor(cb: any) {
        (this as any).observe = (options: ObserveInterface) => {
            if (MockPerformanceObserver.simulateErrorOnObserve) {
                MockPerformanceObserver.simulateErrorOnObserve = false;
                throw new Error('Simulated Error');
            }
            cb({ getEntries: () => [resourceEvent2] });
            return {};
        };
    }
}

export const mockPaintPerformanceObserver = () => {
    (window as any).PerformanceObserver = MockPaintPerformanceObserver;
};

export const mockPerformanceObserver = () => {
    (window as any).PerformanceObserver = MockEmptyPerformanceObserver;
};

export const httpErrorEvent = {
    version: '1.0.0',
    eventType: 'ERROR',
    name: 'HTTP',
    method: 'POST',
    statusCode: 400,
    statusText: 'Bad Request',
    responseURL:
        'https://jtrm21au2a.execute-api.us-west-2.amazonaws.com/alpha/v1.0.0/putBatchMetrics',
    responseText: '{"message":"Could not persist data"}'
};
