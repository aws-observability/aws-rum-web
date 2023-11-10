/* eslint-disable jsdoc/check-indentation */
import {
    isFCPSupported,
    isLCPSupported,
    isLongTaskSupported
} from '../utils/common-utils';
import { onFCP, onLCP, Metric } from 'web-vitals';

const LONG_TASK = 'longtask';
const FPS = 'fps';
const NAVIGATION = 'navigation';
const FCP = 'FCP';
const LCP = 'LCP';

export interface TTIMetric {
    name: 'TTI';
    value: number;
}

export interface TTIReportOpts {
    /**
     * Enabling frames per second (FPS) tracking (@code{fpsEnabled: true}) may
     * provide more accurate TTI, while incurring a small performance impact to
     * the application.
     *
     * We expect that in most cases using FPS tracking is unnecessary. A period
     * with no long tasks (which ARE tracked) will typically have a high FPS.
     */
    fpsEnabled: boolean;
}

export type TTIReportCallback = (
    metric: TTIMetric,
    opts?: TTIReportOpts
) => void;

export function onTTI(onReport: TTIReportCallback, opts: TTIReportOpts) {
    if (isLongTaskSupported()) {
        new TimeToInteractive(onReport, opts);
    }
}

/**
 * This class measures the "time to interactive" web vital. Time to interactive
 * is a measure of how long it takes for a page to become interactive for the
 * user.
 * <p>
 * This class implements the TTI algorithm used by Boomerang, with modifications.
 * (Ref: https://akamai.github.io/boomerang/oss/BOOMR.plugins.Continuity.html)
 * <p>
 * Steps to TTI calculation:
 * 1) Find visually ready timestamp (highest of domcontentLoadedEnd, FCP or LCP).
 * 2) Starting from the visually ready timestamp, find a 500ms quiet window. A
 *    quiet window has the following characteristics:
 *      a) No Long Tasks
 *      b) FPS is above 20 (if enabled)
 * 3) TTI is recorded as visually ready timestamp + time from visually ready to the start of the quiet window.
 * <p>
 * This class measures TTI only when running in a browser that supports Long Tasks.
 */
class TimeToInteractive {
    private onReport: TTIReportCallback;

    private fcpTime?: number;
    private lcpTime?: number;
    private domContentLoadedEventEnd?: number;
    private visuallyReadyTimestamp = 0;
    private timeIntervals = 0;
    private visualReadyInterval: NodeJS.Timeout;
    private ttiTracker: any = {};
    private ttiResolved = false;

    private ttiInterval!: NodeJS.Timeout;
    private startBucket = 0;
    private currBucket = 0;
    private acceptedIntervals = 0;
    private totalIntervals = 0;

    private fcpSupported = false;
    private lcpSupported = false;
    private fpsEnabled = false;

    private COLLECTION_PERIOD = 100;
    private REQUIRED_ACCEPTED_INTERVALS = 5;
    private CHECK_PERIOD = 1000; // Perform another check for TTI/Visually ready
    private VISUALLY_READY_RESOLVE_TIMEOUT = 10000;
    private TTI_RESOLVE_TIMEOUT = 10000;

    private FPS_THRESHOLD = 20 / (1000 / this.COLLECTION_PERIOD);
    private LONG_TASK_THRESHOLD = 0;

    constructor(onReport: TTIReportCallback, opts: TTIReportOpts) {
        this.onReport = onReport;
        this.fpsEnabled = opts.fpsEnabled;
        this.initListeners();
        this.visualReadyInterval = this.startVisualReadyInterval();
    }

    private visualReadyIntervalHandler = () => {
        const isCheckTimedOut: boolean =
            this.timeIntervals * this.CHECK_PERIOD >
            this.VISUALLY_READY_RESOLVE_TIMEOUT;

        if (this.isOkToResolveVisuallyReady(isCheckTimedOut)) {
            clearInterval(this.visualReadyInterval);

            this.visuallyReadyTimestamp = Math.max(
                this.fcpTime ? this.fcpTime : 0,
                this.lcpTime ? this.lcpTime : 0,
                this.domContentLoadedEventEnd
                    ? this.domContentLoadedEventEnd
                    : 0
            );
            this.ttiInterval = this.startTtiInterval();
        } else {
            // No VR timestamps and check timed out, therefore stop searching
            if (isCheckTimedOut) {
                clearInterval(this.visualReadyInterval);
                this.ttiResolved = true;
                this.ttiTracker = {};
            }
        }
        this.timeIntervals += 1;
    };

    private ttiIntervalHandler = () => {
        const isTTITimedOut =
            this.totalIntervals * this.CHECK_PERIOD > this.TTI_RESOLVE_TIMEOUT;

        if (isTTITimedOut) {
            // TTI computation timed out. Don't attempt any more calculations
            this.ttiResolved = true;
            this.ttiTracker = {};
            clearInterval(this.ttiInterval);
        }
        const endBucket = this.computeTimeWindow();

        for (let bucket = this.currBucket; bucket <= endBucket; bucket++) {
            this.currBucket = bucket;
            let allTTIConditionsFulfiled = true;

            // Check long task fulfils criteria
            if (this.isTTIConditionNotFulfilied(LONG_TASK, bucket)) {
                allTTIConditionsFulfiled = false;
            }

            // Check FPS fulfils criteria
            if (
                this.fpsEnabled &&
                this.isTTIConditionNotFulfilied(FPS, bucket)
            ) {
                allTTIConditionsFulfiled = false;
            }

            // If all conditions for a time window are not fulfiled, reset and move to next time window
            if (!allTTIConditionsFulfiled) {
                this.acceptedIntervals = 0;
                continue;
            }

            // All conditions were met so its an accepted interval towards quiet window quota
            this.acceptedIntervals += 1;

            if (this.isTTIResolved(this.acceptedIntervals)) {
                this.ttiResolved = true;
                clearInterval(this.ttiInterval);
                this.onReport({
                    name: 'TTI',
                    value: this.computeTTIValue()
                });
                break;
            } else {
                // TTI not yet resolvable, so continue trying
                continue;
            }
        }

        this.totalIntervals += 1;
    };

    private startTtiInterval(): NodeJS.Timeout {
        this.startBucket = Math.max(
            this.computeTimeWindow(this.visuallyReadyTimestamp),
            0
        );
        this.currBucket = this.startBucket;
        this.acceptedIntervals = 0;
        this.totalIntervals = 0;
        return setInterval(() => this.ttiIntervalHandler, this.CHECK_PERIOD);
    }

    private isOkToResolveVisuallyReady(isCheckTimedOut: boolean): boolean {
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

    private isTTIResolved(acceptedIntervals: number): boolean {
        if (acceptedIntervals >= this.REQUIRED_ACCEPTED_INTERVALS) {
            return true;
        } else {
            return false;
        }
    }
    private computeTTIValue(): number {
        /*
        TTI is the time to the start of the TTI quiet window. 
        Therefore, it is the sum of the time to visually ready + time from VR to the start of the quiet window
        */
        const timeToQuietPeriodFromVisuallyReady: number =
            (this.currBucket -
                this.REQUIRED_ACCEPTED_INTERVALS -
                this.startBucket +
                1) *
            this.COLLECTION_PERIOD;
        // Cleanup
        this.ttiTracker = {};

        return this.visuallyReadyTimestamp + timeToQuietPeriodFromVisuallyReady;
    }

    private isTTIConditionNotFulfilied(
        ttiCondition: string,
        currrentBucket: number
    ) {
        /*
        Determine if TTI condition does not meet the defined acceptance criteria. 

        */

        if (ttiCondition === LONG_TASK) {
            // Any intervals with no long tasks are undefined and should be marked as 0
            return (
                this.ttiTracker[LONG_TASK] !== undefined &&
                this.ttiTracker[LONG_TASK][currrentBucket] !== undefined &&
                this.ttiTracker[LONG_TASK][currrentBucket] >
                    this.LONG_TASK_THRESHOLD
            );
        }
        if (ttiCondition === FPS) {
            return (
                this.fpsEnabled &&
                this.ttiTracker[FPS] !== undefined &&
                this.ttiTracker[FPS][currrentBucket] !== undefined &&
                this.ttiTracker[FPS][currrentBucket] < this.FPS_THRESHOLD
            );
        }
    }

    private initListeners(): void {
        // Use performance observer to record long tasks and domcontentloaded
        this.longTaskEventListener();
        this.navEventListener();

        // Record support for FCP and LCP and init listeners
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

        // Init FPS listener if supported and enabled
        if (this.fpsEnabled && window.requestAnimationFrame !== undefined) {
            this.framesPerSecondListener();
        }
    }

    private startVisualReadyInterval(): NodeJS.Timeout {
        return setInterval(this.visualReadyIntervalHandler, this.CHECK_PERIOD);
    }

    private computeTimeWindow(currTime?: number): number {
        if (currTime === undefined) {
            return Math.floor(performance.now() / this.COLLECTION_PERIOD);
        } else {
            return Math.floor(currTime / this.COLLECTION_PERIOD);
        }
    }

    private addToTracker(type: string, bucket: number, value: any) {
        if (!this.ttiTracker[type]) {
            this.ttiTracker[type] = [];
        }

        if (!this.ttiTracker[type][bucket]) {
            this.ttiTracker[type][bucket] = 0;
        }

        this.ttiTracker[type][bucket] += value;
    }

    longTaskEventListener = () => {
        const eventObserver: PerformanceObserver = new PerformanceObserver(
            (list) => {
                // If tti resolution is done, teardown
                if (this.ttiResolved) {
                    eventObserver.disconnect();
                }
                list.getEntries()
                    .filter((e) => e.entryType === LONG_TASK)
                    .forEach((event) => {
                        // Add to the time buckets where the long task spreads over
                        if (event.startTime && event.duration) {
                            const endTime = event.startTime + event.duration;
                            this.addToTracker(
                                LONG_TASK,
                                this.computeTimeWindow(event.startTime),
                                1
                            );
                            this.addToTracker(
                                LONG_TASK,
                                this.computeTimeWindow(endTime),
                                1
                            );
                        }
                    });
            }
        );
        eventObserver.observe({
            type: LONG_TASK
        });
    };

    navEventListener = () => {
        const eventObserver: PerformanceObserver = new PerformanceObserver(
            (list) => {
                // If tti resolution is done, teardown
                if (this.ttiResolved) {
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

    framesPerSecondListener = () => {
        // The frames per second listener measures frames per second. It does so
        // using requestAnimationFrame.  This works by increasing the frame for
        // each call in a given time bucket. For most devices and application
        // this will be 60.
        const trackFrames = () => {
            // increment FPS by 1 in tracker for time window
            this.addToTracker(FPS, this.computeTimeWindow(), 1);

            window.requestAnimationFrame(trackFrames);
        };

        if (!this.ttiResolved) {
            window.requestAnimationFrame(trackFrames);
        }
    };
}
