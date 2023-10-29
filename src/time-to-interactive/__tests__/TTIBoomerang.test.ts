import { TTIBoomerang } from '../TTIBoomerang';
import {
    resourceTiming,
    putRumEventsDocument,
    putRumEventsGammaDocument,
    dataPlaneDocument,
    imageResourceEventA,
    imageResourceEventB,
    navigationEvent,
    doMockPerformanceObserver,
    longTaskEntry,
    navigationEntry,
    cssResourceEvent,
    scriptResourceEvent,
    mockPerformanceObserver
} from '../../test-utils/mock-data';
import { TTIPlugin } from '../../plugins/event-plugins/TTIPlugin';
import { context, record } from '../../test-utils/test-utils';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../plugins/utils/constant';

// TODO: Unit tests for boomerang tti

/*

Tests to cover - 

1) All supported and we get accurate tti 
1) Long tasks not available, TTI not produced 
2) Timeout if tti not found 
3) not visually ready, then we should not be computing tti 
4) visually ready picks the highest of three timestamps 
5) 


Mock the observor 
Mock what the observor support
Mock the long tasks 
Mock LCP, FID, domContentLoaded 



*/
const mockLCPData = {
    name: 'LCP',
    entries: [{ startTime: 123, duration: 2 }]
};
const mockFCPData = {
    name: 'FCP',
    entries: [{ startTime: 125, duration: 2 }]
};

jest.mock('web-vitals', () => {
    return {
        onLCP: jest.fn().mockImplementation((callback) => {
            callback(mockLCPData);
        }),
        onFCP: jest.fn().mockImplementation((callback) => {
            callback(mockFCPData);
        })
    };
});

describe('Time to Interactive - Boomerang tests', () => {
    beforeEach(() => {
        // some setup
        mockPerformanceObserver();
        record.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});
