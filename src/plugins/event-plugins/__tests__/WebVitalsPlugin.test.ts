import { WebVitalsPlugin } from '../WebVitalsPlugin';
import { context, record } from '../../../test-utils/test-utils';
import {
    CLS_EVENT_TYPE,
    FID_EVENT_TYPE,
    LCP_EVENT_TYPE
} from '../../utils/constant';

const mockLCPData = {
    delta: 239.51,
    id: 'v1-1621403597701-7933189041053',
    name: 'LCP',
    value: 239.51
};

const mockFIDData = {
    delta: 1.2799999676644802,
    id: 'v1-1621403597702-6132885858466',
    name: 'FID',
    value: 1.2799999676644802
};

const mockCLSData = {
    delta: 0,
    id: 'v1-1621403597702-8740659462223',
    name: 'CLS',
    value: 0.037451866876684094
};

jest.mock('web-vitals', () => {
    return {
        getLCP: jest
            .fn()
            .mockImplementation((callback) =>
                callback(mockLCPData, LCP_EVENT_TYPE)
            ),
        getFID: jest
            .fn()
            .mockImplementation((callback) =>
                callback(mockFIDData, FID_EVENT_TYPE)
            ),
        getCLS: jest
            .fn()
            .mockImplementation((callback) =>
                callback(mockCLSData, CLS_EVENT_TYPE)
            )
    };
});

describe('WebVitalsPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
    });

    test('When web vitals are present then events are recorded', async () => {
        // Setup
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        // Run
        plugin.load(context);
        window.dispatchEvent(new Event('load'));

        // Assert
        expect(record).toHaveBeenCalledTimes(3);

        expect(record.mock.calls[0][0]).toEqual(LCP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                value: mockLCPData.value
            })
        );

        expect(record.mock.calls[1][0]).toEqual(FID_EVENT_TYPE);
        expect(record.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                value: mockFIDData.value
            })
        );

        expect(record.mock.calls[2][0]).toEqual(CLS_EVENT_TYPE);
        expect(record.mock.calls[2][1]).toEqual(
            expect.objectContaining({
                version: '1.0.0',
                value: mockCLSData.value
            })
        );
    });

    test('Disable and enable does not have effect on the plugin behavior', async () => {
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        plugin.load(context);
        plugin.disable();
        plugin.enable();
        window.dispatchEvent(new Event('load'));

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('Disable does not have effect on the plugin behavior', async () => {
        const plugin: WebVitalsPlugin = new WebVitalsPlugin();

        plugin.load(context);
        plugin.disable();
        window.dispatchEvent(new Event('load'));

        // Assert
        expect(record).toHaveBeenCalled();
    });
});
