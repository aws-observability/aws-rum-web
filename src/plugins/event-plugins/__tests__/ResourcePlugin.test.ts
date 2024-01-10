import {
    resourceTiming,
    putRumEventsDocument,
    putRumEventsGammaDocument,
    dataPlaneDocument,
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
import { PartialPerformancePluginConfig } from 'plugins/utils/performance-utils';
import { ResourceEvent } from '../../../events/resource-event';

const buildResourcePlugin = (config?: PartialPerformancePluginConfig) => {
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
        expect(record.mock.calls[1][0]).toEqual(
            PERFORMANCE_RESOURCE_EVENT_TYPE
        );
        const r = resourceTiming;
        expect(record.mock.calls[1][1] as ResourceEvent).toEqual(
            expect.objectContaining({
                name: r.name,
                entryType: 'resource',
                startTime: r.startTime,
                duration: r.duration,
                connectStart: r.connectStart,
                connectEnd: r.connectEnd,
                decodedBodySize: r.decodedBodySize,
                domainLookupEnd: r.domainLookupEnd,
                domainLookupStart: r.domainLookupStart,
                fetchStart: r.fetchStart,
                encodedBodySize: r.encodedBodySize,
                initiatorType: r.initiatorType,
                nextHopProtocol: r.nextHopProtocol,
                redirectEnd: r.redirectEnd,
                redirectStart: r.redirectStart,
                renderBlockingStatus: r.renderBlockingStatus,
                requestStart: r.requestStart,
                responseEnd: r.responseEnd,
                responseStart: r.responseStart,
                secureConnectionStart: r.secureConnectionStart,
                serverTiming: r.serverTiming,
                transferSize: r.transferSize,
                workerStart: r.workerStart
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
        expect((record.mock.calls[0][1] as ResourceEvent).name).toBeUndefined();
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

    test('when resource is a PutRumEvents request with a path prefix then resource event is not recorded', async () => {
        // Setup
        doMockPerformanceObserver([putRumEventsGammaDocument]);

        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when resource is not a PutRumEvents request but has the same host then the resource event is recorded', async () => {
        // Setup
        doMockPerformanceObserver([dataPlaneDocument]);

        const plugin: ResourcePlugin = buildResourcePlugin();

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalled();
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

    test('sampled events are first N', async () => {
        // Setup
        const images = [];
        for (let i = 0; i < 5; i++) {
            images.push({
                ...imageResourceEventA,
                name: `http://localhost:9000/picture-${i}.jpg`
            });
        }
        doMockPerformanceObserver(images);

        const plugin: ResourcePlugin = buildResourcePlugin({ eventLimit: 3 });

        // Run
        plugin.load(context);

        // Assert
        expect(record).toHaveBeenCalledTimes(3);
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                name: `http://localhost:9000/picture-0.jpg`
            })
        );
        expect(record.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                name: `http://localhost:9000/picture-1.jpg`
            })
        );
        expect(record.mock.calls[2][1]).toEqual(
            expect.objectContaining({
                name: `http://localhost:9000/picture-2.jpg`
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
});
