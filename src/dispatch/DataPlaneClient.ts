import { toHex } from '@aws-sdk/util-hex-encoding';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import {
    CredentialProvider,
    Credentials,
    HttpResponse,
    RequestPresigningArguments
} from '@aws-sdk/types';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpHandler, HttpRequest } from '@aws-sdk/protocol-http';
import { getHost, getScheme } from '../utils/common-utils';
import {
    ApplicationDetails,
    LogEventsRequest,
    UserDetails,
    Event
} from './dataplane';

const SERVICE: string = 'rum';
const METHOD: string = 'POST';
const CONTENT_TYPE_JSON: string = 'application/json';
const CONTENT_TYPE_TEXT: string = 'text/plain;charset=UTF-8';

const REQUEST_PRESIGN_ARGS: RequestPresigningArguments = { expiresIn: 60 };

declare type SerializedEvent = {
    id: string | undefined;
    timestamp: Date | number | undefined;
    type: string | undefined;
    metadata?: string;
    details: string | undefined;
};

declare type SerializedRequest = {
    batch: {
        batchId: string;
        application: ApplicationDetails;
        user: UserDetails;
        events: SerializedEvent[];
    };
};

export declare type DataPlaneClientConfig = {
    fetchRequestHandler: HttpHandler;
    beaconRequestHandler: HttpHandler;
    endpoint: string;
    region: string;
    credentials: CredentialProvider | Credentials;
};

export class DataPlaneClient {
    private config: DataPlaneClientConfig;
    private awsSigV4: SignatureV4;

    constructor(config: DataPlaneClientConfig) {
        this.config = config;
        this.awsSigV4 = new SignatureV4({
            applyChecksum: true,
            credentials: config.credentials,
            region: config.region,
            service: SERVICE,
            uriEscapePath: true,
            sha256: Sha256
        });
    }

    public sendFetch = async (
        logEventsRequest: LogEventsRequest
    ): Promise<{ response: HttpResponse }> => {
        const host = getHost(this.config.endpoint);
        const serializedRequest: string = JSON.stringify(
            serializeRequest(logEventsRequest)
        );
        const request = new HttpRequest({
            method: METHOD,
            headers: {
                'content-type': CONTENT_TYPE_JSON,
                'X-Amz-Content-Sha256': await hashAndEncode(serializedRequest),
                host
            },
            protocol: getScheme(this.config.endpoint),
            hostname: host,
            path: `/application/${logEventsRequest.applicationId}/events`,
            body: serializedRequest
        });

        // @ts-ignore
        const signedRequest: HttpRequest = await this.awsSigV4.sign(request);
        const httpResponse: Promise<{
            response: HttpResponse;
        }> = this.config.fetchRequestHandler.handle(signedRequest);
        return httpResponse;
    };

    public sendBeacon = async (
        logEventsRequest: LogEventsRequest
    ): Promise<{ response: HttpResponse }> => {
        const host = getHost(this.config.endpoint);
        const serializedRequest: string = JSON.stringify(
            serializeRequest(logEventsRequest)
        );
        const request = new HttpRequest({
            method: METHOD,
            headers: {
                'content-type': CONTENT_TYPE_TEXT,
                'X-Amz-Content-Sha256': await hashAndEncode(serializedRequest),
                host
            },
            protocol: getScheme(this.config.endpoint),
            hostname: host,
            path: `/application/${logEventsRequest.applicationId}/events`,
            body: serializedRequest
        });

        // @ts-ignore
        const preSignedRequest: HttpRequest = await this.awsSigV4.presign(
            request,
            REQUEST_PRESIGN_ARGS
        );
        const httpResponse: Promise<{
            response: HttpResponse;
        }> = this.config.beaconRequestHandler.handle(preSignedRequest);
        return httpResponse;
    };
}

const serializeRequest = (request: LogEventsRequest): SerializedRequest => {
    //  If we were using the AWS SDK client here then the serialization would be handled for us through a generated
    //  serialization/deserialization library. However, since much of the generated code is unnecessary, we do the
    //  serialization ourselves with this function.
    const serializedEvents: SerializedEvent[] = [];
    request.batch.events.forEach((e) =>
        serializedEvents.push(serializeEvent(e))
    );
    const serializedRequest: SerializedRequest = {
        batch: {
            batchId: request.batch.batchId,
            application: request.batch.application,
            user: request.batch.user,
            events: serializedEvents
        }
    };
    return serializedRequest;
};

const serializeEvent = (event: Event): SerializedEvent => {
    return {
        id: event.id,
        // Dates must be converted to timestamps before serialization.
        timestamp: Math.round(event.timestamp.getTime() / 1000),
        type: event.type,
        metadata: event.metadata,
        details: event.details
    };
};

const hashAndEncode = async (payload: string) => {
    const sha256 = new Sha256();
    sha256.update(payload);
    return toHex(await sha256.digest()).toLowerCase();
};
