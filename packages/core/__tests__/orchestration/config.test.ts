import { userAgentDataProvider } from '@aws-rum/web-core/orchestration/config';

describe('userAgentDataProvider', () => {
    const originalUserAgentData = Object.getOwnPropertyDescriptor(
        navigator,
        'userAgentData'
    );

    afterEach(() => {
        if (originalUserAgentData) {
            Object.defineProperty(
                navigator,
                'userAgentData',
                originalUserAgentData
            );
        } else {
            delete (navigator as any).userAgentData;
        }
    });

    const setUserAgentData = (uad: any) => {
        Object.defineProperty(navigator, 'userAgentData', {
            value: uad,
            configurable: true
        });
    };

    test('when userAgentData is not available then returns undefined', () => {
        setUserAgentData(undefined);
        expect(userAgentDataProvider()).toBeUndefined();
    });

    test('when multiple brands exist then picks the non-Chromium non-Not brand', () => {
        setUserAgentData({
            brands: [
                { brand: 'Not/A)Brand', version: '8' },
                { brand: 'Chromium', version: '126' },
                { brand: 'Google Chrome', version: '126' }
            ],
            mobile: false,
            platform: 'macOS'
        });

        const result = userAgentDataProvider();

        expect(result).toEqual({
            browserName: 'Google Chrome',
            browserVersion: '126',
            osName: 'macOS',
            deviceType: 'desktop'
        });
    });

    test('when only Chromium brand exists then falls back to first brand', () => {
        setUserAgentData({
            brands: [{ brand: 'Chromium', version: '126' }],
            mobile: false,
            platform: 'Linux'
        });

        const result = userAgentDataProvider();

        expect(result).toEqual({
            browserName: 'Chromium',
            browserVersion: '126',
            osName: 'Linux',
            deviceType: 'desktop'
        });
    });

    test('when brands array is empty then browserName and browserVersion are undefined', () => {
        setUserAgentData({
            brands: [],
            mobile: false,
            platform: 'Windows'
        });

        const result = userAgentDataProvider();

        expect(result).toEqual({
            browserName: undefined,
            browserVersion: undefined,
            osName: 'Windows',
            deviceType: 'desktop'
        });
    });

    test('when mobile is true then deviceType is mobile', () => {
        setUserAgentData({
            brands: [{ brand: 'Chrome', version: '126' }],
            mobile: true,
            platform: 'Android'
        });

        expect(userAgentDataProvider()!.deviceType).toBe('mobile');
    });

    test('when mobile is false then deviceType is desktop', () => {
        setUserAgentData({
            brands: [{ brand: 'Chrome', version: '126' }],
            mobile: false,
            platform: 'macOS'
        });

        expect(userAgentDataProvider()!.deviceType).toBe('desktop');
    });

    test('when platform is set then osName is populated', () => {
        setUserAgentData({
            brands: [{ brand: 'Chrome', version: '126' }],
            mobile: false,
            platform: 'Windows'
        });

        expect(userAgentDataProvider()!.osName).toBe('Windows');
    });

    test('osVersion is always undefined', () => {
        setUserAgentData({
            brands: [{ brand: 'Chrome', version: '126' }],
            mobile: false,
            platform: 'macOS'
        });

        expect(userAgentDataProvider()!.osVersion).toBeUndefined();
    });
});
