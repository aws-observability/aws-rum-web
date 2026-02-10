import {
    AwsCredentialIdentityProvider,
    AwsCredentialIdentity,
    HttpResponse
} from '@aws-sdk/types';
import { EventCache } from '../event-cache/EventCache';
import { DataPlaneClient, SigningConfig } from './DataPlaneClient';
import { BeaconHttpHandler } from './BeaconHttpHandler';
import { FetchHttpHandler } from './FetchHttpHandler';
import { PutRumEventsRequest } from './dataplane';
import { Config } from '../orchestration/config';
import { v4 } from 'uuid';
import { RetryHttpHandler } from './RetryHttpHandler';
import { InternalLogger } from '../utils/InternalLogger';
import { CRED_KEY, IDENTITY_KEY } from '../utils/constants';

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
    credentials?: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    compressionStrategy?: { enabled: boolean }
) => DataPlaneClient;

/**
 * A factory that creates a credential provider for Cognito authentication.
 * Injected by distribution packages (e.g., aws-rum-web) that include auth.
 */
export type CognitoCredentialProviderFactory = (
    config: Config,
    applicationId: string,
    identityPoolId: string,
    guestRoleArn?: string
) => AwsCredentialIdentityProvider;

/**
 * A factory that creates a SigningConfig for request signing.
 * Injected by distribution packages that include signing support.
 */
export type SigningConfigFactory = (
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    region: string
) => SigningConfig;

export class Dispatch {
    private applicationId: string;
    private region: string;
    private endpoint: URL;
    private eventCache: EventCache;
    private rum: DataPlaneClientInterface;
    private enabled: boolean;
    private dispatchTimerId: number | undefined;
    private buildClient: ClientBuilder;
    private config: Config;
    private disableCodes = ['403', '404'];
    private headers: any;
    private credentialProvider:
        | AwsCredentialIdentity
        | AwsCredentialIdentityProvider
        | undefined;

    private shouldPurgeCredentials = true;
    private credentialStorageKey: string;
    private identityStorageKey: string;
    private cognitoCredentialProviderFactory?: CognitoCredentialProviderFactory;
    private signingConfigFactory?: SigningConfigFactory;

    constructor(
        applicationId: string,
        region: string,
        endpoint: URL,
        eventCache: EventCache,
        config: Config
    ) {
        this.applicationId = applicationId;
        this.region = region;
        this.endpoint = endpoint;
        this.eventCache = eventCache;
        this.enabled = true;
        this.buildClient = config.clientBuilder || this.defaultClientBuilder;
        this.config = config;
        this.headers = config.headers;
        this.startDispatchTimer();
        if (config.signing) {
            this.rum = {
                sendFetch: (): Promise<{ response: HttpResponse }> => {
                    return Promise.reject(new Error(NO_CRED_MSG));
                },
                sendBeacon: (): Promise<{ response: HttpResponse }> => {
                    return Promise.reject(new Error(NO_CRED_MSG));
                }
            };
        } else {
            this.rum = this.buildClient(
                this.endpoint,
                this.region,
                undefined,
                this.config.compressionStrategy
            );
        }

        this.credentialStorageKey = this.config.cookieAttributes.unique
            ? `${CRED_KEY}_${applicationId}`
            : CRED_KEY;

        this.identityStorageKey = this.config.cookieAttributes.unique
            ? `${IDENTITY_KEY}_${applicationId}`
            : IDENTITY_KEY;
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
        InternalLogger.warn('Dispatch disabled');
    }

    /**
     * Set the authentication token that will be used to authenticate with the
     * data plane service (AWS auth).
     *
     * @param credentials A set of AWS credentials from the application's authflow.
     */
    public setAwsCredentials(
        credentialProvider:
            | AwsCredentialIdentity
            | AwsCredentialIdentityProvider
    ): void {
        this.credentialProvider = credentialProvider;
        this.rum = this.buildClient(
            this.endpoint,
            this.region,
            credentialProvider,
            this.config.compressionStrategy
        );
        if (typeof credentialProvider === 'function') {
            // In case a beacon in the first dispatch, we must pre-fetch credentials into a cookie so there is no delay
            // to fetch credentials while the page is closing.
            (credentialProvider as () => Promise<AwsCredentialIdentity>)();
        }
    }

    /**
     * Set the factory used to create Cognito credential providers.
     * This is injected by distribution packages that include auth support.
     */
    public setCognitoCredentialProviderFactory(
        factory: CognitoCredentialProviderFactory
    ): void {
        this.cognitoCredentialProviderFactory = factory;
    }

    /**
     * Set the factory used to create signing configurations.
     * This is injected by distribution packages that include signing support.
     */
    public setSigningConfigFactory(factory: SigningConfigFactory): void {
        this.signingConfigFactory = factory;
    }

    /**
     * Initialize Cognito credentials using the injected factory.
     * If no factory has been set, this is a no-op.
     */
    public setCognitoCredentials(
        identityPoolId: string,
        guestRoleArn?: string
    ) {
        if (!this.cognitoCredentialProviderFactory) {
            return;
        }
        this.setAwsCredentials(
            this.cognitoCredentialProviderFactory(
                this.config,
                this.applicationId,
                identityPoolId,
                guestRoleArn
            )
        );
    }

    /**
     * Send meta data and events to the AWS RUM data plane service via fetch.
     */
    public dispatchFetch = async (): Promise<
        { response: HttpResponse } | undefined
    > => {
        if (this.doRequest()) {
            const request = this.createRequest();
            InternalLogger.info(
                `Dispatching ${request.RumEvents.length} events via fetch`
            );
            return this.rum.sendFetch(request).catch(this.handleReject);
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
            InternalLogger.info(
                `Dispatching ${request.RumEvents.length} events via beacon`
            );
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
        return this.dispatchFetch().catch((e) => {
            InternalLogger.error('Dispatch fetch failed silently:', e);
        });
    };

    /**
     * Send meta data and events to the AWS RUM data plane service via beacon.
     *
     * Returns undefined on failure.
     */
    public dispatchBeaconFailSilent = async (): Promise<{
        response: HttpResponse;
    } | void> => {
        return this.dispatchBeacon().catch((e) => {
            InternalLogger.error('Dispatch beacon failed silently:', e);
        });
    };

    private flushSync: EventListener = () => {
        if (document.visibilityState === 'hidden') {
            if (this.doRequest(true)) {
                let flush = this.rum.sendBeacon;
                let backup = this.rum.sendFetch;

                if (!this.config.useBeacon) {
                    [flush, backup] = [backup, flush];
                }

                const req = this.createRequest(true);
                InternalLogger.debug(
                    `Flushing ${req.RumEvents.length} events on page hide`
                );
                flush(req)
                    .catch(() => backup(req))
                    .catch((e) => {
                        InternalLogger.error('Page hide flush failed:', e);
                    });
            }
        }
    };

    /**
     * Automatically dispatch cached events.
     */
    public startDispatchTimer() {
        document.addEventListener('visibilitychange', this.flushSync);
        document.addEventListener('pagehide', this.flushSync);
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
        document.removeEventListener('visibilitychange', this.flushSync);
        document.removeEventListener('pagehide', this.flushSync);
        if (this.dispatchTimerId) {
            window.clearInterval(this.dispatchTimerId);
            this.dispatchTimerId = undefined;
        }
    }

    private doRequest(flush = false): boolean {
        if (!this.enabled) {
            return false;
        }

        if (flush && this.eventCache.hasCandidates()) {
            return true;
        }

        return this.eventCache.hasEvents();
    }

    private createRequest(flush = false): PutRumEventsRequest {
        return {
            BatchId: v4(),
            AppMonitorDetails: this.eventCache.getAppMonitorDetails(),
            UserDetails: this.eventCache.getUserDetails(),
            RumEvents: this.eventCache.getEventBatch(flush),
            Alias: this.config.alias
        };
    }

    private handleReject = (e: any): { response: HttpResponse } => {
        if (e instanceof Error) {
            if (
                e.message === '403' &&
                this.config.signing &&
                this.shouldPurgeCredentials
            ) {
                this.shouldPurgeCredentials = false;
                this.forceRebuildClient();
            } else if (this.disableCodes.includes(e.message)) {
                InternalLogger.error(
                    'Dispatch failed with status code:',
                    e.message
                );
                this.disable();
            }
        }
        throw e;
    };

    /**
     * The default method for creating data plane service clients.
     */
    private defaultClientBuilder: ClientBuilder = (
        endpoint,
        region,
        credentials,
        compressionStrategy
    ) => {
        const signing =
            credentials && this.signingConfigFactory
                ? this.signingConfigFactory(credentials, region)
                : undefined;
        return new DataPlaneClient(
            {
                fetchRequestHandler: new RetryHttpHandler(
                    new FetchHttpHandler({
                        fetchFunction: this.config.fetchFunction
                    }),
                    this.config.retries
                ),
                beaconRequestHandler: new BeaconHttpHandler(),
                endpoint,
                region,
                credentials,
                headers: this.headers,
                compressionStrategy
            },
            signing
        );
    };

    /**
     * Purges the cached credentials and rebuilds the dataplane client.
     */
    private forceRebuildClient() {
        InternalLogger.warn('Removing credentials from local storage');
        localStorage.removeItem(this.credentialStorageKey);

        if (this.config.identityPoolId) {
            InternalLogger.info(
                'Rebuilding client with fresh cognito credentials'
            );
            localStorage.removeItem(this.identityStorageKey);
            this.setCognitoCredentials(
                this.config.identityPoolId,
                this.config.guestRoleArn
            );
        } else if (this.credentialProvider) {
            InternalLogger.info(
                'Rebuilding client with most recently passed provider'
            );
            this.setAwsCredentials(this.credentialProvider);
        }
    }
}
