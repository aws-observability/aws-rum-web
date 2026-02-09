/* eslint-disable jsdoc/check-indentation */
import { isLongTaskSupported } from '../utils/common-utils';
import { VisuallyReadySearch } from './VisuallyReadySearch';
import { QuietWindowSearch } from './QuietWindowSearch';

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
export class TimeToInteractive {
    private onReport: TTIReportCallback;

    private quietWindowSearch: QuietWindowSearch;
    private visuallyReadySearch: VisuallyReadySearch;

    constructor(onReport: TTIReportCallback, opts: TTIReportOpts) {
        this.onReport = onReport;

        // Begin attempt for TTI resolution by looking for visually ready and then a quiet window
        this.quietWindowSearch = new QuietWindowSearch(
            opts.fpsEnabled,
            this.onReport
        );
        this.visuallyReadySearch = new VisuallyReadySearch(
            this.quietWindowSearch
        );
    }
}
