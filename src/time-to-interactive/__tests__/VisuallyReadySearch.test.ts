import { VisuallyReadySearch } from './../VisuallyReadySearch';
import { mockLongTaskPerformanceObserver } from '../../test-utils/mock-data';
import { QuietWindowSearch } from './../QuietWindowSearch';

describe('Visually ready search tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLongTaskPerformanceObserver();
        jest.useFakeTimers();
    });

    test('When visually ready check times out, then visually ready is the highest of the available timestamps', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const quietWindowSearch = new QuietWindowSearch(false, () => {});
        const visuallyReadySearch = new VisuallyReadySearch(quietWindowSearch);

        // Only 1 of 3 timestamps are present
        visuallyReadySearch['domContentLoadedEventEnd'] = 88;

        // Advance time ahead
        jest.advanceTimersByTime(12000);

        return expect(visuallyReadySearch['visuallyReadyTimestamp']).toBe(88);
    });

    test('When there are multiple visually ready timestamps are present, then visually ready timestamp is the highest of them', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const quietWindowSearch = new QuietWindowSearch(false, () => {});
        const visuallyReadySearch = new VisuallyReadySearch(quietWindowSearch);

        // 3 of 3 visually ready markers available
        visuallyReadySearch['fcpTime'] = 140;
        visuallyReadySearch['lcpTime'] = 200;
        visuallyReadySearch['domContentLoadedEventEnd'] = 88;

        // Advance time ahead
        jest.advanceTimersByTime(12000);

        return expect(visuallyReadySearch['visuallyReadyTimestamp']).toBe(200);
    });

    test('When no visually ready timestamps are available, then visually ready is not updated', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const quietWindowSearch = new QuietWindowSearch(false, () => {});
        const visuallyReadySearch = new VisuallyReadySearch(quietWindowSearch);

        // Advance time ahead
        jest.advanceTimersByTime(12000);

        return expect(visuallyReadySearch['visuallyReadyTimestamp']).toBe(0);
    });
});
