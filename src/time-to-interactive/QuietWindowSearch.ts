// Keep state of quiet window

import { TTIReportCallback } from './TimeToInteractive';

const LONG_TASK = 'longtask';
const FPS = 'fps';

export class QuietWindowSearch {
    private ttiTracker: any = {};
    private ttiResolved = false;
    private onReport: TTIReportCallback;

    private ttiInterval!: NodeJS.Timeout;
    private startBucket = 0;
    private currBucket = 0;
    private acceptedIntervals = 0;
    private totalIntervals = 0;

    private visuallyReadyTimestamp = 0;

    private fpsEnabled = false;

    private COLLECTION_PERIOD = 100;
    private REQUIRED_ACCEPTED_INTERVALS = 5;
    private CHECK_PERIOD = 1000; // Perform another check for TTI after this time period
    private TTI_RESOLVE_TIMEOUT = 10000; // Declare a timeout for TTI after this time period

    private FPS_THRESHOLD = 20 / (1000 / this.COLLECTION_PERIOD);
    private LONG_TASK_THRESHOLD = 0;

    constructor(fpsEnabled: boolean, onReport: TTIReportCallback) {
        this.fpsEnabled = fpsEnabled;
        this.initListeners();
        this.onReport = onReport;
    }

    // On finding quiet window, report the TTI. If timed out, report nothing and cleanup listeners
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

    startTtiSearch(visuallyReadyTimestamp: number): void {
        this.startBucket = Math.max(
            this.computeTimeWindow(visuallyReadyTimestamp),
            0
        );
        this.currBucket = this.startBucket;
        this.acceptedIntervals = 0;
        this.totalIntervals = 0;
        this.visuallyReadyTimestamp = visuallyReadyTimestamp;
        this.ttiInterval = setInterval(
            this.ttiIntervalHandler,
            this.CHECK_PERIOD
        );
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

        // Init FPS listener if supported and enabled
        if (this.fpsEnabled && window.requestAnimationFrame !== undefined) {
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

    cleanupQuietWindowSearch() {
        this.ttiResolved = true;
        this.ttiTracker = {};
    }
}
