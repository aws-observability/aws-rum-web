import { Plugin } from '../plugins/Plugin';
import { ClientBuilder } from '../dispatch/Dispatch';

export type PageIdFormat = 'PATH' | 'HASH' | 'PATH_AND_HASH';

export enum PageIdFormatEnum {
    Path = 'PATH',
    Hash = 'HASH',
    PathAndHash = 'PATH_AND_HASH'
}

export type CookieAttributes = {
    unique: boolean;
    domain: string;
    path: string;
    sameSite: string;
    secure: boolean;
};

export type PartialCookieAttributes = Partial<CookieAttributes>;

export type CompressionStrategy = {
    enabled: boolean;
};

export type Telemetry = string | (string | object)[];

export type UserAgentDetails = {
    browserName?: string;
    browserVersion?: string;
    osName?: string;
    osVersion?: string;
    deviceType?: string;
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
    telemetries: Telemetry[];
    useBeacon: boolean;
    userIdRetentionDays: number;
    alias?: string;
    headers?: Record<string, string>;
    enableW3CTraceId: boolean;
}

export interface PartialConfig
    extends Omit<Partial<Config>, 'cookieAttributes'> {
    cookieAttributes?: PartialCookieAttributes;
}

/**
 * Best-effort UA detection using navigator.userAgentData (Chromium only).
 * Returns undefined when userAgentData is not available.
 */
export const userAgentDataProvider = (): UserAgentDetails | undefined => {
    const uad = (navigator as any).userAgentData;
    if (!uad) {
        return undefined;
    }
    const brands: { brand: string; version: string }[] = uad.brands ?? [];
    const brand =
        brands.find(
            (b) => b.brand !== 'Chromium' && !b.brand.startsWith('Not')
        ) ?? brands[0];
    return {
        browserName: brand?.brand,
        browserVersion: brand?.version,
        osName: uad.platform,
        deviceType: uad.mobile ? 'mobile' : 'desktop'
    };
};
