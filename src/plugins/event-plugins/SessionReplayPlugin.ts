import * as rrweb from 'rrweb';
// Define the eventWithTime interface based on how it's used in the code
export interface eventWithTime {
    type: number;
    data: {
        source: number;
        [key: string]: any;
    };
    [key: string]: any;
}
import { InternalPlugin } from '../InternalPlugin';
import { InternalPluginContext } from '../types';
import { Session } from '../../sessions/SessionManager';
import { Topic } from '../../event-bus/EventBus';
import {
    RUM_SESSION_START,
    RUM_SESSION_EXPIRE
} from '../../sessions/SessionManager';

export const SESSION_REPLAY_EVENT_TYPE = 'com.amazon.rum.session_replay_event';

export interface SessionReplayConfig {
    recordConfig?: {
        blockClass?: string;
        blockSelector?: string;
        maskTextClass?: string;
        maskTextSelector?: string;
        maskAllInputs?: boolean;
        // other rrweb record options
    };
    batchSize?: number;
    customBackendUrl?: string; // URL to send events to instead of using AWS RUM
    s3Config?: {
        endpoint: string; // API Gateway endpoint for S3 upload
        bucketName?: string; // Optional bucket name if not included in endpoint
        region?: string; // AWS region for S3 bucket
        additionalMetadata?: Record<string, any>; // Additional metadata to include with events
    };
}

export class SessionReplayPlugin extends InternalPlugin {
    private recorder: any = null;
    private events: eventWithTime[] = [];
    private readonly BATCH_SIZE: number;
    private config: SessionReplayConfig;
    private session?: Session;

    constructor(config: SessionReplayConfig = {}) {
        super('rrweb');
        this.config = config;
        this.BATCH_SIZE = config.batchSize || 50;
    }

    /**
     * Force flush all currently collected events.
     * This can be called manually to ensure events are sent immediately.
     * Useful before page unload or when transitioning between pages.
     */
    public forceFlush(): void {
        this.flushEvents(true);
    }

    enable(): void {
        this.enabled = true;

        // Start recording if we have a session
        if (this.session) {
            this.startRecording();
        }
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }

        this.stopRecording();
        this.enabled = false;
    }

    private startRecording(): void {
        if (this.recorder) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        try {
            console.log('[RRWebPlugin] Setting up record config');
            const recordConfig = {
                emit: (event: eventWithTime) => {
                    this.events.push(event);

                    if (this.events.length >= this.BATCH_SIZE) {
                        console.log(
                            '[RRWebPlugin] Batch size reached, flushing events'
                        );
                        this.flushEvents();
                    }
                },
                ...this.config.recordConfig
            };

            this.recorder = rrweb.record(recordConfig);
        } catch (error) {
            console.error('[RRWebPlugin] Error setting up recorder:', error);
        }
    }

    private stopRecording(): void {
        if (this.recorder) {
            this.recorder();
            this.flushEvents(); // Flush any remaining events
            this.recorder = null;
        }
    }

    private flushEvents(forced = false): void {
        if (this.events.length === 0) {
            return;
        }

        // Create a copy of the events to send
        const eventsToSend = [...this.events];

        // Clear the events array before sending to prevent race conditions
        this.events = [];

        try {
            // If S3 config is provided, send to S3 endpoint
            if (this.config.s3Config?.endpoint) {
                void this.sendToS3(
                    eventsToSend,
                    this.session?.sessionId,
                    forced
                );
            } else {
                // Default behavior - send to RUM service
                this.context.record(SESSION_REPLAY_EVENT_TYPE, {
                    events: eventsToSend,
                    sessionId: this.session?.sessionId
                });
            }
        } catch (error) {
            // If recording fails, add the events back to be retried later
            this.events = [...eventsToSend, ...this.events];
        }
    }

    /**
     * Send session replay events directly to S3 via an API endpoint
     *
     * @param events The events to send
     * @param sessionId The current session ID
     * @param forced Whether this is a forced flush
     */
    private async sendToS3(
        events: eventWithTime[],
        sessionId?: string,
        forced = false
    ): Promise<void> {
        if (!sessionId) {
            return;
        }

        const timestamp = new Date().toISOString();
        const key = `sessions/${sessionId}/${timestamp}-${Math.random()
            .toString(36)
            .substring(2, 10)}.json`;

        // Collect metadata for Athena querying
        const metadata = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp,
            sessionId,
            pageTitle: document.title,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            forced,
            ...this.config.s3Config?.additionalMetadata
        };

        const payload = {
            key,
            bucketName: this.config.s3Config?.bucketName,
            region: this.config.s3Config?.region,
            data: {
                sessionId,
                timestamp,
                events,
                metadata
            }
        };

        try {
            const response = await fetch(this.config.s3Config!.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to upload to S3: ${response.statusText}`
                );
            }
        } catch (error) {
            throw error;
        }
    }
}
