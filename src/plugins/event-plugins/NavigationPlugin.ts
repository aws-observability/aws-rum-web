import { InternalPlugin } from '../InternalPlugin';
import { NavigationEvent } from '../../events/navigation-event';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../utils/constant';

export const NAVIGATION_EVENT_PLUGIN_ID = 'navigation';

const NAVIGATION = 'navigation';
const LOAD = 'load';

/**
 * This plugin records performance timing events generated during every page load/re-load activity.
 * Paint, resource and performance event types make sense only if all or none are included.
 * For RUM, these event types are inter-dependent. So they are recorded under one plugin.
 */
export class NavigationPlugin extends InternalPlugin {
    constructor() {
        super(NAVIGATION_EVENT_PLUGIN_ID);
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        window.addEventListener(LOAD, this.eventListener);
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        if (this.eventListener) {
            window.removeEventListener(LOAD, this.eventListener);
        }
    }

    /**
     * Use the loadEventEnd field from window.performance to check if the website
     * has loaded already.
     *
     * @returns boolean
     */
    hasTheWindowLoadEventFired() {
        if (
            window.performance &&
            window.performance.getEntriesByType(NAVIGATION).length
        ) {
            const navData = window.performance.getEntriesByType(
                NAVIGATION
            )[0] as PerformanceNavigationTiming;
            return Boolean(navData.loadEventEnd);
        }
        return false;
    }

    /**
     * Use Navigation timing Level 1 for all browsers by default -
     * https://developer.mozilla.org/en-US/docs/Web/API/Performance/timing
     *
     * If browser provides support, use Navigation Timing Level 2 specification -
     * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
     *
     * Only the current document resource is included in the performance timeline;
     * there is only one PerformanceNavigationTiming object in the performance timeline.
     * https://www.w3.org/TR/navigation-timing-2/
     */
    eventListener = () => {
        if (performance.getEntriesByType(NAVIGATION).length === 0) {
            this.performanceNavigationEventHandlerTimingLevel1();
        } else {
            const navigationObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((event) => {
                    if (event.entryType === NAVIGATION) {
                        this.performanceNavigationEventHandlerTimingLevel2(
                            event
                        );
                    }
                });
            });
            navigationObserver.observe({
                entryTypes: [NAVIGATION]
            });
        }
    };

    /**
     * W3C specification: https://www.w3.org/TR/navigation-timing/#sec-navigation-timing-interface
     */
    performanceNavigationEventHandlerTimingLevel1 = () => {
        const recordNavigation = () => {
            const entryData = performance.timing;
            const origin = entryData.navigationStart;
            const eventDataNavigationTimingLevel1: NavigationEvent = {
                version: '1.0.0',
                initiatorType: 'navigation',
                startTime: 0,
                unloadEventStart:
                    entryData.unloadEventStart > 0
                        ? entryData.unloadEventStart - origin
                        : 0,
                promptForUnload:
                    entryData.unloadEventEnd - entryData.unloadEventStart,
                redirectStart:
                    entryData.redirectStart > 0
                        ? entryData.redirectStart - origin
                        : 0,
                redirectTime: entryData.redirectEnd - entryData.redirectStart,
                fetchStart:
                    entryData.fetchStart > 0
                        ? entryData.fetchStart - origin
                        : 0,
                domainLookupStart:
                    entryData.domainLookupStart > 0
                        ? entryData.domainLookupStart - origin
                        : 0,
                dns: entryData.domainLookupEnd - entryData.domainLookupStart,
                connectStart:
                    entryData.connectStart > 0
                        ? entryData.connectStart - origin
                        : 0,
                connect: entryData.connectEnd - entryData.connectStart,
                secureConnectionStart:
                    entryData.secureConnectionStart > 0
                        ? entryData.secureConnectionStart - origin
                        : 0,
                tlsTime:
                    entryData.secureConnectionStart > 0
                        ? entryData.connectEnd - entryData.secureConnectionStart
                        : 0,

                requestStart:
                    entryData.requestStart > 0
                        ? entryData.requestStart - origin
                        : 0,
                timeToFirstByte:
                    entryData.responseStart - entryData.requestStart,
                responseStart:
                    entryData.responseStart > 0
                        ? entryData.responseStart - origin
                        : 0,
                responseTime:
                    entryData.responseStart > 0
                        ? entryData.responseEnd - entryData.responseStart
                        : 0,

                domInteractive:
                    entryData.domInteractive > 0
                        ? entryData.domInteractive - origin
                        : 0,
                domContentLoadedEventStart:
                    entryData.domContentLoadedEventStart > 0
                        ? entryData.domContentLoadedEventStart - origin
                        : 0,
                domContentLoaded:
                    entryData.domContentLoadedEventEnd -
                    entryData.domContentLoadedEventStart,
                domComplete:
                    entryData.domComplete > 0
                        ? entryData.domComplete - origin
                        : 0,
                domProcessingTime:
                    entryData.loadEventStart - entryData.responseEnd,
                loadEventStart:
                    entryData.loadEventStart > 0
                        ? entryData.loadEventStart - origin
                        : 0,
                loadEventTime:
                    entryData.loadEventEnd - entryData.loadEventStart,
                duration: entryData.loadEventEnd - entryData.navigationStart,
                navigationTimingLevel: 1
            };
            if (this.context?.record) {
                this.context.record(
                    PERFORMANCE_NAVIGATION_EVENT_TYPE,
                    eventDataNavigationTimingLevel1
                );
            }
        };
        // Timeout is required for loadEventEnd to complete
        setTimeout(recordNavigation, 0);
    };

    /**
     * W3C specification: https://www.w3.org/TR/navigation-timing-2/#bib-navigation-timing
     */
    performanceNavigationEventHandlerTimingLevel2 = (entryData: any): void => {
        const eventDataNavigationTimingLevel2: NavigationEvent = {
            version: '1.0.0',
            initiatorType: entryData.initiatorType,
            navigationType: entryData.type,
            startTime: entryData.startTime,
            unloadEventStart: entryData.unloadEventStart,
            promptForUnload:
                entryData.unloadEventEnd - entryData.unloadEventStart,
            redirectCount: entryData.redirectCount,
            redirectStart: entryData.redirectStart,
            redirectTime: entryData.redirectEnd - entryData.redirectStart,

            workerStart: entryData.workerStart,
            workerTime:
                entryData.workerStart > 0
                    ? entryData.fetchStart - entryData.workerStart
                    : 0,

            fetchStart: entryData.fetchStart,
            domainLookupStart: entryData.domainLookupStart,
            dns: entryData.domainLookupEnd - entryData.domainLookupStart,

            nextHopProtocol: entryData.nextHopProtocol,
            connectStart: entryData.connectStart,
            connect: entryData.connectEnd - entryData.connectStart,
            secureConnectionStart: entryData.secureConnectionStart,
            tlsTime:
                entryData.secureConnectionStart > 0
                    ? entryData.connectEnd - entryData.secureConnectionStart
                    : 0,

            requestStart: entryData.requestStart,
            timeToFirstByte: entryData.responseStart - entryData.requestStart,
            responseStart: entryData.responseStart,
            responseTime:
                entryData.responseStart > 0
                    ? entryData.responseEnd - entryData.responseStart
                    : 0,

            domInteractive: entryData.domInteractive,
            domContentLoadedEventStart: entryData.domContentLoadedEventStart,
            domContentLoaded:
                entryData.domContentLoadedEventEnd -
                entryData.domContentLoadedEventStart,
            domComplete: entryData.domComplete,
            domProcessingTime: entryData.loadEventStart - entryData.responseEnd,
            loadEventStart: entryData.loadEventStart,
            loadEventTime: entryData.loadEventEnd - entryData.loadEventStart,

            duration: entryData.duration,

            headerSize: entryData.transferSize - entryData.encodedBodySize,
            transferSize: entryData.transferSize,
            compressionRatio:
                entryData.encodedBodySize > 0
                    ? entryData.decodedBodySize / entryData.encodedBodySize
                    : 0,
            navigationTimingLevel: 2
        };

        if (this.context?.record) {
            this.context.record(
                PERFORMANCE_NAVIGATION_EVENT_TYPE,
                eventDataNavigationTimingLevel2
            );
        }
    };

    /**
     * loadEventEnd is populated as 0 if the web page has not loaded completely, even though LOAD has been fired.
     * As a result, if loadEventEnd is populated, we can ignore eventListener and record the data directly.
     * On the other hand, if not, we have to use eventListener to initializes PerformanceObserver.
     * PerformanceObserver will act as a second check for the final load timings.
     */
    protected onload(): void {
        if (this.enabled) {
            if (this.hasTheWindowLoadEventFired()) {
                const navData = window.performance.getEntriesByType(
                    NAVIGATION
                )[0] as PerformanceNavigationTiming;
                this.performanceNavigationEventHandlerTimingLevel2(navData);
            } else {
                window.addEventListener(LOAD, this.eventListener);
            }
        }
    }
}
