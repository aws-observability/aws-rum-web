import { defaultPerformanceIgnore } from '../../utils/performance-utils';
import { mockPerformanceEntry } from '../../../test-utils/mock-data';

describe('Performance', () => {
    describe('defaultPerformanceIgnore', () => {
        it('when entry has a non-http URL schema then entry is ignored', () => {
            const mockEntry = mockPerformanceEntry();
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(true);
        });
        it('when entry has an http URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceEntry({
                name: 'http://locahost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });
        it('when entry has an https URL schema then entry is not ignored', () => {
            const mockEntry = mockPerformanceEntry({
                name: 'https://locahost'
            });
            const result = defaultPerformanceIgnore(mockEntry);
            expect(result).toBe(false);
        });
    });
});
