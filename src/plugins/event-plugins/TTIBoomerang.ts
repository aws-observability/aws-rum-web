import { List, reject, result } from 'lodash';
import { onFCP, onLCP, Metric } from 'web-vitals';

const LONG_TASK = 'longTask';
const FPS = 'fps';
const PAGE_BUSY = 'pageBusy';

/*

*/

export class TTIBoomerang {
    private fcpTime: number | null;
    private lcpTime: number | null;
    private visuallyReady: any;
    private tti: any;
    private visuallyReadyTimestamp: number | null;
    private ttiTracker: any;

    private COLLECTION_PERIOD = 100;

    constructor() {
        this.fcpTime = null;
        this.lcpTime = null;
        this.visuallyReady = false;
        this.visuallyReadyTimestamp = null;
        this.ttiTracker = {};
    }
    // Needs to return a Promise
    private computeTimeToInteractive() {
        return new Promise<number>((resolve, reject) => {
            this.checkForVisualReady().then((result) => {
                resolve(result);
            });
        });
    }

    private checkForVisualReady(): Promise<number> {
        // init the visually ready monitors for FCP, LCP and FP

        // Check for LCP, FCP, FP

        return new Promise<number>((resolve, reject) => {
            this.visuallyReady = setInterval(() => {
                const domContentLoaded = this.isDomContentLoaded();
                onFCP((metric) => this.handleWebVitals(metric));
                onLCP((metric) => this.handleWebVitals(metric));

                // Check if all Visually ready timestamps are available
                if (this.fcpTime && this.lcpTime && domContentLoaded) {
                    // Visually ready so start checking for TTI
                    clearInterval(this.visuallyReady);
                    this.visuallyReadyTimestamp = Math.max(
                        this.fcpTime,
                        this.lcpTime,
                        domContentLoaded
                    );
                    this.computeTTI(this.visuallyReadyTimestamp).then(
                        (result) => {
                            resolve(result);
                        }
                    );
                }
            }, this.COLLECTION_PERIOD);
        });
    }

    // TODO: Grab from nav plugin potentially
    private isDomContentLoaded() {
        const entries = performance.getEntriesByType('navigation');
        entries.forEach((entry) => {
            return entry.domContentLoadedEventEnd;
        });
        return null;
    }

    // TODO: grab the event time
    private handleWebVitals(metric: Metric) {
        if (metric.name === 'FCP') {
            this.fcpTime = performance.now();
        }
        if (metric.name === 'LCP') {
            this.lcpTime = performance.now();
        }
    }

    private computeTTI(visuallyReadyTimestamp?: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.initListeners(); // init listeners

            let numLongTasksBelowThreshold = 0;
            let numFpsBelowThreshold = 0;
            let pageBusyBelowThreshold = 0;
            let startBucket = 0;
            let currBucket = 0;
            let okIntervals = 0;

            this.tti = setInterval(() => {
                const endBucket = this.computeTimeWindow();
                for (let bucket = startBucket; bucket <= endBucket; bucket++) {
                    currBucket = bucket;
                    let allOk = false;

                    // Check long task
                    if (
                        this.ttiTracker[LONG_TASK] &&
                        this.ttiTracker[LONG_TASK][bucket] &&
                        this.ttiTracker[LONG_TASK][bucket] === 0
                    ) {
                        numLongTasksBelowThreshold += 1;
                        allOk = true;
                    }

                    // Check FPS
                    if (
                        this.ttiTracker[FPS] &&
                        this.ttiTracker[FPS][bucket] &&
                        this.ttiTracker[FPS][bucket] < 20
                    ) {
                        numFpsBelowThreshold += 1;
                        allOk = true;
                    }

                    // Check page busy
                    if (
                        this.ttiTracker[PAGE_BUSY] &&
                        this.ttiTracker[PAGE_BUSY][bucket] &&
                        this.ttiTracker[PAGE_BUSY][bucket] < 10
                    ) {
                        pageBusyBelowThreshold += 1;
                        allOk = true;
                    }

                    // if all ok, increment ok interval by 1 and then check if 5 are done. if yes, resolve, else continue
                    if (allOk) {
                        okIntervals += 1;
                        if (okIntervals > 4) {
                            clearInterval(this.tti);
                            resolve(currBucket * this.COLLECTION_PERIOD);
                        } else {
                            continue;
                        }
                    } else {
                        numFpsBelowThreshold = 0;
                        pageBusyBelowThreshold = 0;
                        numLongTasksBelowThreshold = 0;
                        okIntervals = 0;
                    }

                    startBucket = endBucket;
                }
            }, this.COLLECTION_PERIOD);
        });
    }

    private initListeners() {
        if (
            window.PerformanceObserver.supportedEntryTypes.includes('LongTask')
        ) {
            this.longTaskEventListener();
        }

        this.framesPerSecondListener();

        if (
            !window.PerformanceObserver.supportedEntryTypes.includes('LongTask')
        ) {
            // Only if long task not supported
            // this.pageBusyListener();
        }
    }

    private computeTimeWindow(currTime?: number) {
        const visuallyReadyTimestamp = this.visuallyReadyTimestamp
            ? this.visuallyReadyTimestamp
            : 0;

        if (typeof currTime === 'undefined') {
            return Math.floor(
                (performance.now() - visuallyReadyTimestamp) /
                    this.COLLECTION_PERIOD
            );
        } else {
            return Math.floor(
                (currTime - visuallyReadyTimestamp) / this.COLLECTION_PERIOD
            );
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

    /*
    We listen for long tasks and record them 
    */

    longTaskEventListener = () => {
        const longTaskObserver = new PerformanceObserver((list) => {
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
        });
        longTaskObserver.observe({
            entryTypes: [LONG_TASK]
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

        window.requestAnimationFrame(trackFrames);
    };
    /*
    Track page busy 
    */

    // pageBusyListener = () => {};
}
