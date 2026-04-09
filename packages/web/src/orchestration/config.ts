import {
    Config as CoreConfig,
    CookieAttributes,
    Telemetry
} from '@aws-rum/web-core/orchestration/config';
import { defaultConfig as slimDefaultConfig } from '@aws-rum/web-slim/orchestration/Orchestration';

// Re-export core types for backward compatibility
export {
    CookieAttributes,
    PartialCookieAttributes,
    CompressionStrategy,
    Telemetry,
    PageIdFormat
} from '@aws-rum/web-core/orchestration/config';

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

export { defaultCookieAttributes } from '@aws-rum/web-slim/orchestration/Orchestration';

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
