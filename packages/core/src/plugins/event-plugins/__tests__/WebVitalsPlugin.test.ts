jest.mock('../../../utils/common-utils', () => {
    const originalModule = jest.requireActual('../../../utils/common-utils');
    return {
        __esModule: true,
        ...originalModule,
        isLCPSupported: jest.fn().mockReturnValue(true)
    };
});
import { ResourceType } from '../../../utils/common-utils';
import {
    CLS_EVENT_TYPE,
    FID_EVENT_TYPE,
    INP_EVENT_TYPE,
    LCP_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE
} from '../../../plugins/utils/constant';
import {
    context,
    record,
    recordCandidate
} from '../../../test-utils/test-utils';
import { Topic } from '../../../event-bus/EventBus';
import { WebVitalsPlugin } from '../WebVitalsPlugin';
import { navigationEvent } from '../../../test-utils/mock-data';
import {
    INPMetricWithAttribution,
    CLSMetricWithAttribution,
    FIDMetricWithAttribution,
    LCPMetricWithAttribution
} from 'web-vitals';

const mockLCPData = {
    delta: 239.51,
    id: 'v1-1621403597701-7933189041053',
    name: 'LCP',
    value: 239.51,
    attribution: {
        element: '#root>div>div>div>img',
        url: 'example.com/source.png',
        timeToFirstByte: 1000,
        resourceLoadDelay: 250,
        resourceLoadDuration: 1000,
        elementRenderDelay: 250
    }
} as LCPMetricWithAttribution;

const mockFIDData = {
    delta: 1.2799999676644802,
    id: 'v1-1621403597702-6132885858466',
    name: 'FID',
    value: 1.2799999676644802,
    attribution: {
        eventTime: 300,
        eventTarget: '#root>div>div>div>img',
        eventType: 'keydown',
        loadState: 'dom-interactive'
    }
} as FIDMetricWithAttribution;

const mockCLSData = {
    delta: 0,
    id: 'v1-1621403597702-8740659462223',
    name: 'CLS',
    value: 0.037451866876684094,
    attribution: {
        largestShiftTarget: '#root>div>div>div>img',
        largestShiftValue: 0.03076529149893375,
        largestShiftTime: 3447485.600000024,
        loadState: 'dom-interactive'
    }
} as CLSMetricWithAttribution;

const mockINPData = {
    value: 0,
    attribution: {
        interactionTarget: 'body',
        interactionTime: 5,
        nextPaintTime: 100,
        interactionType: 'pointer',
        inputDelay: 25,
        processingDuration: 50,
        presentationDelay: 25,
        loadState: 'complete'
    }
} as INPMetricWithAttribution;

// only need hasLatency fields
const imagePerformanceEntry = {
    duration: 50,
    startTime: 100
};

const imageResourceRumEvent: any = {
    id: 'img-id',
    type: PERFORMANCE_RESOURCE_EVENT_TYPE,
    details: {
        fileType: ResourceType.IMAGE,
        ...imagePerformanceEntry
    }
};

const navigationRumEvent: any = {
    id: 'nav-id',
    type: PERFORMANCE_NAVIGATION_EVENT_TYPE,
    details: navigationEvent
};

const mockLCPDataWithImage = Object.assign({}, mockLCPData, {
    attribution: {
        ...mockLCPData.attribution,
        lcpResourceEntry: imagePerformanceEntry
    }
});

jest.mock('web-vitals/attribution', () => {
    return {
        onLCP: jest.fn().mockImplementation((callback) => {
            context.eventBus.dispatch(Topic.EVENT, imageResourceRumEvent);
            context.eventBus.dispatch(Topic.EVENT, navigationRumEvent);
            callback(mockLCPDataWithImage);
        }),
        onFID: jest
            .fn()
            .mockImplementation((callback) => callback(mockFIDData)),
        onCLS: jest
            .fn()
            .mockImplementation((callback) => callback(mockCLSData)),
        onINP: jest.fn().mockImplementation((callback) => callback(mockINPData))
    };
});

describe('WebVitalsPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
        recordCandidate.mockClear();
    });

    test('When web vitals are present then LCP is recorded with attributions', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                version: '1.0.0',
                value: mockLCPData.value,
                attribution: expect.objectContaining({
                    element: mockLCPData.attribution.element,
                    url: mockLCPData.attribution.url,
                    timeToFirstByte: mockLCPData.attribution.timeToFirstByte,
                    resourceLoadDelay:
                        mockLCPData.attribution.resourceLoadDelay,
                    resourceLoadTime:
                        mockLCPData.attribution.resourceLoadDuration,
                    elementRenderDelay:
                        mockLCPData.attribution.elementRenderDelay
                })
            })
        );
    });

    test('When web vitals are present then FID is recorded with attribution', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledWith(
            FID_EVENT_TYPE,
            expect.objectContaining({
                version: '1.0.0',
                value: mockFIDData.value,
                attribution: {
                    eventTarget: mockFIDData.attribution.eventTarget,
                    eventType: mockFIDData.attribution.eventType,
                    eventTime: mockFIDData.attribution.eventTime,
                    loadState: mockFIDData.attribution.loadState
                }
            })
        );
    });

    test('When web vitals are present with reportAllCLS=false then CLS is recorded with attribution as event candidate', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin({
            reportAllCLS: false
        });

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        expect(recordCandidate).toHaveBeenCalledWith(
            CLS_EVENT_TYPE,
            expect.objectContaining({
                version: '1.0.0',
                value: mockCLSData.value,
                attribution: {
                    largestShiftTarget:
                        mockCLSData.attribution.largestShiftTarget,
                    largestShiftValue:
                        mockCLSData.attribution.largestShiftValue,
                    largestShiftTime: mockCLSData.attribution.largestShiftTime,
                    loadState: mockCLSData.attribution.loadState
                }
            })
        );
        expect(record).not.toHaveBeenCalledWith(
            CLS_EVENT_TYPE,
            expect.anything()
        );
    });

    test('When web vitals are present with reportAllCLS=true then CLS is recorded with attribution as regular event', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin({
            reportAllCLS: true
        });

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(3);

        expect(record).toHaveBeenCalledWith(
            CLS_EVENT_TYPE,
            expect.objectContaining({
                version: '1.0.0',
                value: mockCLSData.value,
                attribution: {
                    largestShiftTarget:
                        mockCLSData.attribution.largestShiftTarget,
                    largestShiftValue:
                        mockCLSData.attribution.largestShiftValue,
                    largestShiftTime: mockCLSData.attribution.largestShiftTime,
                    loadState: mockCLSData.attribution.loadState
                }
            })
        );

        expect(recordCandidate).not.toHaveBeenCalledWith(
            CLS_EVENT_TYPE,
            expect.anything()
        );
    });

    test('Disable and enable does not have effect on the plugin behavior', async () => {
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        plugin.load(context);
        plugin.disable();
        plugin.enable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('Disable does not have effect on the plugin behavior', async () => {
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        plugin.load(context);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when lcp image resource has filetype=image then eventId is attributed to lcp', async () => {
        const plugin = new WebVitalsPlugin();

        plugin.load(context);
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    lcpResourceEntry: imageResourceRumEvent.id
                })
            })
        );
    });

    test('when no matching image resource does not exist then it is not attributed to lcp', async () => {
        // init
        const fileType = imageResourceRumEvent.details.fileType;
        delete imageResourceRumEvent.details.fileType;
        const plugin = new WebVitalsPlugin();

        // run
        plugin.load(context);

        // assert
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.not.objectContaining({
                    lcpResourceEntry: expect.anything()
                })
            })
        );

        // restore
        imageResourceRumEvent.details.fileType = fileType;
    });

    test('when lcp is recorded then cache is empty', async () => {
        const plugin = new WebVitalsPlugin();

        plugin.load(context);
        expect(record).toHaveBeenCalledWith(LCP_EVENT_TYPE, expect.anything());
        expect((plugin as any).resourceEventIds.size).toEqual(0);
        expect((plugin as any).navigationEventId).toBeUndefined();
    });

    test('when lcp is not supported then cache is empty', async () => {
        const plugin = new WebVitalsPlugin();
        (plugin as any).cacheLCPCandidates = false;

        plugin.load(context);
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.not.objectContaining({
                    lcpResourceEntry: expect.anything()
                })
            })
        );
        expect((plugin as any).resourceEventIds.size).toEqual(0);
        expect((plugin as any).navigationEventId).toBeUndefined();
    });

    test('when lcp is recorded then unsubscribe is called', async () => {
        // init
        const unsubscribeSpy = jest.spyOn(context.eventBus, 'unsubscribe');
        const plugin = new WebVitalsPlugin();
        const recordSpy = jest.spyOn(context, 'record');

        // run
        plugin.load(context);

        // assert
        expect(recordSpy).toHaveBeenCalled();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });

    test('when navigation is recorded then it is attributed to lcp', async () => {
        const plugin = new WebVitalsPlugin();

        plugin.load(context);
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    navigationEntry: navigationRumEvent.id
                })
            })
        );
    });

    test('when navigation is not recorded then it is not attributed to lcp', async () => {
        navigationRumEvent.type = 'invalid';
        const plugin = new WebVitalsPlugin();

        plugin.load(context);
        expect(record).not.toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    navigationEntry: expect.anything()
                })
            })
        );

        navigationEvent.type = PERFORMANCE_NAVIGATION_EVENT_TYPE;
    });

    test('When web vitals are present and reportAllINP=false then INP is cached as candidate with attribution', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        expect(recordCandidate).toHaveBeenCalledWith(
            INP_EVENT_TYPE,
            expect.objectContaining({
                version: '1.0.0',
                value: mockINPData.value,
                attribution: {
                    interactionTarget:
                        mockINPData.attribution.interactionTarget,
                    interactionTime: mockINPData.attribution.interactionTime,
                    nextPaintTime: mockINPData.attribution.nextPaintTime,
                    interactionType: mockINPData.attribution.interactionType,
                    inputDelay: mockINPData.attribution.inputDelay,
                    processingDuration:
                        mockINPData.attribution.processingDuration,
                    presentationDelay:
                        mockINPData.attribution.presentationDelay,
                    loadState: mockINPData.attribution.loadState
                }
            })
        );
        expect(record).not.toHaveBeenCalledWith(
            INP_EVENT_TYPE,
            expect.anything()
        );
    });

    test('When web vitals are present and reportAllINP=true then INP is recorded as event with attribution', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin({
            reportAllINP: true
        });

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(3);
        expect(record).toHaveBeenCalledWith(
            INP_EVENT_TYPE,
            expect.objectContaining({
                version: '1.0.0',
                value: mockINPData.value,
                attribution: {
                    interactionTarget:
                        mockINPData.attribution.interactionTarget,
                    interactionTime: mockINPData.attribution.interactionTime,
                    nextPaintTime: mockINPData.attribution.nextPaintTime,
                    interactionType: mockINPData.attribution.interactionType,
                    inputDelay: mockINPData.attribution.inputDelay,
                    processingDuration:
                        mockINPData.attribution.processingDuration,
                    presentationDelay:
                        mockINPData.attribution.presentationDelay,
                    loadState: mockINPData.attribution.loadState
                }
            })
        );
        expect(recordCandidate).not.toHaveBeenCalledWith(
            INP_EVENT_TYPE,
            expect.anything()
        );
    });

    test('When web vitals have null attribution then they handle gracefully', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const webVitals = require('web-vitals/attribution');

        // Test LCP with null attribution
        webVitals.onLCP.mockImplementationOnce((callback) => {
            callback({ ...mockLCPData, attribution: null });
        });

        // Test FID with null attribution
        webVitals.onFID.mockImplementationOnce((callback) => {
            callback({ ...mockFIDData, attribution: null });
        });

        // Test CLS with null attribution
        webVitals.onCLS.mockImplementationOnce((callback) => {
            callback({ ...mockCLSData, attribution: null });
        });

        // Test INP with null attribution
        webVitals.onINP.mockImplementationOnce((callback) => {
            callback({ ...mockINPData, attribution: null });
        });

        const plugin = new WebVitalsPlugin();
        plugin.load(context);

        // Verify LCP handles null attribution
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    element: undefined,
                    url: undefined,
                    timeToFirstByte: undefined,
                    resourceLoadDelay: undefined,
                    resourceLoadTime: undefined,
                    elementRenderDelay: undefined
                })
            })
        );

        // Verify FID handles null attribution
        expect(record).toHaveBeenCalledWith(
            FID_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    eventTarget: undefined,
                    eventType: undefined,
                    eventTime: undefined,
                    loadState: undefined
                })
            })
        );

        // Verify CLS handles null attribution
        expect(recordCandidate).toHaveBeenCalledWith(
            CLS_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    largestShiftTarget: undefined,
                    largestShiftValue: undefined,
                    largestShiftTime: undefined,
                    loadState: undefined
                })
            })
        );

        // Verify INP handles null attribution
        expect(recordCandidate).toHaveBeenCalledWith(
            INP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    interactionTarget: undefined,
                    interactionTime: undefined,
                    nextPaintTime: undefined,
                    interactionType: undefined,
                    inputDelay: undefined,
                    processingDuration: undefined,
                    presentationDelay: undefined,
                    loadState: undefined
                })
            })
        );
    });
});
