import {
    scriptResourceEvent,
    imageResourceEvent,
    cssResourceEvent,
    performanceEvent,
    mockPerformanceObserver,
    mockPerformanceObject,
    mockPerformanceObjectWithResources,
    resourceEvent
} from '../../../test-utils/mock-data';
import { PartialResourcePluginConfig, ResourcePlugin } from '../ResourcePlugin';
import { mockRandom } from 'jest-mock-random';
import {
    context,
    DEFAULT_CONFIG,
    getSession,
    record,
    recordPageView
} from '../../../test-utils/test-utils';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../../utils/constant';
import { ResourceEvent } from '../../../events/resource-event';
import { PluginContext } from '../../types';

const buildResourcePlugin = (config?: PartialResourcePluginConfig) => {
    return new ResourcePlugin(config);
};

describe('ResourcePlugin tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
        record.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('When resource event is present then event is recorded', async () => {
        // Setup
        mockRandom(0); // Retain order in shuffle

        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                fileType: resourceEvent.fileType,
                duration: resourceEvent.duration,
                transferSize: resourceEvent.transferSize,
                targetUrl: resourceEvent.name,
                initiatorType: resourceEvent.initiatorType
            })
        );
    });

    test('when recordResourceUrl is false then the resource name is not recorded', async () => {
        // Setup
        mockRandom(0); // Retain order in shuffle
        const context: PluginContext = {
            applicationId: 'b',
            applicationVersion: '1.0',
            config: { ...DEFAULT_CONFIG, recordResourceUrl: false },
            record,
            recordPageView,
            getSession
        };
        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );
        expect(
            (record.mock.calls[0][1] as ResourceEvent).targetUrl
        ).toBeUndefined();
    });

    test('when resource is from data plane endpoint then resource event is not recorded', async () => {
        // Setup
        mockPerformanceObject();
        mockPerformanceObserver();

        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when enabled then events are recorded', async () => {
        // Setup
        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        plugin.disable();
        plugin.enable();
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when disabled then no events are recorded', async () => {
        // Setup
        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        plugin.disable();
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when event limit is reached no more events are recorded', async () => {
        // Setup
        mockPerformanceObjectWithResources();
        mockPerformanceObserver();

        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 1 });

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when resources > eventLimit then recordAll events are prioritized', async () => {
        // Setup
        mockRandom(0); // Reverse order in shuffle
        mockPerformanceObjectWithResources();
        mockPerformanceObserver();

        // Run
        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 1 });

        plugin.load(context);
        window.dispatchEvent(new Event('load'));

        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                fileType: scriptResourceEvent.fileType
            })
        );
    });

    test('sampled events are randomized', async () => {
        // Setup
        mockPerformanceObjectWithResources();
        mockPerformanceObserver();

        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 3 });

        // Run
        plugin.load(context);

        mockRandom(0.99); // Retain order in shuffle
        window.dispatchEvent(new Event('load'));
        mockRandom(0); // Reverse order in shuffle
        window.dispatchEvent(new Event('load'));

        plugin.disable();

        // Assert
        expect(record.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                fileType: cssResourceEvent.fileType
            })
        );
        expect(record.mock.calls[2][1]).toEqual(
            expect.objectContaining({
                fileType: imageResourceEvent.fileType
            })
        );
        expect(record.mock.calls[4][1]).toEqual(
            expect.objectContaining({
                fileType: imageResourceEvent.fileType
            })
        );
        expect(record.mock.calls[5][1]).toEqual(
            expect.objectContaining({
                fileType: cssResourceEvent.fileType
            })
        );
    });
});
