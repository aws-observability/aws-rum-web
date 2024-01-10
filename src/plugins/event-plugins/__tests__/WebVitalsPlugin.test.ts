jest.mock('../../../utils/common-utils', () => {
    const originalModule = jest.requireActual('../../../utils/common-utils');
    return {
        __esModule: true,
        ...originalModule,
        isLCPSupported: jest.fn().mockReturnValue(true)
    };
});

import {
    CLS_EVENT_TYPE,
    FID_EVENT_TYPE,
    LCP_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE
} from '../../../plugins/utils/constant';
import { context, record } from '../../../test-utils/test-utils';
import { Topic } from '../../../event-bus/EventBus';
import { WebVitalsPlugin } from '../WebVitalsPlugin';
import { navigationEvent } from '../../../test-utils/mock-data';
import { ResourceEvent } from '../../../events/resource-event';
import { ParsedRumEvent } from 'dispatch/dataplane';
import { ResourceType } from '../../../utils/common-utils';

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
        resourceLoadTime: 1000,
        elementRenderDelay: 250
    }
};

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
};

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
};

// only need hasLatency fields
const mockImagePerformanceEntry = {
    name: 'https://www.example.com/image.png',
    duration: 50,
    startTime: 100
} as PerformanceEntry;

const mockImageResourceTimingEvent = {
    version: '2.0.0',
    ...mockImagePerformanceEntry
} as ResourceEvent;

const mockImageRumEvent: ParsedRumEvent = {
    id: 'img-id',
    type: PERFORMANCE_RESOURCE_EVENT_TYPE,
    timestamp: new Date(),
    details: {
        ...mockImageResourceTimingEvent
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
        lcpResourceEntry: mockImagePerformanceEntry
    }
});

jest.mock('web-vitals/attribution', () => {
    return {
        onLCP: jest.fn().mockImplementation((callback) => {
            context.eventBus.dispatch(Topic.EVENT, mockImageRumEvent, {
                name: mockImagePerformanceEntry.name,
                fileType: ResourceType.IMAGE
            });
            context.eventBus.dispatch(Topic.EVENT, navigationRumEvent);
            callback(mockLCPDataWithImage);
        }),
        onFID: jest
            .fn()
            .mockImplementation((callback) => callback(mockFIDData)),
        onCLS: jest.fn().mockImplementation((callback) => callback(mockCLSData))
    };
});

describe('WebVitalsPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
    });

    test('When web vitals are present then LCP is recorded with attributions', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(3);

        expect(record.mock.calls[0][0]).toEqual(LCP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                value: mockLCPData.value,
                attribution: expect.objectContaining({
                    element: mockLCPData.attribution.element,
                    url: mockLCPData.attribution.url,
                    timeToFirstByte: mockLCPData.attribution.timeToFirstByte,
                    resourceLoadDelay:
                        mockLCPData.attribution.resourceLoadDelay,
                    resourceLoadTime: mockLCPData.attribution.resourceLoadTime,
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
        expect(record).toHaveBeenCalledTimes(3);

        expect(record.mock.calls[1][0]).toEqual(FID_EVENT_TYPE);
        expect(record.mock.calls[1][1]).toEqual(
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

    test('When web vitals are present then CLS is recorded with attribution', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(3);

        expect(record.mock.calls[2][0]).toEqual(CLS_EVENT_TYPE);
        expect(record.mock.calls[2][1]).toEqual(
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

    test('when lcp image resource is an image then eventId is attributed to lcp', async () => {
        const plugin = new WebVitalsPlugin();

        plugin.load(context);
        expect(record).toHaveBeenCalledWith(
            LCP_EVENT_TYPE,
            expect.objectContaining({
                attribution: expect.objectContaining({
                    lcpResourceEntry: mockImageRumEvent.id
                })
            })
        );
    });

    test('when no matching image resource exists then it is not attributed to lcp', async () => {
        // init
        const event = mockImageRumEvent.details as ResourceEvent;
        const startTime = event.startTime;
        event.startTime = -500; // no match
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
        event.startTime = startTime;
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
});
