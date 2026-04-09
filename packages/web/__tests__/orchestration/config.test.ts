import {
    defaultConfig,
    defaultCookieAttributes,
    TelemetryEnum
} from '../../src/orchestration/config';

describe('web config', () => {
    test('defaultCookieAttributes returns secure strict defaults', () => {
        const attrs = defaultCookieAttributes();
        expect(attrs.unique).toBe(false);
        expect(attrs.domain).toBe(window.location.hostname);
        expect(attrs.path).toBe('/');
        expect(attrs.sameSite).toBe('Strict');
        expect(attrs.secure).toBe(true);
    });

    test('defaultConfig has signing enabled', () => {
        const config = defaultConfig(defaultCookieAttributes());
        expect(config.signing).toBe(true);
    });

    test('defaultConfig has compression enabled', () => {
        const config = defaultConfig(defaultCookieAttributes());
        expect(config.compressionStrategy.enabled).toBe(true);
    });

    test('defaultConfig has standard telemetries enabled', () => {
        const config = defaultConfig(defaultCookieAttributes());
        expect(config.telemetries).toEqual([
            TelemetryEnum.Errors,
            TelemetryEnum.Performance,
            TelemetryEnum.Http,
            TelemetryEnum.Replay
        ]);
    });

    test('defaultConfig has candidatesCacheSize overridden to 10', () => {
        const config = defaultConfig(defaultCookieAttributes());
        expect(config.candidatesCacheSize).toBe(10);
    });

    test('defaultConfig endpoint defaults to us-west-2', () => {
        const config = defaultConfig(defaultCookieAttributes());
        expect(config.endpoint).toBe(
            'https://dataplane.rum.us-west-2.amazonaws.com'
        );
    });

    test('defaultConfig does not include identityPoolId or guestRoleArn', () => {
        const config = defaultConfig(defaultCookieAttributes());
        expect(config.identityPoolId).toBeUndefined();
        expect(config.guestRoleArn).toBeUndefined();
    });
});
