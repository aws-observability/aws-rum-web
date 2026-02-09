import { InternalPlugin } from '../InternalPlugin';
import { RRWEB_EVENT_TYPE } from '../utils/constant';
import { InternalLogger } from '../../utils/InternalLogger';
import { record } from 'rrweb';
import type { recordOptions } from 'rrweb/typings/types';
import type { SessionReplayEvent } from '../../events/session-replay-event';

type RRWebEvent = SessionReplayEvent['events'][number];

export const RRWEB_PLUGIN_ID = 'rrweb';

export type RRWebPluginConfig = {
    additionalSampleRate: number; // 0-1, probability of recording a session, in addition to session sample rate
    batchSize: number; // Number of events to batch before sending
    flushInterval: number; // MS between automatic flushes
    recordOptions: recordOptions<unknown>;
};

export const RRWEB_CONFIG_PROD: RRWebPluginConfig = {
    additionalSampleRate: 1.0,
    batchSize: 50,
    flushInterval: 5000,
    recordOptions: {
        // Performance
        slimDOMOptions: 'all',
        inlineStylesheet: true,
        inlineImages: false,
        collectFonts: true,
        recordCrossOriginIframes: false,
        // Privacy — mask all text and inputs by default
        // NOTE: blockSelector crashes rrweb 2.0.0-alpha.4 (node.matches bug on text nodes)
        maskAllInputs: true,
        maskTextSelector: '*'
    }
};
export const RRWEB_CONFIG_DEV: RRWebPluginConfig = {
    ...RRWEB_CONFIG_PROD,
    recordOptions: {
        ...RRWEB_CONFIG_PROD.recordOptions,
        // Disable privacy masking for local development
        maskAllInputs: false,
        maskTextSelector: undefined,
        maskInputOptions: {}
    } as recordOptions<unknown>
};

const defaultConfig = RRWEB_CONFIG_PROD;

export class RRWebPlugin extends InternalPlugin {
    private config: RRWebPluginConfig;
    private recordingEvents: RRWebEvent[] = [];
    private isRecording = false;
    private recordingStartTime: number | null = null;
    private flushTimer: number | null = null;
    private stopRecording: (() => void) | null = null;
    enabled = false;

    constructor(config?: Partial<RRWebPluginConfig>) {
        super(RRWEB_PLUGIN_ID);
        const recordOptions: recordOptions<unknown> = {
            ...defaultConfig.recordOptions,
            ...config?.recordOptions
        };
        this.config = { ...defaultConfig, ...config, recordOptions };

        InternalLogger.info('RRWebPlugin initialized', {
            additionalSampleRate: this.config.additionalSampleRate,
            batchSize: this.config.batchSize,
            flushInterval: this.config.flushInterval
        });
    }

    enable(): void {
        if (this.enabled) {
            InternalLogger.info('RRWebPlugin already enabled');
            return;
        }

        // Check if the current session is being recorded
        const session = this.context?.getSession();
        if (!session || !session.record) {
            InternalLogger.warn(
                'RRWebPlugin skipping - session not being recorded',
                {
                    hasSession: !!session,
                    sessionRecord: session?.record
                }
            );
            return; // Don't record if session is not being recorded
        }

        // Check if we should record this replay
        const randomValue = Math.random();
        if (randomValue > this.config.additionalSampleRate) {
            InternalLogger.warn(
                'RRWebPlugin skipping - session replay additionalSampleRate',
                {
                    randomValue,
                    samplingRate: this.config.additionalSampleRate
                }
            );
            return; // Skip recording for this session
        }

        this.enabled = true;
        InternalLogger.info('RRWebPlugin enabled - starting recording');
        this.startRecording();
    }

    disable(): void {
        if (!this.enabled) {
            InternalLogger.info('RRWebPlugin already disabled');
            return;
        }

        InternalLogger.info('RRWebPlugin disabled - stopping recording');
        this.enabled = false;
        this.stopCurrentRecording();
    }

    record(data: unknown): void {
        const action = (data as { action?: string })?.action;
        if (action === 'start') {
            InternalLogger.info('RRWebPlugin manual start recording');
            this.startRecording();
        } else if (action === 'stop') {
            InternalLogger.info('RRWebPlugin manual stop recording');
            this.stopCurrentRecording();
        }
    }

    protected onload(): void {
        // this.enable();
    }

    private startRecording(): void {
        this.recordingStartTime = Date.now();
        this.recordingEvents = [];
        this.isRecording = true;

        InternalLogger.info('RRWebPlugin starting rrweb recording', {
            startTime: this.recordingStartTime
        });

        // Start recording with rrweb
        const stopFn: (() => void) | undefined = record<RRWebEvent>({
            ...(this.config.recordOptions as recordOptions<RRWebEvent>),
            emit: this.handleRRWebEvent.bind(this)
        });

        if (stopFn) {
            this.stopRecording = stopFn as () => void;
            InternalLogger.info(
                'RRWebPlugin rrweb recording initialized successfully'
            );
        } else {
            InternalLogger.warn(
                'RRWebPlugin failed to initialize rrweb recording'
            );
        }

        // Set up periodic flush
        this.flushTimer = window.setInterval(() => {
            this.flushEvents();
        }, this.config.flushInterval);
    }

    private stopCurrentRecording(): void {
        if (!this.isRecording) {
            InternalLogger.info(
                'RRWebPlugin stopCurrentRecording called but not recording'
            );
            return;
        }

        InternalLogger.info('RRWebPlugin stopping current recording');
        this.isRecording = false;

        // Stop recording
        if (this.stopRecording) {
            this.stopRecording();
            this.stopRecording = null;
            InternalLogger.info('RRWebPlugin rrweb recording stopped');
        }

        // Clear flush timer
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
            InternalLogger.info('RRWebPlugin flush timer cleared');
        }

        // Flush any remaining events
        this.flushEvents();
    }

    private handleRRWebEvent(event: RRWebEvent): void {
        if (!this.isRecording) {
            return;
        }

        this.recordingEvents.push(event);

        // Check if we need to flush due to batch size
        if (this.recordingEvents.length >= this.config.batchSize) {
            InternalLogger.info(
                'RRWebPlugin flushing events due to batch size',
                {
                    eventCount: this.recordingEvents.length,
                    batchSize: this.config.batchSize
                }
            );
            this.flushEvents();
        }
    }

    private flushEvents(): void {
        if (this.recordingEvents.length === 0) {
            InternalLogger.info(
                'RRWebPlugin flushEvents called but no events to flush'
            );
            return;
        }

        InternalLogger.info('RRWebPlugin flushing events', {
            eventCount: this.recordingEvents.length
        });

        const events = [...this.recordingEvents];

        const eventData: SessionReplayEvent = {
            version: '1.0.0',
            events,
            eventCount: events.length
        };

        // Send to RUM with event type com.amazon.rum.rrweb
        this.context.record(RRWEB_EVENT_TYPE, eventData);
        InternalLogger.info('RRWebPlugin events sent to RUM', {
            eventType: RRWEB_EVENT_TYPE,
            eventCount: this.recordingEvents.length
        });
        // Clear events after sending
        this.recordingEvents = [];
    }
}
