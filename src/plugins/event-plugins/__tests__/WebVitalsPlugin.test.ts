import { WebVitalsPlugin } from '../WebVitalsPlugin';
import { context, record } from '../../../test-utils/test-utils';
import {
    CLS_EVENT_TYPE,
    FID_EVENT_TYPE,
    LCP_EVENT_TYPE
} from '../../utils/constant';

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

jest.mock('web-vitals/attribution', () => {
    return {
        onLCP: jest
            .fn()
            .mockImplementation((callback) => callback(mockLCPData)),
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
        window.dispatchEvent(new Event('load'));

        // Assert
        expect(record).toHaveBeenCalledTimes(3);

        expect(record.mock.calls[0][0]).toEqual(LCP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                value: mockLCPData.value,
                attribution: {
                    element: mockLCPData.attribution.element,
                    url: mockLCPData.attribution.url,
                    timeToFirstByte: mockLCPData.attribution.timeToFirstByte,
                    resourceLoadDelay:
                        mockLCPData.attribution.resourceLoadDelay,
                    resourceLoadTime: mockLCPData.attribution.resourceLoadTime,
                    elementRenderDelay:
                        mockLCPData.attribution.elementRenderDelay
                }
            })
        );
    });

    test('When web vitals are present then FID is recorded with attribution', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));

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
        window.dispatchEvent(new Event('load'));

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
        window.dispatchEvent(new Event('load'));

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('Disable does not have effect on the plugin behavior', async () => {
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        plugin.load(context);
        plugin.disable();
        window.dispatchEvent(new Event('load'));

        // Assert
        expect(record).toHaveBeenCalled();
    });
});
