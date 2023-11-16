import { mockLongTaskPerformanceObserver } from '../../test-utils/mock-data';
import { QuietWindowSearch } from './../QuietWindowSearch';
import { TTIMetric } from './../TimeToInteractive';

describe('Quiet window search tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLongTaskPerformanceObserver();
        jest.useFakeTimers();
    });

    test('When long tasks are supported and fps measurements are disabled, time to interactive is computed correctly', async () => {
        let ttiVal: any;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const quietWindowSearch = new QuietWindowSearch(
            false,
            (metric: TTIMetric) => {
                ttiVal = metric.value;
            }
        );
        quietWindowSearch.startTtiSearch(212);

        // Quiet window comes after 1 measurement interval of VR
        quietWindowSearch['ttiTracker'] = {
            longtask: [
                2, 2, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0
            ],
            fps: [
                1, 0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                2, 2, 2
            ]
        };

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        expect(ttiVal).toBe(312);
    });

    test('When long tasks are supported and fps measurements are enabled, time to interactive is computed correctly', async () => {
        let ttiVal: any;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const quietWindowSearch = new QuietWindowSearch(
            false,
            (metric: TTIMetric) => {
                ttiVal = metric.value;
            }
        );

        // Enable FPS measurement flag after initialization
        quietWindowSearch['fpsEnabled'] = true;

        // Highest of 3 is visually ready timestamp

        quietWindowSearch.startTtiSearch(212);

        // Quiet window comes after 4 measurement interval of VR
        quietWindowSearch['ttiTracker'] = {
            longtask: [
                2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0
            ],
            fps: [
                1, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                2, 2, 2
            ]
        };

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        expect(ttiVal).toBe(612);
    });

    test('When visually data cannot be determined, TTI is not computed and times out', async () => {
        let ttiVal: any;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const quietWindowSearch = new QuietWindowSearch(
            false,
            (metric: TTIMetric) => {
                ttiVal = metric.value;
            }
        );

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        // VR timestamp is not found
        expect(quietWindowSearch['visuallyReadyTimestamp']).toBe(0);

        // No TTI value recorded as no TTI data available
        expect(ttiVal).toBe(undefined);
    });
});
