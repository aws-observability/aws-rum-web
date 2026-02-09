import { TimeToInteractive } from './../TimeToInteractive';
import { mockLongTaskPerformanceObserver } from '../../test-utils/mock-data';
import { VisuallyReadySearch } from './../VisuallyReadySearch';
import { QuietWindowSearch } from './../QuietWindowSearch';

describe('Time To Interactive tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLongTaskPerformanceObserver();
        jest.useFakeTimers();
    });
    test('When long tasks are supported and fps measurements are disabled, time to interactive is computed correctly', async () => {
        let ttiVal: any;
        const fn = jest.fn();
        const timeToInteractive = new TimeToInteractive(fn, {
            fpsEnabled: false
        });
        const quietWindowSearch = new QuietWindowSearch(
            false,
            timeToInteractive['onReport']
        );
        const visuallyReadySearch = new VisuallyReadySearch(quietWindowSearch);

        // Highest of 3 is visually ready timestamp
        visuallyReadySearch['fcpTime'] = 140;
        visuallyReadySearch['lcpTime'] = 212;
        visuallyReadySearch['domContentLoadedEventEnd'] = 88;

        timeToInteractive['visuallyReadySearch'] = visuallyReadySearch;

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
        timeToInteractive['quietWindowSearch'] = quietWindowSearch;

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        // VR timestamp is highest of all available
        expect(timeToInteractive['onReport']).toBeCalled();
        expect(timeToInteractive['onReport']).toBeCalledWith({
            name: 'TTI',
            value: 312
        });
    });

    test('When long tasks are supported and fps measurements are enabled, time to interactive is computed correctly', async () => {
        const fn = jest.fn();
        const timeToInteractive = new TimeToInteractive(fn, {
            fpsEnabled: false
        });
        const quietWindowSearch = new QuietWindowSearch(
            false,
            timeToInteractive['onReport']
        );
        const visuallyReadySearch = new VisuallyReadySearch(quietWindowSearch);

        // Highest of 3 is visually ready timestamp
        visuallyReadySearch['fcpTime'] = 140;
        visuallyReadySearch['lcpTime'] = 212;
        visuallyReadySearch['domContentLoadedEventEnd'] = 88;

        timeToInteractive['visuallyReadySearch'] = visuallyReadySearch;

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
        quietWindowSearch['fpsEnabled'] = true;
        timeToInteractive['quietWindowSearch'] = quietWindowSearch;

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        expect(timeToInteractive['onReport']).toBeCalled();
        expect(timeToInteractive['onReport']).toBeCalledWith({
            name: 'TTI',
            value: 1012
        });
    });

    test('When visually ready is not reached, time to interactive is not computed', async () => {
        const fn = jest.fn();
        const timeToInteractive = new TimeToInteractive(fn, {
            fpsEnabled: false
        });
        const quietWindowSearch = new QuietWindowSearch(
            false,
            timeToInteractive['onReport']
        );
        const visuallyReadySearch = new VisuallyReadySearch(quietWindowSearch);

        // No VR timestamps

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

        timeToInteractive['visuallyReadySearch'] = visuallyReadySearch;

        timeToInteractive['quietWindowSearch'] = quietWindowSearch;

        // Advance time ahead
        jest.advanceTimersByTime(7000);

        expect(timeToInteractive['onReport']).toBeCalledTimes(0);
    });
});
