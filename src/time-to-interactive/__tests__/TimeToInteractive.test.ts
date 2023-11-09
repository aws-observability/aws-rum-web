import { TimeToInteractive } from './../TimeToInteractive';

/*

This package unit tests the Time to interactive library 
*/

const LONG_TASK = 'longtask';
const FPS = 'fps';

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

    // TTI tests
    test('When visually ready, time to interactive is computed correctly', async () => {
        const timeToInteractive = new TimeToInteractive();
        const visuallyReadyTimeStamp = 12;
        timeToInteractive['fpsSupported'] = true;

        // with 5 good intervals
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

        // Mock the computed time window
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

        // with 5 good intervals
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

        // Mock the computed time window
        return timeToInteractive
            .computeTTI(visuallyReadyTimeStamp)
            .then((ttiVal) => {
                expect(ttiVal).toBe(312);
            });
    });
});
