import { Plugin } from '../plugins/Plugin';
import { ClientBuilder } from '../dispatch/Dispatch';
import { INSTALL_MODULE } from '../utils/constants';

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

export type Telemetry = string | (string | object)[];

export type PageIdFormat = 'PATH' | 'HASH' | 'PATH_AND_HASH';

export type CookieAttributes = {
    unique: boolean;
    domain: string;
    path: string;
    sameSite: string;
    secure: boolean;
};

export type PartialCookieAttributes = Partial<CookieAttributes>;

// Compression strategy for dispatch payloads
// Currently only `enabled` is exposed; thresholds are hardcoded in compression.ts
// To make thresholds configurable, extend this type and pass to compressIfBeneficial()
export type CompressionStrategy = {
    enabled: boolean;
};

export interface Config {
    allowCookies: boolean;
    releaseId?: string;
    batchLimit: number;
    client: string;
    clientBuilder?: ClientBuilder;
    compressionStrategy: CompressionStrategy;
    cookieAttributes: CookieAttributes;
    sessionAttributes: { [k: string]: string | number | boolean };
    debug: boolean;
    disableAutoPageView: boolean;
    dispatchInterval: number;
    enableRumClient: boolean;
    enableXRay: boolean;
    endpoint: string;
    endpointUrl: URL;
    eventCacheSize: number;
    candidatesCacheSize: number;
    eventPluginsToLoad: Plugin[];
    /*
     * We must remember the fetch function before the HttpFetch plugin
     * overwrites it via monkey patch. We will use the original fetch function
     * so that we do not record requests made by the RUM web client.
     */
    fetchFunction?: (
        input: RequestInfo,
        init?: RequestInit
    ) => Promise<Response>;
    guestRoleArn?: string;
    identityPoolId?: string;
    pageIdFormat: PageIdFormat;
    pagesToExclude: RegExp[];
    pagesToInclude: RegExp[];
    signing: boolean;
    recordResourceUrl: boolean;
    retries: number;
    routeChangeComplete: number;
    routeChangeTimeout: number;
    sessionEventLimit: number;
    sessionLengthSeconds: number;
    sessionSampleRate: number;
    /**
     * Application owners think about data collection in terms of the categories
     * of data being collected. For example, JavaScript errors, page load
     * performance, user journeys and user interactions are data collection
     * categories. However, there is not a 1-1 mapping between data collection
     * categories and plugins.
     *
     * This configuration option allows application owners to define the data
     * categories they want to collect without needing to understand and
     * instantiate each plugin themselves. The toolkit will instantiate the
     * plugins which map to the selected categories.
     */
    telemetries: Telemetry[];
    useBeacon: boolean;
    userIdRetentionDays: number;
    alias?: string;
    headers?: Record<string, string>;
    enableW3CTraceId: boolean;

    // Deprecated features; enable with caution
    legacySPASupport: boolean; // See https://github.com/aws-observability/aws-rum-web/issues/723
}

export interface PartialConfig
    extends Omit<Partial<Config>, 'cookieAttributes'> {
    cookieAttributes?: PartialCookieAttributes;
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
        legacySPASupport: false, // deprecated
        ...internalConfigOverrides
    };
};
