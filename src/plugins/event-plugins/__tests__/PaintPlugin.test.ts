import {
    firstPaintEvent,
    performanceEvent,
    mockPaintPerformanceObject,
    mockPaintPerformanceObserver
} from '../../../test-utils/mock-data';
import { PaintPlugin } from '../PaintPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { PERFORMANCE_FIRST_PAINT_EVENT_TYPE } from '../../utils/constant';

const DATA_PLANE_URL = 'https://dataplane.us-west-2.beta.rum.aws.dev';

const buildPaintPlugin = () => {
    return new PaintPlugin(DATA_PLANE_URL);
};

describe('PaintPlugin tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('When paint event is present then event is recorded', async () => {
        const plugin: PaintPlugin = buildPaintPlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_FIRST_PAINT_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                duration: firstPaintEvent.duration,
                startTime: firstPaintEvent.startTime
            })
        );
    });

    test('When first paint event is not present then event is derived from resource events', async () => {
        mockPaintPerformanceObject();
        mockPaintPerformanceObserver();

        const plugin: PaintPlugin = buildPaintPlugin();

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_FIRST_PAINT_EVENT_TYPE
        );
    });

    test('when enabled then events are recorded', async () => {
        const plugin: PaintPlugin = buildPaintPlugin();

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when disabled then no events are recorded', async () => {
        const plugin: PaintPlugin = buildPaintPlugin();

        plugin.load(context);
        plugin.disable();
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });
});
