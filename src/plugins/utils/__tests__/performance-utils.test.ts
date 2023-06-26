import { defaultPerformanceIgnore } from '../performance-utils';
import {
    mockPerformanceEntry,
    mockPerformanceNavigationTiming,
    mockPerformanceResourceTiming
} from '../../../test-utils/mock-data';

describe('performance-utils', () => {
    describe('defaultPerformanceIgnore', () => {
        test('when resource entry is PerformanceEntry and has non-http(s) URL schema then entry is ignored', () => {
            const mockEntry = mockPerformanceEntry({
                name: 'chrome-extension://localhost',
                entryType: 'resource'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(true);
        });
        test('when resource entry is PerformanceEntry and has http URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceEntry({
                name: 'http://localhost',
                entryType: 'resource'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });
        test('when resource entry is PerformanceEntry and has https URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceEntry({
                name: 'https://localhost',
                entryType: 'resource'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is PerformanceResourceTiming and has non-http(s) URL-schema then entry is ignored', () => {
            const mockEntry = mockPerformanceResourceTiming({
                name: 'chrome-extension://localhost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(true);
        });

        test('when entry is PerformanceResourceTiming and has http URL schema then the entry is not ignored', () => {
            const mockEntry = mockPerformanceResourceTiming({
                name: 'http://localhost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is PerformanceResourceTiming and has https URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceResourceTiming({
                name: 'https://localhost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is PerformanceNavigationTiming and has non-http(s) URL schema request then entry is not ignored', () => {
            const mockEntry = mockPerformanceNavigationTiming({
                name: 'chrome-extension://localhost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is PerformanceNavigationTiming and has http URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceNavigationTiming({
                name: 'http://localhost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is PerformanceNavigationTiming and has https URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceNavigationTiming({
                name: 'https://localhost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });
    });
});
