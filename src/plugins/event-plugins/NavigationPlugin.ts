import { InternalPlugin } from '../InternalPlugin';
import { PerformanceNavigationTimingEvent } from '../../events/performance-navigation-timing';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../utils/constant';
import {
    PartialPerformancePluginConfig,
    PerformancePluginConfig,
    defaultPerformancePluginConfig
} from '../utils/performance-utils';
import { isNavigationSupported } from '../../utils/common-utils';

export const NAVIGATION_EVENT_PLUGIN_ID = 'navigation';
const NAVIGATION = 'navigation';

/** This plugin records performance timing events generated during every page load/re-load activity. */
export class NavigationPlugin extends InternalPlugin {
    private config: PerformancePluginConfig;
    private po?: PerformanceObserver;

    constructor(config?: PartialPerformancePluginConfig) {
        super(NAVIGATION_EVENT_PLUGIN_ID);
        this.config = { ...defaultPerformancePluginConfig, ...config };
        this.po = isNavigationSupported()
            ? new PerformanceObserver(this.performanceEntryHandler)
            : undefined;
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        this.observe();
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.po?.disconnect();
    }

    /**
     * Callback to record PerformanceNavigationTiming as RUM PerformanceNavigationTimingEvent
     * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
     */
    performanceEntryHandler: PerformanceObserverCallback = (
        list: PerformanceObserverEntryList
    ) => {
        list.getEntries().forEach((entry) => {
            if (!this.enabled || this.config.ignore(entry)) {
                return;
            }

            // Record
            const e = entry as PerformanceNavigationTiming;
            this.context?.record(PERFORMANCE_NAVIGATION_EVENT_TYPE, {
                name: this.context.config.recordResourceUrl
                    ? e.name
                    : undefined,
                entryType: NAVIGATION,
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
            } as PerformanceNavigationTimingEvent);

            // Teardown
            this.po?.disconnect();
        });
    };

    private observe() {
        this.po?.observe({
            type: NAVIGATION,
            buffered: true
        });
    }

    protected onload(): void {
        this.observe();
    }
}
