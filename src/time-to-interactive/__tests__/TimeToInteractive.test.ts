import { TimeToInteractive } from './../TimeToInteractive';

/*

This package unit tests Time to interactive  
*/

describe('Time To Interactive tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Visually ready tests

    test('When visually ready check times out, then visually ready is the highest of the available timestamps', async () => {
        const timeToInteractive = new TimeToInteractive();

        // Override the timeout to avoid long running test and keep within default test timeout
        timeToInteractive['VISUALLY_READY_RESOLVE_TIMEOUT'] = 1000;

        // Only 1 of 3 timestamps are present
        timeToInteractive['domContentLoadedEventEnd'] = 88;

        return timeToInteractive.checkForVisualReady().then((num) => {
            expect(num).toBe(88);
        });
    });

    test('When there are multiple visually ready timestamps are present, then visually ready timestamp is the highest of them', async () => {
        const timeToInteractive = new TimeToInteractive();

        timeToInteractive['fcpTime'] = 140;
        timeToInteractive['lcpTime'] = 200;
        timeToInteractive['domContentLoadedEventEnd'] = 88;

        return timeToInteractive.checkForVisualReady().then((visuallyready) => {
            expect(visuallyready).toBe(200);
        });
    });

    test('When no visually ready timestamps are available, then visually ready is not resolved', async () => {
        const timeToInteractive = new TimeToInteractive();

        // Override the timeout to avoid long running test and keep within default test timeout
        timeToInteractive['VISUALLY_READY_RESOLVE_TIMEOUT'] = 1000;

        return timeToInteractive.checkForVisualReady().catch((reason) => {
            expect(reason).toBe(
                'Insufficient visually ready timestamps to compute TTI'
            );
        });
    });

    test('When long tasks and fps are supported, time to interactive is computed correctly', async () => {
        const timeToInteractive = new TimeToInteractive();
        const visuallyReadyTimeStamp = 12;
        timeToInteractive['fpsSupported'] = true;

        // Quiet window comes after 10 measurement intervals
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

        return timeToInteractive
            .computeTTI(visuallyReadyTimeStamp)
            .then((ttiVal) => {
                expect(ttiVal).toBe(1012);
            });
    });

    test('When fps support is not enabled, time to interactive is computed correctly', async () => {
        const timeToInteractive = new TimeToInteractive();
        const visuallyReadyTimeStamp = 12;
        timeToInteractive['fpsSupported'] = false;

        // Quiet window comes after 3 measurement intervals
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

        return timeToInteractive
            .computeTTI(visuallyReadyTimeStamp)
            .then((ttiVal) => {
                expect(ttiVal).toBe(312);
            });
    });

    test('When no data is available post visually ready, TTI is not computed and times out', async () => {
        const timeToInteractive = new TimeToInteractive();
        timeToInteractive['fpsSupported'] = false;
        timeToInteractive['TTI_RESOLVE_TIMEOUT'] = 1000; // shorter duration to avoid long running test

        // Visually ready is met
        const visuallyReadyTimeStamp = 12;

        // No data available
        timeToInteractive['ttiTracker'] = {};

        // TTI should not resolve
        return timeToInteractive
            .computeTTI(visuallyReadyTimeStamp)
            .catch((exception) => {
                expect(exception).toBe('TTI computation timed out');
            });
    });
});
