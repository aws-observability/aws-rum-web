import {
    resourceTiming,
    putRumEventsDocument,
    imageResourceEventA,
    imageResourceEventB,
    navigationEvent,
    doMockPerformanceObserver,
    cssResourceEvent,
    scriptResourceEvent
} from '../../../test-utils/mock-data';
import { ResourcePlugin } from '../ResourcePlugin';
import { mockRandom } from 'jest-mock-random';
import {
    context,
    DEFAULT_CONFIG,
    record
} from '../../../test-utils/test-utils';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../../utils/constant';
import { ResourceEvent } from '../../../events/resource-event';
import { PerformancePluginConfig } from 'plugins/utils/performance-utils';

const buildResourcePlugin = (config?: Partial<PerformancePluginConfig>) => {
    return new ResourcePlugin(config);
};

describe('ResourcePlugin tests', () => {
    beforeEach(() => {
        doMockPerformanceObserver([navigationEvent, resourceTiming]);
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

        // Assert
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                fileType: 'script',
                startTime: resourceTiming.startTime,
                duration: resourceTiming.duration,
                transferSize: resourceTiming.transferSize,
                targetUrl: resourceTiming.name,
                initiatorType: resourceTiming.initiatorType
            })
        );
    });

    test('when recordResourceUrl is false then the resource name is not recorded', async () => {
        // Setup
        mockRandom(0); // Retain order in shuffle

        const plugin: ResourcePlugin = buildResourcePlugin();
        const mockContext = Object.assign({}, context, {
            config: { ...DEFAULT_CONFIG, recordResourceUrl: false }
        });

        // Run
        plugin.load(mockContext);

        // Assert
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );
        expect(
            (record.mock.calls[0][1] as ResourceEvent).targetUrl
        ).toBeUndefined();
    });

    test('when resource is a PutRumEvents request then resource event is not recorded', async () => {
        // Setup
        doMockPerformanceObserver([putRumEventsDocument]);

        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when enabled then events are recorded', async () => {
        // Setup
        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        record.mockClear();
        plugin.disable();
        plugin.enable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when disabled then no events are recorded', async () => {
        // Setup
        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);
        record.mockClear();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when event limit is reached no more sampled resources are recorded', async () => {
        // Setup
        doMockPerformanceObserver([imageResourceEventA, imageResourceEventB]);

        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 1 });

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when event limit is reached prioritized resources are recorded', async () => {
        // Setup
        doMockPerformanceObserver([
            scriptResourceEvent,
            imageResourceEventA,
            cssResourceEvent
        ]);

        // Run
        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 1 });

        plugin.load(context);
        window.dispatchEvent(new Event('load'));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(3);
    });

    test('sampled events are randomized', async () => {
        // Setup
        doMockPerformanceObserver([imageResourceEventA, imageResourceEventB]);

        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 4 });

        // Run
        mockRandom(0.99); // Retain order in shuffle
        plugin.load(context);
        mockRandom(0); // Reverse order in shuffle
        plugin.load(context);

        // Assert
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                targetUrl: imageResourceEventB.name
            })
        );
        expect(record.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                targetUrl: imageResourceEventA.name
            })
        );
        expect(record.mock.calls[2][1]).toEqual(
            expect.objectContaining({
                targetUrl: imageResourceEventA.name
            })
        );
        expect(record.mock.calls[3][1]).toEqual(
            expect.objectContaining({
                targetUrl: imageResourceEventB.name
            })
        );
    });

    test('when entry is ignored then resource is not recorded', async () => {
        // Setup
        doMockPerformanceObserver([
            scriptResourceEvent,
            imageResourceEventA,
            cssResourceEvent
        ]);

        const plugin = buildResourcePlugin({
            ignore: (entry: PerformanceEntry) => true
        });

        // Run
        plugin.load(context);

        expect(record).not.toHaveBeenCalled();
    });

    test('when entry name is an invalid url then resource event is recorded', async () => {
        // setup
        const invalidEntry = {
            name: 'invalid.com',
            startTime: 0,
            duration: 10,
            entryType: 'resource'
        } as PerformanceEntry;
        doMockPerformanceObserver([invalidEntry]);

        // run
        const plugin = buildResourcePlugin();
        plugin.load(context);

        // assert
        expect(() => new URL(invalidEntry.name)).toThrowError();
        expect(() =>
            plugin.recordResourceEvent(
                invalidEntry as PerformanceResourceTiming
            )
        ).not.toThrowError();
        expect(record).toHaveBeenCalled();
    });
});
