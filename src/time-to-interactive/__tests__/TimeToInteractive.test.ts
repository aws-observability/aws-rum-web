import { TimeToInteractive } from './../TimeToInteractive';
import { TTIMetric } from './../TimeToInteractive';
import { mockLongTaskPerformanceObserver } from '../../test-utils/mock-data';

/*
This package unit tests Time to interactive  
*/

describe('Time To Interactive tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLongTaskPerformanceObserver();
        jest.useFakeTimers();
    });

    test('When visually ready check times out, then visually ready is the highest of the available timestamps', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const timeToInteractive = new TimeToInteractive(() => {}, {
            fpsEnabled: false
        });

        // Only 1 of 3 timestamps are present
        timeToInteractive['domContentLoadedEventEnd'] = 88;

        // Advance time ahead
        jest.advanceTimersByTime(12000);

        return expect(timeToInteractive['visuallyReadyTimestamp']).toBe(88);
    });

    test('When there are multiple visually ready timestamps are present, then visually ready timestamp is the highest of them', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const timeToInteractive = new TimeToInteractive(() => {}, {
            fpsEnabled: false
        });

        // 3 of 3 visually ready markers available
        timeToInteractive['fcpTime'] = 140;
        timeToInteractive['lcpTime'] = 200;
        timeToInteractive['domContentLoadedEventEnd'] = 88;

        // Advance time ahead
        jest.advanceTimersByTime(12000);

        return expect(timeToInteractive['visuallyReadyTimestamp']).toBe(200);
    });

    test('When no visually ready timestamps are available, then visually ready is not updated', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const timeToInteractive = new TimeToInteractive(() => {}, {
            fpsEnabled: false
        });

        // Advance time ahead
        jest.advanceTimersByTime(12000);

        return expect(timeToInteractive['visuallyReadyTimestamp']).toBe(0);
    });

    test('When long tasks are supported and fps measurements are disabled, time to interactive is computed correctly', async () => {
        let ttiVal: any;
        const timeToInteractive = new TimeToInteractive(
            (metric: TTIMetric) => {
                ttiVal = metric.value;
            },
            {
                fpsEnabled: false
            }
        );

        // Highest of 3 is visually ready timestamp
        timeToInteractive['fcpTime'] = 140;
        timeToInteractive['lcpTime'] = 212;
        timeToInteractive['domContentLoadedEventEnd'] = 88;

        // Quiet window comes after 1 measurement interval of VR
        timeToInteractive['ttiTracker'] = {
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

        // VR timestamp is highest of all available
        expect(timeToInteractive['visuallyReadyTimestamp']).toBe(212);

        expect(ttiVal).toBe(312);
    });

    test('When long tasks are supported and fps measurements are enabled, time to interactive is computed correctly', async () => {
        let ttiVal: any;

        // Disable FPS on initial call to avoid listener from overriding hardcoded values for unit test
        const timeToInteractive = new TimeToInteractive(
            (metric: TTIMetric) => {
                ttiVal = metric.value;
            },
            {
                fpsEnabled: false
            }
        );

        // Enable FPS measurement flag after initialization
        timeToInteractive['fpsEnabled'] = true;

        // Highest of 3 is visually ready timestamp
        timeToInteractive['fcpTime'] = 140;
        timeToInteractive['lcpTime'] = 212;
        timeToInteractive['domContentLoadedEventEnd'] = 88;

        // Quiet window comes after 4 measurement interval of VR
        timeToInteractive['ttiTracker'] = {
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

        // VR timestamp is highest of all available
        expect(timeToInteractive['visuallyReadyTimestamp']).toBe(212);

        expect(ttiVal).toBe(612);
    });

    test('When visually data cannot be determined, TTI is not computed and times out', async () => {
        let ttiVal: any;

        // Disable FPS on initial call to avoid listener from overriding hardcoded values for unit test
        const timeToInteractive = new TimeToInteractive(
            (metric: TTIMetric) => {
                ttiVal = metric.value;
            },
            {
                fpsEnabled: false
            }
        );

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        // VR timestamp is not found
        expect(timeToInteractive['visuallyReadyTimestamp']).toBe(0);

        // No TTI value recorded as no TTI data available
        expect(ttiVal).toBe(undefined);
    });
});
