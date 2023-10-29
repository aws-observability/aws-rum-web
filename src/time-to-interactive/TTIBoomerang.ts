import { isFCPSupported, isLCPSupported } from '../utils/common-utils';
import { onFCP, onLCP, Metric } from 'web-vitals';

const LONG_TASK = 'longtask';
const FPS = 'fps';
const PAGE_BUSY = 'pageBusy';
const NAVIGATION = 'navigation';
const FCP = 'FCP';
const LCP = 'LCP';

export class TTIBoomerang {
    private fcpTime: number | null = null;
    private lcpTime: number | null = null;
    private domContentLoadedEventEnd: number | null = null;
    private visuallyReadyTimestamp: number | null = null;
    private ttiTracker: any = {};
    private ttiResolved = false;

    private fcpSupported = false;
    private lcpSupported = false;
    private fpsSupported = false; // Check for support for requestAnimationFrame

    private COLLECTION_PERIOD = 100;
    private REQUIRED_OK_INTERVALS = 5;
    private CHECK_PERIOD = 1000; // Perform another check for TTI/Visually ready
    private VISUALLY_READY_RESOLVE_TIMEOUT = 10000;
    private TTI_RESOLVE_TIMEOUT = 10000;

    private FPS_THRESHOLD = 20 / (1000 / this.COLLECTION_PERIOD);
    private LONG_TASK_THRESHOLD = 0;

    // Needs to return a Promise
    computeTimeToInteractive(): Promise<number> {
        this.initListeners();
        return new Promise<number>((resolve, reject) => {
            this.checkForVisualReady().then((result) => {
                this.computeTTI(result).then((result) => {
                    resolve(result);
                });
            });
        });
    }

    checkForVisualReady(): Promise<number> {
        // Check if visually ready
        return new Promise<number>((resolve, reject) => {
            let timeIntervals = 0;
            const visuallyReadyInterval: any = setInterval(() => {
                // Check if all Visually ready timestamps are available
                let visuallyReady = true;

                if (this.fcpSupported) {
                    if (!this.fcpTime) {
                        visuallyReady = false;
                    }
                }
                if (this.lcpSupported) {
                    if (!this.lcpTime) {
                        visuallyReady = false;
                    }
                }

                if (!this.domContentLoadedEventEnd) {
                    visuallyReady = false;
                }

                if (
                    visuallyReady ||
                    timeIntervals * this.CHECK_PERIOD >
                        this.VISUALLY_READY_RESOLVE_TIMEOUT
                ) {
                    // If timed out, check if any visually ready signals are present, else can't find tti
                    if (
                        timeIntervals * this.CHECK_PERIOD >
                        this.VISUALLY_READY_RESOLVE_TIMEOUT
                    ) {
                        if (
                            !this.lcpTime &&
                            !this.domContentLoadedEventEnd &&
                            !this.fcpTime
                        ) {
                            // No visually ready timestamps so can't compute tti
                            this.ttiResolved = true;
                            this.ttiTracker = {};
                            reject(
                                'Insufficient visually ready timestamps to compute TTI'
                            );
                        }
                    }
                    // Visually ready so start checking for TTI
                    clearInterval(visuallyReadyInterval);

                    this.visuallyReadyTimestamp = Math.max(
                        this.fcpTime ? this.fcpTime : 0,
                        this.lcpTime ? this.lcpTime : 0,
                        this.domContentLoadedEventEnd
                            ? this.domContentLoadedEventEnd
                            : 0
                    );
                    resolve(this.visuallyReadyTimestamp);
                }
                timeIntervals += 1;
            }, this.CHECK_PERIOD);
        });
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

    computeTTI(visuallyReadyTimestamp: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const startBucket = Math.max(
                this.computeTimeWindow(visuallyReadyTimestamp),
                0
            );
            let currBucket = startBucket;
            let okIntervals = 0;
            let totalIntervals = 0;

            const tti: any = setInterval(() => {
                if (
                    totalIntervals * this.CHECK_PERIOD >
                    this.TTI_RESOLVE_TIMEOUT
                ) {
                    // TTI did not resolve in timeout period, so TTI can't be computed
                    this.ttiResolved = true;
                    this.ttiTracker = {};
                    reject('TTI computation timed out');
                }
                const endBucket = this.computeTimeWindow();
                for (let bucket = currBucket; bucket <= endBucket; bucket++) {
                    currBucket = bucket;
                    let allOk = true;

                    if (
                        !this.ttiTracker[LONG_TASK] &&
                        !this.ttiTracker[FPS] &&
                        !this.ttiTracker[PAGE_BUSY]
                    ) {
                        // can't resolve tti so wait and try again

                        break;
                    }

                    // Check long task
                    if (
                        this.ttiTracker[LONG_TASK] &&
                        this.ttiTracker[LONG_TASK][bucket] &&
                        this.ttiTracker[LONG_TASK][bucket] >
                            this.LONG_TASK_THRESHOLD
                    ) {
                        allOk = false;
                    }

                    // Check FPS
                    if (
                        this.fpsSupported &&
                        this.ttiTracker[FPS] &&
                        this.ttiTracker[FPS][bucket] &&
                        this.ttiTracker[FPS][bucket] < this.FPS_THRESHOLD
                    ) {
                        allOk = false;
                    }

                    // if all ok, increment ok interval by 1 and then check if 5 are done. if yes, resolve, else continue
                    if (allOk) {
                        okIntervals += 1;
                        if (okIntervals >= this.REQUIRED_OK_INTERVALS) {
                            this.ttiResolved = true;
                            clearInterval(tti);
                            // TTI is Visually Ready + start of ok period
                            resolve(
                                visuallyReadyTimestamp +
                                    (currBucket - this.REQUIRED_OK_INTERVALS) *
                                        this.COLLECTION_PERIOD
                            );
                            break;
                        } else {
                            continue;
                        }
                    } else {
                        okIntervals = 0;
                    }

                    currBucket = endBucket;
                }
                totalIntervals += 1;
            }, this.CHECK_PERIOD);
        });
    }

    initListeners(): void {
        // record domcontentloaded if its found already
        if (window.performance) {
            if (window.performance.getEntriesByType(NAVIGATION)) {
                this.domContentLoadedEventEnd =
                    window.performance.getEntriesByType(
                        NAVIGATION
                    )[0]?.domContentLoadedEventEnd;
            }
        }

        // Use performance observer to record long tasks and domcontentloaded
        this.eventListener();

        // Record support for FCP and LCP and init listeners
        this.lcpSupported = isLCPSupported();
        this.fcpSupported = isFCPSupported();

        // Use web vitals library for LCP and FCP, if supported
        if (this.fcpSupported) {
            onFCP((metric) => this.handleWebVitals(metric));
        }
        if (this.lcpSupported) {
            onLCP((metric) => this.handleWebVitals(metric));
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        if (window.requestAnimationFrame(() => {})) {
            // Init FPS listener if supported
            this.fpsSupported = true;
            this.framesPerSecondListener();
        }
    }

    private computeTimeWindow(currTime?: number) {
        if (typeof currTime === 'undefined') {
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

    eventListener = () => {
        const eventObserver: PerformanceObserver = new PerformanceObserver(
            (list) => {
                list.getEntries()
                    .filter(
                        (e) =>
                            e.entryType === LONG_TASK ||
                            e.entryType === NAVIGATION
                    )
                    .forEach((event) => {
                        if (event.entryType === LONG_TASK) {
                            // Add to the time buckets where the long task spreads over
                            if (event.startTime && event.duration) {
                                const endTime =
                                    event.startTime + event.duration;
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
                        }
                        if (event.entryType === NAVIGATION) {
                            if (event.toJSON().domContentLoadedEventEnd) {
                                this.domContentLoadedEventEnd =
                                    event.toJSON().domContentLoadedEventEnd;
                            }
                        }
                    });
            }
        );
        eventObserver.observe({
            entryTypes: [LONG_TASK, NAVIGATION]
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
