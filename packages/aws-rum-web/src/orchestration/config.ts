import {
    Config,
    CookieAttributes,
    PageIdFormat,
    UserAgentDetails
} from '@aws-rum-web/core/orchestration/config';
import { INSTALL_MODULE } from '@aws-rum-web/core/utils/constants';
import { UAParser } from 'ua-parser-js';

// Re-export core types for backward compatibility
export {
    Config,
    PartialConfig,
    CookieAttributes,
    PartialCookieAttributes,
    CompressionStrategy,
    Telemetry,
    PageIdFormat,
    UserAgentDetails
} from '@aws-rum-web/core/orchestration/config';

export enum TelemetryEnum {
    Errors = 'errors',
    Performance = 'performance',
    Interaction = 'interaction',
    Http = 'http'
}

export enum PageIdFormatEnum {
    Path = 'PATH',
    Hash = 'HASH',
    PathAndHash = 'PATH_AND_HASH'
}

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

const DESKTOP_DEVICE_TYPE = 'desktop';
const UNKNOWN = 'unknown';

const uaParserProvider = (): UserAgentDetails => {
    const ua = new UAParser(navigator.userAgent).getResult();
    return {
        browserName: ua.browser.name,
        browserVersion: ua.browser.version,
        osName: ua.os.name,
        osVersion: ua.os.version,
        deviceType: ua.device.type ?? DESKTOP_DEVICE_TYPE
    };
};

const internalConfigOverrides = {
    candidatesCacheSize: 10
};

export const defaultCookieAttributes = (): CookieAttributes => {
    return {
        unique: false,
        domain: window.location.hostname,
        path: '/',
        sameSite: 'Strict',
        secure: true
    };
};

export const defaultConfig = (cookieAttributes: CookieAttributes): Config => {
    return {
        allowCookies: false,
        batchLimit: 100,
        client: INSTALL_MODULE,
        compressionStrategy: { enabled: false },
        cookieAttributes,
        debug: false,
        disableAutoPageView: false,
        dispatchInterval: 5 * 1000,
        enableRumClient: true,
        enableXRay: false,
        endpoint: DEFAULT_ENDPOINT,
        endpointUrl: new URL(DEFAULT_ENDPOINT),
        eventCacheSize: 1000,
        eventPluginsToLoad: [],
        pageIdFormat: PageIdFormatEnum.Path,
        pagesToExclude: [],
        pagesToInclude: [/.*/],
        signing: true,
        recordResourceUrl: true,
        retries: 2,
        routeChangeComplete: 100,
        routeChangeTimeout: 10000,
        sessionAttributes: {},
        sessionEventLimit: 200,
        sessionLengthSeconds: 60 * 30,
        sessionSampleRate: 1,
        telemetries: [],
        useBeacon: true,
        userIdRetentionDays: 30,
        enableW3CTraceId: false,
        userAgentProvider: uaParserProvider,
        ...internalConfigOverrides
    };
};
