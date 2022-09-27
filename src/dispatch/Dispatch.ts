import { CredentialProvider, Credentials, HttpResponse } from '@aws-sdk/types';
import { EventCache } from '../event-cache/EventCache';
import { DataPlaneClient } from './DataPlaneClient';
import { BeaconHttpHandler } from './BeaconHttpHandler';
import { FetchHttpHandler } from './FetchHttpHandler';
import { PutRumEventsRequest } from './dataplane';
import { Config } from '../orchestration/Orchestration';
import { v4 } from 'uuid';
import { RetryHttpHandler } from './RetryHttpHandler';

type SendFunction = (
    putRumEventsRequest: PutRumEventsRequest
) => Promise<{ response: HttpResponse }>;

interface DataPlaneClientInterface {
    sendFetch: SendFunction;
    sendBeacon: SendFunction;
}

const NO_CRED_MSG = 'CWR: Cannot dispatch; no AWS credentials.';

export type ClientBuilder = (
    endpoint: URL,
    region: string,
    credentials: CredentialProvider | Credentials
) => DataPlaneClient;

export class Dispatch {
    private region: string;
    private endpoint: URL;
    private eventCache: EventCache;
    private rum: DataPlaneClientInterface;
    private enabled: boolean;
    private dispatchTimerId: number | undefined;
    private buildClient: ClientBuilder;
    private config: Config;

    constructor(
        region: string,
        endpoint: URL,
        eventCache: EventCache,
        config: Config
    ) {
        this.region = region;
        this.endpoint = endpoint;
        this.eventCache = eventCache;
        this.enabled = true;
        this.buildClient = config.clientBuilder || this.defaultClientBuilder;
        this.config = config;
        this.startDispatchTimer();
        this.rum = {
            sendFetch: (): Promise<{ response: HttpResponse }> => {
                return Promise.reject(new Error(NO_CRED_MSG));
            },
            sendBeacon: (): Promise<{ response: HttpResponse }> => {
                return Promise.reject(new Error(NO_CRED_MSG));
            }
        };
    }

    /**
     * Dispatch will send requests to data plane.
     */
    public enable(): void {
        this.enabled = true;
        this.startDispatchTimer();
    }

    /**
     * Dispatch will not send requests to data plane.
     */
    public disable(): void {
        this.stopDispatchTimer();
        this.enabled = false;
    }

    /**
     * Set the authentication token that will be used to authenticate with the
     * data plane service (AWS auth).
     *
     * @param credentials A set of AWS credentials from the application's authflow.
     */
    public setAwsCredentials(
        credentialProvider: Credentials | CredentialProvider
    ): void {
        this.rum = this.buildClient(
            this.endpoint,
            this.region,
            credentialProvider
        );
        if (typeof credentialProvider === 'function') {
            // In case a beacon in the first dispatch, we must pre-fetch credentials into a cookie so there is no delay
            // to fetch credentials while the page is closing.
            (credentialProvider as () => Promise<Credentials>)();
        }
    }

    /**
     * Send meta data and events to the AWS RUM data plane service via fetch.
     */
    public dispatchFetch = async (): Promise<
        { response: HttpResponse } | undefined
    > => {
        if (this.doRequest()) {
            return this.rum
                .sendFetch(this.createRequest())
                .catch(this.handleReject);
        }
    };

    /**
     * Send meta data and events to the AWS RUM data plane service via beacon.
     */
    public dispatchBeacon = async (): Promise<
        { response: HttpResponse } | undefined
    > => {
        if (this.doRequest()) {
            const request: PutRumEventsRequest = this.createRequest();
            return this.rum
                .sendBeacon(request)
                .catch(() => this.rum.sendFetch(request));
        }
    };

    /**
     * Send meta data and events to the AWS RUM data plane service via fetch.
     *
     * Returns undefined on failure.
     */
    public dispatchFetchFailSilent = async (): Promise<{
        response: HttpResponse;
    } | void> => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return this.dispatchFetch().catch(() => {});
    };

    /**
     * Send meta data and events to the AWS RUM data plane service via beacon.
     *
     * Returns undefined on failure.
     */
    public dispatchBeaconFailSilent = async (): Promise<{
        response: HttpResponse;
    } | void> => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return this.dispatchBeacon().catch(() => {});
    };

    /**
     * Automatically dispatch cached events.
     */
    public startDispatchTimer() {
        document.addEventListener(
            'visibilitychange',
            // The page is moving to the hidden state, which means it may be
            // unloaded. The sendBeacon API would typically be used in this
            // case. However, ad-blockers prevent sendBeacon from functioning.
            // We therefore have two bad options:
            //
            // (1) Use sendBeacon. Data will be lost when ad blockers are
            //     used and the page loses visibility
            // (2) Use fetch. Data will be lost when the page is unloaded
            //     before fetch completes
            //
            // A third option is to send both, however this would increase
            // bandwitch and require deduping server side.
            this.config.useBeacon
                ? this.dispatchBeaconFailSilent
                : this.dispatchFetchFailSilent
        );
        // Using 'pagehide' is redundant most of the time (visibilitychange is
        // always fired before pagehide) but older browsers may support
        // 'pagehide' but not 'visibilitychange'.
        document.addEventListener(
            'pagehide',
            this.config.useBeacon
                ? this.dispatchBeaconFailSilent
                : this.dispatchFetchFailSilent
        );
        if (this.config.dispatchInterval <= 0 || this.dispatchTimerId) {
            return;
        }
        this.dispatchTimerId = window.setInterval(
            this.dispatchFetchFailSilent,
            this.config.dispatchInterval
        );
    }

    /**
     * Stop automatically dispatching cached events.
     */
    public stopDispatchTimer() {
        document.removeEventListener(
            'visibilitychange',
            this.config.useBeacon
                ? this.dispatchBeaconFailSilent
                : this.dispatchFetchFailSilent
        );
        document.removeEventListener(
            'pagehide',
            this.config.useBeacon
                ? this.dispatchBeaconFailSilent
                : this.dispatchFetchFailSilent
        );
        if (this.dispatchTimerId) {
            window.clearInterval(this.dispatchTimerId);
            this.dispatchTimerId = undefined;
        }
    }

    private doRequest(): boolean {
        return this.enabled && this.eventCache.hasEvents();
    }

    private createRequest(): PutRumEventsRequest {
        return {
            BatchId: v4(),
            AppMonitorDetails: this.eventCache.getAppMonitorDetails(),
            UserDetails: this.eventCache.getUserDetails(),
            RumEvents: this.eventCache.getEventBatch()
        };
    }

    private handleReject = (e: any): { response: HttpResponse } => {
        // The handler has run out of retries. We adhere to our convention to
        // fail safe by disabling dispatch. This ensures that we will not
        // continue to attempt requests when the problem is not recoverable.
        this.disable();
        throw e;
    };

    /**
     * The default method for creating data plane service clients.
     *
     * @param endpoint Service endpoint.
     * @param region  Service region.
     * @param credentials AWS credentials.
     */
    private defaultClientBuilder: ClientBuilder = (
        endpoint,
        region,
        credentials
    ) => {
        return new DataPlaneClient({
            fetchRequestHandler: new RetryHttpHandler(
                new FetchHttpHandler({
                    fetchFunction: this.config.fetchFunction
                }),
                this.config.retries
            ),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint,
            region,
            credentials
        });
    };
}
