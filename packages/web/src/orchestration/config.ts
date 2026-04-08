import {
    Config as CoreConfig,
    CookieAttributes,
    Telemetry
} from '@aws-rum/web-core/orchestration/config';
import { INSTALL_MODULE } from '@aws-rum/web-core/utils/constants';

// Re-export core types for backward compatibility
export {
    CookieAttributes,
    PartialCookieAttributes,
    CompressionStrategy,
    Telemetry,
    PageIdFormat
} from '@aws-rum/web-core/orchestration/config';

export interface Config extends CoreConfig {
    telemetries: Telemetry[];
}

export interface PartialConfig
    extends Omit<Partial<Config>, 'cookieAttributes'> {
    cookieAttributes?: Partial<CookieAttributes>;
}

export enum TelemetryEnum {
    Errors = 'errors',
    Performance = 'performance',
    Interaction = 'interaction',
    Http = 'http',
    Replay = 'replay'
}

export enum PageIdFormatEnum {
    Path = 'PATH',
    Hash = 'HASH',
    PathAndHash = 'PATH_AND_HASH'
}

const DEFAULT_REGION = 'us-west-2';
const DEFAULT_ENDPOINT = `https://dataplane.rum.${DEFAULT_REGION}.amazonaws.com`;

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
        compressionStrategy: { enabled: true },
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
        ...internalConfigOverrides
    };
};
