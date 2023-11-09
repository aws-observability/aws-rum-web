import { isFCPSupported, isLCPSupported } from '../utils/common-utils';
import { onFCP, onLCP, Metric } from 'web-vitals';

const LONG_TASK = 'longtask';
const FPS = 'fps';
const NAVIGATION = 'navigation';
const FCP = 'FCP';
const LCP = 'LCP';

/*
This implements the TTI Boomerang algorithm with some modifications. 
(Ref: https://akamai.github.io/boomerang/oss/BOOMR.plugins.Continuity.html)

Steps to TTI: 
1) Find visually ready timestamp (highest of domcontentLoadedEnd(if available), FCP(if available), LCP(if available))
2) Starting from the Visually Ready timestamp, find a 500ms quiet window. 

A quiet window has the following characteristics: 
a) No Long Tasks 
b) FPS is above 20

Boomerang TTI's measurement interval is every 100ms. Each check is performed and bucketed into a 100ms interval. 

3) TTI is recorded as Visually ready timestamp + time from visually ready to the start of the quiet window


We do not record PageBusy metrics for now as there were some performance issues observed. 
As such TTI can only be computed for now for browsers that support Long Tasks. 
*/

export class TimeToInteractive {
    private fcpTime?: number;
    private lcpTime?: number;
    private domContentLoadedEventEnd?: number;
    private visuallyReadyTimestamp: number | null = null;
    private ttiTracker: any = {};
    private ttiResolved = false;

    private fcpSupported = false;
    private lcpSupported = false;
    private fpsSupported = false; // Check for support for requestAnimationFrame

    private COLLECTION_PERIOD = 100;
    private REQUIRED_ACCEPTED_INTERVALS = 5;
    private CHECK_PERIOD = 1000; // Perform another check for TTI/Visually ready
    private VISUALLY_READY_RESOLVE_TIMEOUT = 10000;
    private TTI_RESOLVE_TIMEOUT = 10000;

    private FPS_THRESHOLD = 20 / (1000 / this.COLLECTION_PERIOD);
    private LONG_TASK_THRESHOLD = 0;

    public async computeTimeToInteractive(): Promise<number> {
        this.initListeners();
        return new Promise<number>((resolve, reject) => {
            this.checkForVisualReady().then((visuallyReadyTimestamp) => {
                this.computeTTI(visuallyReadyTimestamp).then((ttiVal) => {
                    resolve(ttiVal);
                });
            });
        });
    }

    async checkForVisualReady(): Promise<number> {
        // Check if visually ready
        return new Promise<number>((resolve, reject) => {
            let timeIntervals = 0;
            const visuallyReadyInterval: any = setInterval(() => {
                const isCheckTimedOut: boolean =
                    timeIntervals * this.CHECK_PERIOD >
                    this.VISUALLY_READY_RESOLVE_TIMEOUT;

                if (this.isOkToResolveVisuallyReady(isCheckTimedOut)) {
                    clearInterval(visuallyReadyInterval);

                    this.visuallyReadyTimestamp = Math.max(
                        this.fcpTime ? this.fcpTime : 0,
                        this.lcpTime ? this.lcpTime : 0,
                        this.domContentLoadedEventEnd
                            ? this.domContentLoadedEventEnd
                            : 0
                    );
                    resolve(this.visuallyReadyTimestamp);
                } else {
                    // No VR timestamps and check timed out, therefore stop searching
                    if (isCheckTimedOut) {
                        clearInterval(visuallyReadyInterval);
                        this.ttiResolved = true;
                        this.ttiTracker = {};
                        reject(
                            'Insufficient visually ready timestamps to compute TTI'
                        );
                    }
                }
                timeIntervals += 1;
            }, this.CHECK_PERIOD);
        });
    }

    async computeTTI(visuallyReadyTimestamp: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const startBucket = Math.max(
                this.computeTimeWindow(visuallyReadyTimestamp),
                0
            );

            let currBucket = startBucket;
            let acceptedIntervals = 0;
            let totalIntervals = 0;

            const tti: any = setInterval(() => {
                const isTTITimedOut =
                    totalIntervals * this.CHECK_PERIOD >
                    this.TTI_RESOLVE_TIMEOUT;

                if (isTTITimedOut) {
                    // TTI computation timed out. Don't attempt any more calculations
                    this.ttiResolved = true;
                    this.ttiTracker = {};
                    reject('TTI computation timed out');
                }
                const endBucket = this.computeTimeWindow();

                for (let bucket = currBucket; bucket <= endBucket; bucket++) {
                    currBucket = bucket;
                    let allTTIConditionsFulfiled = true;

                    if (!this.ttiTracker[LONG_TASK] && !this.ttiTracker[FPS]) {
                        // Insufficient data so wait and try again
                        break;
                    }

                    // Check long task fulfils criteria
                    if (this.isTTIConditionNotFulfilied(LONG_TASK, bucket)) {
                        allTTIConditionsFulfiled = false;
                    }

                    // Check FPS fulfils criteria
                    if (this.isTTIConditionNotFulfilied(FPS, bucket)) {
                        allTTIConditionsFulfiled = false;
                    }

                    // If all conditions for a time window are not fulfiled, reset and move to next time window
                    if (!allTTIConditionsFulfiled) {
                        acceptedIntervals = 0;
                        continue;
                    }

                    // All conditions were met so its an accepted interval towards quiet window quota
                    acceptedIntervals += 1;

                    if (this.isTTIResolved(acceptedIntervals)) {
                        this.ttiResolved = true;
                        clearInterval(tti);
                        resolve(
                            this.computeTTIValue(
                                currBucket,
                                startBucket,
                                visuallyReadyTimestamp
                            )
                        );
                        break;
                    } else {
                        // TTI not yet resolvable, so continue trying
                        continue;
                    }
                }

                totalIntervals += 1;
            }, this.CHECK_PERIOD);
        });
    }

    /*
    Helper functions 

    */

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
    private computeTTIValue(
        currBucket: number,
        startBucket: number,
        visuallyReadyTimestamp: number
    ): number {
        /*
        TTI is the time to the start of the TTI quiet window. 
        Therefore, it is the sum of the time to visually ready + time from VR to the start of the quiet window
        */
        const timeToQuietPeriodFromVisuallyReady: number =
            (currBucket - this.REQUIRED_ACCEPTED_INTERVALS - startBucket + 1) *
            this.COLLECTION_PERIOD;

        return visuallyReadyTimestamp + timeToQuietPeriodFromVisuallyReady;
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
                this.ttiTracker[LONG_TASK][currrentBucket] !== undefined &&
                this.ttiTracker[ttiCondition][currrentBucket] >
                    this.LONG_TASK_THRESHOLD
            );
        }
        if (ttiCondition === FPS) {
            return (
                this.fpsSupported &&
                this.ttiTracker[ttiCondition][currrentBucket] !== undefined &&
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

        if (window.requestAnimationFrame !== undefined) {
            // Init FPS listener if supported
            this.fpsSupported = true;
            this.framesPerSecondListener();
        }
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
                    .forEach((event) => {
                        if (event.toJSON().domContentLoadedEventEnd) {
                            this.domContentLoadedEventEnd =
                                event.toJSON().domContentLoadedEventEnd;
                        }
                    });
            }
        );
        eventObserver.observe({
            type: NAVIGATION,
            buffered: true
        });
    };

    /*
    Track frames per second 
    */
    framesPerSecondListener = () => {
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
