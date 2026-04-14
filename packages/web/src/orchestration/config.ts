import {
    type Config as CoreConfig,
    type CookieAttributes,
    type Telemetry
} from '@aws-rum/web-core';
import { defaultConfig as slimDefaultConfig } from '@aws-rum/web-slim';

// Re-export core types for backward compatibility
export {
    type CookieAttributes,
    type PartialCookieAttributes,
    type CompressionStrategy,
    type Telemetry,
    type PageIdFormat
} from '@aws-rum/web-core';

export interface Config extends CoreConfig {
    guestRoleArn?: string;
    identityPoolId?: string;
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

export { defaultCookieAttributes } from '@aws-rum/web-slim';

export const defaultConfig = (cookieAttributes: CookieAttributes): Config => {
    return {
        ...slimDefaultConfig(cookieAttributes),
        signing: true,
        telemetries: [
            TelemetryEnum.Errors,
            TelemetryEnum.Performance,
            TelemetryEnum.Http,
            TelemetryEnum.Replay
        ]
    };
};
