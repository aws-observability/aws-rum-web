import { mockLongTaskPerformanceObserver } from '../../../test-utils/mock-data';
import { TTIPlugin } from '../TTIPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../../plugins/utils/constant';

const mockTTIData = {
    name: 'TTI',
    value: 201.2
};

jest.mock('../../../time-to-interactive/TimeToInteractive', () => {
    return {
        onTTI: jest.fn().mockImplementation((callback) => {
            callback(mockTTIData);
        })
    };
});

describe('Time to Interactive - Plugin Tests', () => {
    let originalPerformance: any;

    beforeEach(() => {
        // setup
        mockLongTaskPerformanceObserver();
        record.mockClear();

        originalPerformance = global.performance;

        global.performance = {
            ...originalPerformance,
            getEntriesByType: jest.fn().mockReturnValue([
                {
                    activationStart: 0
                }
            ])
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        global.performance = originalPerformance;
    });

    test('When TTI resolves successfully, an event is recorded by plugin', async () => {
        const plugin: TTIPlugin = new TTIPlugin();

        // Run Plugin
        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('When TTI resolves successfully, TTI event with resolved value is recorded by plugin', async () => {
        const plugin: TTIPlugin = new TTIPlugin();

        // Run Plugin
        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(TIME_TO_INTERACTIVE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toEqual({
            value: 201,
            version: '1.0.0'
        });
    });

    test('When TTI with frames per second enabled resolves successfully, TTI event with resolved value is recorded by plugin', async () => {
        const plugin: TTIPlugin = new TTIPlugin(true);

        // Run Plugin
        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(TIME_TO_INTERACTIVE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toEqual({
            value: 201,
            version: '1.0.0'
        });
    });

    test('Disable and enable does not have effect on the plugin behavior', async () => {
        const plugin: TTIPlugin = new TTIPlugin();

        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);
        plugin.disable();
        plugin.enable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('Disable does not have effect on the plugin behavior', async () => {
        const plugin: TTIPlugin = new TTIPlugin();

        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });
});

describe('Prerendering Tests', () => {
    test('Plugin detects document.prerendering is true', async () => {
        const originalDescriptor = Object.getOwnPropertyDescriptor(
            document,
            'prerendering'
        );

        try {
            // Define document.prerendering as true
            Object.defineProperty(document, 'prerendering', {
                configurable: true,
                value: true
            });

            const plugin: TTIPlugin = new TTIPlugin();

            plugin.load(context);

            const prerenderingChangeEvent = new Event('prerenderingchange');
            document.dispatchEvent(prerenderingChangeEvent);

            expect(plugin).toBeDefined();
        } finally {
            if (originalDescriptor) {
                Object.defineProperty(
                    document,
                    'prerendering',
                    originalDescriptor
                );
            } else {
                delete (document as any).prerendering;
            }
        }
    });

    test('Plugin handles missing Performance API gracefully', async () => {
        const originalPerformance = global.performance;

        try {
            global.performance = {
                ...originalPerformance,
                getEntriesByType: undefined
            } as any;

            const plugin: TTIPlugin = new TTIPlugin();

            plugin.load(context);

            expect(plugin).toBeDefined();
        } finally {
            global.performance = originalPerformance;
        }
    });

    test('Plugin handles Performance API errors gracefully', async () => {
        // Mock performance.getEntriesByType to throw an error
        global.performance.getEntriesByType = jest
            .fn()
            .mockImplementation(() => {
                throw new Error('Test error');
            });

        const plugin: TTIPlugin = new TTIPlugin();

        expect(() => plugin.load(context)).not.toThrow();
    });

    test('Plugin records TTI event on normal page load', async () => {
        global.performance.getEntriesByType = jest.fn().mockReturnValue([
            {
                activationStart: 0 // Zero value indicates normal page load
            }
        ]);

        const plugin: TTIPlugin = new TTIPlugin();

        plugin.load(context);

        await new Promise((resolve) => process.nextTick(resolve));

        expect(record).toHaveBeenCalledWith(TIME_TO_INTERACTIVE_EVENT_TYPE, {
            value: 201,
            version: '1.0.0'
        });
    });

    test('Plugin records TTI event for prerendered page', async () => {
        global.performance.getEntriesByType = jest.fn().mockReturnValue([
            {
                activationStart: 100 // Non-zero value indicates prerendering
            }
        ]);

        const plugin: TTIPlugin = new TTIPlugin();

        plugin.load(context);

        await new Promise((resolve) => process.nextTick(resolve));
        expect(record).toHaveBeenCalledWith(TIME_TO_INTERACTIVE_EVENT_TYPE, {
            value: 201,
            version: '1.0.0'
        });
    });
});
