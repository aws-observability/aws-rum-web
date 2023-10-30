import { TTIBoomerang } from '../../../time-to-interactive/TTIBoomerang';
import { mockLongTaskPerformanceObserver } from '../../../test-utils/mock-data';
import { TTIPlugin } from '../TTIPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../../../plugins/utils/constant';

describe('Time to Interactive - Plugin Tests', () => {
    beforeEach(() => {
        // some setup
        mockLongTaskPerformanceObserver();
        record.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('When TTI resolves successfully, an event is recorded by plugin', async () => {
        jest.spyOn(
            TTIBoomerang.prototype,
            'computeTimeToInteractive'
        ).mockResolvedValueOnce(880);
        const plugin: TTIPlugin = new TTIPlugin();

        // Run Plugin
        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('When TTI resolves successfully, TTI event with resolved value is recorded by plugin', async () => {
        jest.spyOn(
            TTIBoomerang.prototype,
            'computeTimeToInteractive'
        ).mockResolvedValueOnce(880);
        const plugin: TTIPlugin = new TTIPlugin();

        // Run Plugin
        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(TIME_TO_INTERACTIVE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toEqual({
            value: 880,
            version: '1.0.0'
        });
    });

    test('When TTI does not resolve, TTI event is not recorded by plugin', async () => {
        jest.spyOn(
            TTIBoomerang.prototype,
            'computeTimeToInteractive'
        ).mockRejectedValueOnce('sample rejection');
        const plugin: TTIPlugin = new TTIPlugin();

        // Run Plugin
        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });
    test('Disable and enable does not have effect on the plugin behavior', async () => {
        jest.spyOn(
            TTIBoomerang.prototype,
            'computeTimeToInteractive'
        ).mockResolvedValueOnce(880);
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
        jest.spyOn(
            TTIBoomerang.prototype,
            'computeTimeToInteractive'
        ).mockResolvedValueOnce(880);
        const plugin: TTIPlugin = new TTIPlugin();

        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('Disable does not have effect on the plugin behavior', async () => {
        jest.spyOn(
            TTIBoomerang.prototype,
            'computeTimeToInteractive'
        ).mockResolvedValueOnce(880);
        const plugin: TTIPlugin = new TTIPlugin();

        plugin.load(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        await new Promise(process.nextTick);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });
});
