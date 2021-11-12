import { CredentialProvider, Credentials, HttpResponse } from '@aws-sdk/types';
import { EventCache } from '../event-cache/EventCache';
import { DataPlaneClient } from './DataPlaneClient';
import { BeaconHttpHandler } from './BeaconHttpHandler';
import { FetchHttpHandler } from './FetchHttpHandler';
import { PutRumEventsRequest } from './dataplane';
import { Config } from '../orchestration/Orchestration';
import { v4 } from 'uuid';

type SendFunction = (
    putRumEventsRequest: PutRumEventsRequest
) => Promise<{ response: HttpResponse }>;

interface DataPlaneClientInterface {
    sendFetch: (
        putRumEventsRequest: PutRumEventsRequest
    ) => Promise<{ response: HttpResponse }>;
    sendBeacon: (
        putRumEventsRequest: PutRumEventsRequest
    ) => Promise<{ response: HttpResponse }>;
}

const NO_CRED_MSG = 'CWR: Cannot dispatch; no AWS credentials.';

export type ClientBuilder = (
    endpoint: string,
    region: string,
    credentials: CredentialProvider | Credentials
) => DataPlaneClient;

export class Dispatch {
    private region: string;
    private endpoint: string;
    private eventCache: EventCache;
    private rum: DataPlaneClientInterface;
    private enabled: boolean;
    private dispatchTimerId: number | undefined;
    private buildClient: ClientBuilder;
    private config: Config;

    constructor(
        region: string,
        endpoint: string,
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
    public dispatchFetch = async (): Promise<{ response: HttpResponse }> => {
        return this.dispatch(this.rum.sendFetch)
            .then(this.handleResponse)
            .catch(this.handleReject);
    };

    /**
     * Send meta data and events to the AWS RUM data plane service via beacon.
     */
    public dispatchBeacon = async (): Promise<{ response: HttpResponse }> => {
        return this.dispatch(this.rum.sendBeacon).catch(this.handleReject);
    };

    /**
     * Send meta data and events to the AWS RUM data plane service via fetch.
     *
     * Returns undefined on failure.
     */
    public dispatchFetchFailSilent = async (): Promise<{
        response: HttpResponse;
    } | void> => {
        // tslint:disable-next-line:no-empty
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
        // tslint:disable-next-line:no-empty
        return this.dispatchBeacon().catch(() => {});
    };

    /**
     * Automatically dispatch cached events.
     */
    public startDispatchTimer() {
        document.addEventListener(
            'visibilitychange',
            this.dispatchBeaconFailSilent
        );
        document.addEventListener('pagehide', this.dispatchBeaconFailSilent);
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
            this.dispatchBeaconFailSilent
        );
        document.removeEventListener('pagehide', this.dispatchBeaconFailSilent);
        if (this.dispatchTimerId) {
            window.clearInterval(this.dispatchTimerId);
            this.dispatchTimerId = undefined;
        }
    }

    private async dispatch(
        send: SendFunction
    ): Promise<{ response: HttpResponse }> {
        if (!this.enabled) {
            return;
        }

        if (!this.eventCache.hasEvents()) {
            return;
        }

        const putRumEventsRequest: PutRumEventsRequest = {
            BatchId: v4(),
            AppMonitorDetails: this.eventCache.getAppMonitorDetails(),
            UserDetails: this.eventCache.getUserDetails(),
            RumEvents: this.eventCache.getEventBatch()
        };

        return send(putRumEventsRequest);
    }

    private handleReject = (e: any): { response: HttpResponse } => {
        // Terminate the dispatch process on any failure. We do not re-try
        // requests for analytics data.
        this.disable();
        throw e;
    };

    private handleResponse = (response: {
        response: HttpResponse;
    }): { response: HttpResponse } => {
        if (response && !this.isStatusCode2xx(response.response.statusCode)) {
            // Terminate the dispatch process on any failure. We do not re-try
            // requests for analytics data.
            this.disable();
        }
        return response;
    };

    private isStatusCode2xx = (statusCode: number): boolean => {
        return statusCode >= 200 && statusCode < 300;
    };

    /**
     * The default method for creating data plane service clients.
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
            fetchRequestHandler: new FetchHttpHandler({
                fetchFunction: this.config.fetchFunction
            }),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint,
            region,
            credentials
        });
    };
}
