import {
    scriptResourceEvent,
    imageResourceEvent,
    cssResourceEvent,
    performanceEvent,
    mockPerformanceObserver,
    mockPerformanceObjectWithResources,
    resourceEvent,
    mockPerformanceObjectWith,
    putRumEventsDocument,
    putRumEventsGammaDocument,
    dataPlaneDocument
} from '../../../test-utils/mock-data';
import { ResourcePlugin } from '../ResourcePlugin';
import { mockRandom, resetMockRandom } from 'jest-mock-random';
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
import { getResourceFileType } from '../../../utils/common-utils';

describe('ResourcePlugin tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
        record.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
        resetMockRandom();
    });

    test('When resource event is present then event is recorded', async () => {
        // Setup
        mockRandom(0); // Retain order in shuffle

        const plugin = new ResourcePlugin();

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
        const plugin: ResourcePlugin = new ResourcePlugin();

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

    test('when resource is a PutRumEvents request then resource event is not recorded', async () => {
        // Setup
        mockPerformanceObjectWith([putRumEventsDocument], [], []);
        mockPerformanceObserver();

        const plugin: ResourcePlugin = new ResourcePlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when resource is a PutRumEvents request with a path prefix then resource event is not recorded', async () => {
        // Setup
        mockPerformanceObjectWith([putRumEventsGammaDocument], [], []);
        mockPerformanceObserver();

        const plugin: ResourcePlugin = new ResourcePlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when resource is not a PutRumEvents request but has the same host then the resource event is recorded', async () => {
        // Setup
        mockPerformanceObjectWith([dataPlaneDocument], [], []);
        mockPerformanceObserver();

        const plugin: ResourcePlugin = new ResourcePlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when enabled then events are recorded', async () => {
        // Setup
        const plugin: ResourcePlugin = new ResourcePlugin();

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
        const plugin: ResourcePlugin = new ResourcePlugin();

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

        const plugin: ResourcePlugin = new ResourcePlugin({ eventLimit: 1 });

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
        const plugin: ResourcePlugin = new ResourcePlugin({ eventLimit: 1 });

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

        const plugin: ResourcePlugin = new ResourcePlugin({ eventLimit: 3 });

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

    test('when ignore() is customized then specific events are not recorded', async () => {
        // Setup
        mockPerformanceObjectWithResources();
        mockPerformanceObserver();
        const plugin = new ResourcePlugin({
            ignore: (entry) => getResourceFileType(entry.name) === 'image'
        });

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        const calls = record.mock.calls;
        expect(calls).toHaveLength(2);
        for (const [, event] of calls) {
            expect((event as ResourceEvent).initiatorType).not.toEqual('image');
        }
    });
});
