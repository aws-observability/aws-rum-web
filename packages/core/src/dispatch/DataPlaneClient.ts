import {
    AwsCredentialIdentityProvider,
    AwsCredentialIdentity,
    HttpResponse,
    HeaderBag
} from '@aws-sdk/types';
import { HttpHandler, HttpRequest } from '@smithy/protocol-http';
import {
    AppMonitorDetails,
    PutRumEventsRequest,
    UserDetails,
    RumEvent
} from './dataplane';
import { compressIfBeneficial } from './compression';
import { CompressionStrategy } from '../orchestration/config';

const METHOD = 'POST';
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_TEXT = 'text/plain;charset=UTF-8';

// SendBeacon payload limit. Browsers typically enforce a 64 KiB limit on
// the data parameter passed to navigator.sendBeacon. We compare against
// string length (UTF-16 code units) rather than exact byte size to avoid
// allocating a Blob on every dispatch. For ASCII-dominant JSON payloads
// this is effectively equal to byte size; for multi-byte characters
// string length undercounts UTF-8 bytes, but the ~1.5 KB margin between
// this threshold and the real 65,536-byte limit absorbs that difference.
const BEACON_PAYLOAD_LIMIT = 64_000;

declare type SerializedRumEvent = {
    id: string;
    timestamp: number; // unix timestamp in seconds
    type: string;
    metadata?: string;
    details: string;
};

declare type SerializedPutRumEventsRequest = {
    BatchId: string;
    AppMonitorDetails: AppMonitorDetails;
    UserDetails: UserDetails;
    RumEvents: SerializedRumEvent[];
    Alias?: string;
};

export declare type DataPlaneClientConfig = {
    fetchRequestHandler: HttpHandler;
    beaconRequestHandler: HttpHandler;
    endpoint: URL;
    region: string;
    credentials:
        | AwsCredentialIdentityProvider
        | AwsCredentialIdentity
        | undefined;
    headers?: HeaderBag;
    compressionStrategy?: CompressionStrategy;
};

/**
 * Signs an HttpRequest and returns the signed request.
 */
export type RequestSigner = (request: HttpRequest) => Promise<HttpRequest>;

/**
 * Pre-signs an HttpRequest (for beacon/query-string signing) and returns the signed request.
 */
export type RequestPresigner = (request: HttpRequest) => Promise<HttpRequest>;

/**
 * Computes a content hash for the given payload.
 */
export type ContentHasher = (payload: string | Uint8Array) => Promise<string>;

export declare type SigningConfig = {
    sign: RequestSigner;
    presign: RequestPresigner;
    hashAndEncode: ContentHasher;
};

export class DataPlaneClient {
    private config: DataPlaneClientConfig;
    private signing?: SigningConfig;

    constructor(config: DataPlaneClientConfig, signing?: SigningConfig) {
        this.config = config;
        this.signing = signing;
    }

    public sendFetch = async (
        putRumEventsRequest: PutRumEventsRequest
    ): Promise<{ response: HttpResponse }> => {
        const serializedRequest = JSON.stringify(
            serializeRequest(putRumEventsRequest)
        );

        const compressionEnabled =
            this.config.compressionStrategy?.enabled ?? false;
        const { body, compressed } = compressionEnabled
            ? await compressIfBeneficial(serializedRequest)
            : { body: serializedRequest, compressed: false };

        const options = await this.getHttpRequestOptions(
            putRumEventsRequest,
            body,
            CONTENT_TYPE_JSON,
            compressed
        );
        let request: HttpRequest = new HttpRequest(options);
        if (this.signing) {
            request = await this.signing.sign(request);
        }
        return this.config.fetchRequestHandler.handle(request);
    };

    public sendBeacon = async (
        putRumEventsRequest: PutRumEventsRequest
    ): Promise<{ response: HttpResponse }> => {
        const serializedRequest = JSON.stringify(
            serializeRequest(putRumEventsRequest)
        );

        // Guard against the ~64 KiB sendBeacon payload limit. When the
        // serialized body exceeds the threshold we reject immediately so
        // the caller can fall back to fetch without wasting time on
        // presigning.
        if (serializedRequest.length > BEACON_PAYLOAD_LIMIT) {
            throw new Error('Payload too large for sendBeacon');
        }

        const options = await this.getHttpRequestOptions(
            putRumEventsRequest,
            serializedRequest,
            CONTENT_TYPE_TEXT,
            false
        );
        let request: HttpRequest = new HttpRequest(options);
        if (this.signing) {
            request = await this.signing.presign(request);
        }
        return this.config.beaconRequestHandler.handle(request);
    };

    private getHttpRequestOptions = async (
        putRumEventsRequest: PutRumEventsRequest,
        body: string | Uint8Array,
        contentType: string,
        compressed: boolean
    ) => {
        const path = this.config.endpoint.pathname.replace(/\/$/, '');
        const headers: Record<string, string> = {
            'content-type': contentType,
            host: this.config.endpoint.host,
            ...this.config.headers
        };
        if (compressed) {
            headers['Content-Encoding'] = 'gzip';
        }
        const options = {
            method: METHOD,
            protocol: this.config.endpoint.protocol,
            port: Number(this.config.endpoint.port) || undefined,
            headers,
            hostname: this.config.endpoint.hostname,
            path: `${path}/appmonitors/${putRumEventsRequest.AppMonitorDetails.id}`,
            body
        };
        if (this.signing) {
            return {
                ...options,
                headers: {
                    ...options.headers,
                    'X-Amz-Content-Sha256': await this.signing.hashAndEncode(
                        body
                    )
                }
            };
        }
        return options;
    };
}

export const serializeRequest = (
    request: PutRumEventsRequest
): SerializedPutRumEventsRequest => {
    const serializedRumEvents: SerializedRumEvent[] = [];
    request.RumEvents.forEach((e) =>
        serializedRumEvents.push(serializeEvent(e))
    );
    let serializedRequest: SerializedPutRumEventsRequest = {
        BatchId: request.BatchId,
        AppMonitorDetails: request.AppMonitorDetails,
        UserDetails: request.UserDetails,
        RumEvents: serializedRumEvents
    };
    if (request.Alias) {
        serializedRequest = { ...serializedRequest, Alias: request.Alias };
    }
    return serializedRequest;
};

const serializeEvent = (event: RumEvent): SerializedRumEvent => {
    return {
        id: event.id,
        timestamp: Math.round(event.timestamp.getTime() / 1000),
        type: event.type,
        metadata: event.metadata,
        details: event.details
    };
};
