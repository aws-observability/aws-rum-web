import { defaultIgnore } from '../performance-utils';

describe('performance-utils', () => {
    describe('defaultPerformanceIgnore', () => {
        test('when entry has a non-http URL schema then entry is ignored', async () => {
            const mockEntry = {
                name: 'chrome-extension://localhost',
                entryType: 'resource'
            } as PerformanceResourceTiming;
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(true);
        });
        test('when entry is has an http URL schema then entry is not ignored', async () => {
            const mockEntry = {
                name: 'http://localhost',
                entryType: 'resource'
            } as PerformanceResourceTiming;
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(false);
        });
        test('when entry is has an https URL schema then entry is not ignored', async () => {
            const mockEntry = {
                name: 'https://localhost',
                entryType: 'resource'
            } as PerformanceResourceTiming;
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when entry is not PerformanceResourceTiming then the entry is not ignored', async () => {
            const mockEntry = {
                name: 'chrome-extension://localhost',
                entryType: 'navigation'
            } as PerformanceNavigationTiming;
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(false);
        });

        test('when initiator is xhr then entry is ignored', async () => {
            const mockEntry = {
                name: 'http://localhost',
                initiatorType: 'xmlhttprequest',
                entryType: 'resource'
            } as PerformanceNavigationTiming;
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(true);
        });

        test('when initiator is fetch then entry is ignored', async () => {
            const mockEntry = {
                name: 'http://localhost',
                initiatorType: 'fetch',
                entryType: 'resource'
            } as PerformanceNavigationTiming;
            const result = defaultIgnore(mockEntry);
            expect(result).toBe(true);
        });
    });
});
