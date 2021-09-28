import {
    navigationEvent,
    performanceEvent,
    mockPerformanceObserver,
    mockPerformanceObject,
    MockPerformanceTiming
} from '../../../test-utils/mock-data';
import { NavigationPlugin } from '../NavigationPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../utils/constant';

const buildNavigationPlugin = () => {
    return new NavigationPlugin();
};

describe('NavigationPlugin tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('When navigation event is present then event is recorded', async () => {
        const plugin: NavigationPlugin = buildNavigationPlugin();
        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                targetUrl: navigationEvent.name,
                duration: navigationEvent.duration,
                startTime: navigationEvent.startTime,
                navigationType: navigationEvent.type
            })
        );
    });

    test('When navigation timing level 2 API is not present then navigation timing level 1 API is recorded', async () => {
        jest.useFakeTimers();
        // @ts-ignore
        mockPerformanceObject();
        mockPerformanceObserver();

        const plugin: NavigationPlugin = buildNavigationPlugin();

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        jest.runAllTimers();

        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );

        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                domComplete:
                    MockPerformanceTiming.domComplete -
                    MockPerformanceTiming.navigationStart,
                responseStart:
                    MockPerformanceTiming.responseStart -
                    MockPerformanceTiming.navigationStart,
                initiatorType: 'navigation',
                redirectStart: MockPerformanceTiming.redirectStart,
                navigationTimingLevel: 1
            })
        );
    });

    test('when enabled then events are recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when disabled then no events are recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        // adds eventListener on load event
        plugin.load(context);
        plugin.disable();
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });
});
