let isNavigationSupported = true;
jest.mock('../../../utils/common-utils', () => {
    const originalModule = jest.requireActual('../../../utils/common-utils');
    return {
        __esModule: true,
        ...originalModule,
        isNavigationSupported: jest
            .fn()
            .mockImplementation(() => isNavigationSupported)
    };
});

import {
    navigationEvent,
    performanceEvent,
    performanceEventNotLoaded
} from '../../../test-utils/mock-data';
import { NavigationPlugin } from '../NavigationPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../utils/constant';
import { PartialPerformancePluginConfig } from 'plugins/utils/performance-utils';

const buildNavigationPlugin = (config?: PartialPerformancePluginConfig) => {
    return new NavigationPlugin(config);
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

        const e = navigationEvent;

        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                name: e.name,
                entryType: 'navigation',
                startTime: e.startTime,
                duration: e.duration,
                initiatorType: e.initiatorType,
                nextHopProtocol: e.nextHopProtocol,
                workerStart: e.workerStart,
                redirectStart: e.redirectStart,
                redirectEnd: e.redirectEnd,
                fetchStart: e.fetchStart,
                domainLookupStart: e.domainLookupStart,
                domainLookupEnd: e.domainLookupEnd,
                connectStart: e.connectStart,
                connectEnd: e.connectEnd,
                secureConnectionStart: e.secureConnectionStart,
                requestStart: e.requestStart,
                responseStart: e.responseStart,
                responseEnd: e.responseEnd,
                transferSize: e.transferSize,
                encodedBodySize: e.encodedBodySize,
                decodedBodySize: e.decodedBodySize,
                domComplete: e.domComplete,
                domContentLoadedEventEnd: e.domContentLoadedEventEnd,
                domContentLoadedEventStart: e.domContentLoadedEventStart,
                domInteractive: e.domInteractive,
                loadEventEnd: e.loadEventEnd,
                loadEventStart: e.loadEventStart,
                redirectCount: e.redirectCount,
                type: e.type,
                unloadEventEnd: e.unloadEventEnd,
                unloadEventStart: e.unloadEventStart
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

        // window has already loaded, so it will fire when we load.
        // thus disabling the plugin before we load
        plugin.disable();
        plugin.load(context);

        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });
    test('when entry is ignored then navigation is not recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin({
            ignore: (event) => true
        });

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when window.load fires after plugin loads then navigation timing is recorded', async () => {
        // Setting up new mocked window that has not loaded
        (window as any).performance = performanceEventNotLoaded.performance();

        // run
        const plugin: NavigationPlugin = buildNavigationPlugin();
        plugin.load(context);
        window.dispatchEvent(new Event('load'));

        // assert
        expect(record).toHaveBeenCalledWith(
            PERFORMANCE_NAVIGATION_EVENT_TYPE,
            expect.anything()
        );
    });

    test('when window.load fires before plugin loads then navigation timing is recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        // window by default has already loaded before the plugin
        // so when we load the plugin now, it should still record event
        plugin.load(context);
        // Assert
        expect(record).toHaveBeenCalledWith(
            PERFORMANCE_NAVIGATION_EVENT_TYPE,
            expect.anything()
        );
    });

    test('when PerformanceNavigationTiming is not supported, then the NavigationPlugin does not initialize an observer', async () => {
        // init
        isNavigationSupported = false;
        // jest.mock('../NavigationPlugin');

        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        // window by default has already loaded before the plugin
        // so when we load the plugin now, it should still record event
        plugin.load(context);
        // Assert
        expect((plugin as any).po).toBeUndefined();

        // restore
        isNavigationSupported = true;
    });
});
