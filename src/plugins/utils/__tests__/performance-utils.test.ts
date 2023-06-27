import { defaultIgnore } from '../performance-utils';
import {
    mockPerformanceEntry,
    mockPerformanceNavigationTiming
} from '../../../test-utils/mock-data';

describe('performance-utils', () => {
    describe('defaultPerformanceIgnore', () => {
        test('when entry has a non-http URL schema then entry is ignored', async () => {
            const mockEntry = mockPerformanceEntry({
                name: 'chrome-extension://localhost',
                entryType: 'resource'
            });
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(true);
        });
        test('when entry is has an http URL schema then entry is not ignored', async () => {
            const mockEntry = mockPerformanceEntry({
                name: 'http://localhost',
                entryType: 'resource'
            });
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(false);
        });
        test('when entry is has an https URL schema then entry is not ignored', async () => {
            const mockEntry = mockPerformanceEntry({
                name: 'https://localhost',
                entryType: 'resource'
            });
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is not PerformanceResourceTiming then the entry is not ignored', async () => {
            const mockEntry = mockPerformanceNavigationTiming({
                name: 'chrome-extension://localhost'
            });
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(false);
        });
    });
});
