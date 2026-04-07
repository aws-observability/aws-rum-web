import { QuietWindowSearch } from './QuietWindowSearch';
import { isFCPSupported, isLCPSupported } from '../utils/common-utils';
import { onFCP, onLCP, Metric } from 'web-vitals';

const NAVIGATION = 'navigation';
const FCP = 'FCP';
const LCP = 'LCP';

// Keep state for visually ready

export class VisuallyReadySearch {
    private fcpTime?: number;
    private lcpTime?: number;
    private domContentLoadedEventEnd?: number;
    private visuallyReadyTimestamp = 0;
    private quietWindowSearch: QuietWindowSearch;
    private timeIntervals = 0;
    private fcpSupported = false;
    private lcpSupported = false;
    private visualReadyInterval: NodeJS.Timeout;

    private cleanupVisuallyReadySearch = false;

    private CHECK_PERIOD = 1000; // Perform another check for Visually ready after this time period
    private VISUALLY_READY_RESOLVE_TIMEOUT = 10000; // Declare a timeout for visually ready search after this time period

    constructor(quietWindow: QuietWindowSearch) {
        this.initListeners();
        this.quietWindowSearch = quietWindow;
        this.visualReadyInterval = this.startVisualReadyInterval();
    }

    private startVisualReadyInterval(): NodeJS.Timeout {
        return setInterval(this.visualReadyIntervalHandler, this.CHECK_PERIOD);
    }

    private visualReadyIntervalHandler = () => {
        const isCheckTimedOut: boolean =
            this.timeIntervals * this.CHECK_PERIOD >
            this.VISUALLY_READY_RESOLVE_TIMEOUT;

        if (this.isOkToResolveVisuallyReady(isCheckTimedOut)) {
            this.visuallyReadyTimestamp = Math.max(
                this.fcpTime ? this.fcpTime : 0,
                this.lcpTime ? this.lcpTime : 0,
                this.domContentLoadedEventEnd
                    ? this.domContentLoadedEventEnd
                    : 0
            );
            clearInterval(this.visualReadyInterval);
            this.cleanupVisuallyReadySearch = true;
            this.quietWindowSearch.startTtiSearch(this.visuallyReadyTimestamp);
        } else {
            // No VR timestamps and check timed out, therefore stop searching and cleanup everything
            if (isCheckTimedOut) {
                this.cleanupVisuallyReadySearch = true;
                this.quietWindowSearch.cleanupQuietWindowSearch();
            }
        }
        this.timeIntervals += 1;
    };

    protected isOkToResolveVisuallyReady(isCheckTimedOut: boolean): boolean {
        /*
        Visually ready can be resolved in the following conditions: 
        1) Pre timeout, all supported visually ready markers are ready 
        2) Post timeout, atleast one visually ready marker is ready 

        If (1) or (2) are not met visually ready can't be resolved yet
        */

        const isFullyVisuallyReady =
            this.lcpTime !== undefined &&
            this.fcpTime !== undefined &&
            this.domContentLoadedEventEnd !== undefined;

        const isPartiallyVisually =
            (this.lcpSupported && this.lcpTime !== undefined) ||
            (this.fcpSupported && this.fcpTime !== undefined) ||
            this.domContentLoadedEventEnd !== undefined;

        if (isFullyVisuallyReady) {
            return true;
        } else if (isCheckTimedOut && isPartiallyVisually) {
            return true;
        } else {
            return false;
        }
    }

    private handleWebVitals(metric: Metric) {
        if (metric.name === FCP) {
            metric.entries.forEach(
                (entry) => (this.fcpTime = entry.startTime + entry.duration)
            );
        }
        if (metric.name === LCP) {
            metric.entries.forEach(
                (entry) => (this.lcpTime = entry.startTime + entry.duration)
            );
        }
    }

    private initListeners(): void {
        this.navEventListener();

        // Record support for FCP and LCP
        this.lcpSupported = isLCPSupported();
        this.fcpSupported = isFCPSupported();

        // Use web vitals library for LCP and FCP, if supported
        if (this.fcpSupported) {
            this.fcpTime = undefined;
            onFCP((metric) => this.handleWebVitals(metric));
        }
        if (this.lcpSupported) {
            this.lcpTime = undefined;
            onLCP((metric) => this.handleWebVitals(metric));
        }
    }

    navEventListener = () => {
        const eventObserver: PerformanceObserver = new PerformanceObserver(
            (list) => {
                if (this.cleanupVisuallyReadySearch) {
                    eventObserver.disconnect();
                }
                list.getEntries()
                    .filter((e) => e.entryType === NAVIGATION)
                    .map((e) => e as PerformanceNavigationTiming)
                    .forEach((event) => {
                        if (event.domContentLoadedEventEnd) {
                            this.domContentLoadedEventEnd =
                                event.domContentLoadedEventEnd;
                        }
                    });
            }
        );
        eventObserver.observe({
            type: NAVIGATION,
            buffered: true
        });
    };
}
