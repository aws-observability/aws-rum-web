/**
 * RRWebPlugin — Session replay plugin for CloudWatch RUM.
 *
 * Records DOM mutations and user interactions using rrweb, then batches
 * and forwards them as RRWebEvent payloads to the RUM data plane.
 *
 * @prerelease This plugin is in prerelease state. It is NOT exposed in the
 * top-level telemetry configuration and is NOT built into the default bundle.
 * Users must manually import and install it via `eventPluginsToLoad`:
 *
 * ```ts
 * import { RRWebPlugin } from 'aws-rum-web/plugins/event-plugins/RRWebPlugin';
 *
 * const config = {
 *     eventPluginsToLoad: [new RRWebPlugin({ batchSize: 25 })]
 * };
 * ```
 */

import { InternalPlugin } from '../InternalPlugin';
import { RRWEB_EVENT_TYPE } from '../utils/constant';
import { InternalLogger } from '../../utils/InternalLogger';
import { record } from 'rrweb';
import type { recordOptions } from 'rrweb/typings/types';
import type { RRWebEvent } from '../../events/rrweb-event';

/** A single rrweb event as defined by the RRWebEvent schema. */
type RRWebRecordEvent = RRWebEvent['events'][number];

export const RRWEB_PLUGIN_ID = 'rrweb';

/** Configuration options for {@link RRWebPlugin}. */
export type RRWebPluginConfig = {
    /**
     * Probability (0–1) of recording replay for a session, applied on top
     * of the global `sessionSampleRate`.
     *
     * Effective replay rate = sessionSampleRate × additionalSampleRate.
     * Example: 0.5 sessionSampleRate × 0.05 additionalSampleRate = 2.5%
     * of all visits are recorded with replay.
     */
    additionalSampleRate: number;
    /** Number of rrweb events to buffer before automatically flushing a batch. */
    batchSize: number;
    /** Milliseconds between automatic flushes of buffered events. */
    flushInterval: number;
    /** Options forwarded directly to the rrweb `record()` function. */
    recordOptions: recordOptions<unknown>;
};

/**
 * Production-safe defaults. Privacy masking is enabled; heavy options
 * (inlineImages, cross-origin iframes) are disabled.
 */
export const RRWEB_CONFIG_PROD: RRWebPluginConfig = {
    additionalSampleRate: 1.0,
    batchSize: 50,
    flushInterval: 5000,
    recordOptions: {
        // Performance — keep payload size manageable
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

const defaultConfig = RRWEB_CONFIG_PROD;

/**
 * Session replay plugin that records DOM snapshots and mutations via rrweb.
 *
 * @prerelease Not included in the default bundle. Must be imported and
 * installed manually via `eventPluginsToLoad`.
 *
 * Lifecycle:
 * 1. `load()` — receives PluginContext (inherited from InternalPlugin)
 * 2. `enable()` — starts rrweb recording if session is sampled
 * 3. Buffered events are flushed on batchSize threshold, flushInterval timer,
 * or page unload (via the `flush()` lifecycle hook)
 * 4. `disable()` — stops recording and flushes remaining events
 */
export class RRWebPlugin extends InternalPlugin {
    private config: RRWebPluginConfig;
    /** Buffer of rrweb events waiting to be flushed. */
    private recordingEvents: RRWebRecordEvent[] = [];
    private isRecording = false;
    private recordingStartTime: number | null = null;
    private flushTimer: number | null = null;
    private stopRecording: (() => void) | null = null;
    enabled = false;

    constructor(config?: Partial<RRWebPluginConfig>) {
        super(RRWEB_PLUGIN_ID);
        // Merge record options separately so individual fields can be overridden
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

    /** Start rrweb recording if the session passes both sample-rate checks. */
    enable(): void {
        if (this.enabled) {
            InternalLogger.info('RRWebPlugin already enabled');
            return;
        }

        // Gate on session-level sampling
        const session = this.context?.getSession();
        if (!session || !session.record) {
            InternalLogger.warn(
                'RRWebPlugin skipping - session not being recorded',
                {
                    hasSession: !!session,
                    sessionRecord: session?.record
                }
            );
            return;
        }

        // Gate on plugin-level additional sampling
        const randomValue = Math.random();
        if (randomValue > this.config.additionalSampleRate) {
            InternalLogger.warn(
                'RRWebPlugin skipping - session replay additionalSampleRate',
                {
                    randomValue,
                    samplingRate: this.config.additionalSampleRate
                }
            );
            return;
        }

        this.enabled = true;
        InternalLogger.info('RRWebPlugin enabled - starting recording');
        this.startRecording();
    }

    /** Stop rrweb recording and flush any remaining buffered events. */
    disable(): void {
        if (!this.enabled) {
            InternalLogger.info('RRWebPlugin already disabled');
            return;
        }

        InternalLogger.info('RRWebPlugin disabled - stopping recording');
        this.enabled = false;
        this.stopCurrentRecording();
    }

    /**
     * Handle manual start/stop commands.
     * @param data - Object with `{ action: 'start' | 'stop' }`.
     */
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
        // Recording starts in enable(), not on load
    }

    /** Initialize rrweb recording and start the periodic flush timer. */
    private startRecording(): void {
        this.recordingStartTime = Date.now();
        this.recordingEvents = [];
        this.isRecording = true;

        InternalLogger.info('RRWebPlugin starting rrweb recording', {
            startTime: this.recordingStartTime
        });

        // rrweb.record() returns a stop function on success
        const stopFn: (() => void) | undefined = record<RRWebRecordEvent>({
            ...(this.config.recordOptions as recordOptions<RRWebRecordEvent>),
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

        // Periodic flush so events don't sit in the buffer indefinitely
        this.flushTimer = window.setInterval(() => {
            this.flush();
        }, this.config.flushInterval);
    }

    /** Stop rrweb, clear the flush timer, and drain remaining events. */
    private stopCurrentRecording(): void {
        if (!this.isRecording) {
            InternalLogger.info(
                'RRWebPlugin stopCurrentRecording called but not recording'
            );
            return;
        }

        InternalLogger.info('RRWebPlugin stopping current recording');
        this.isRecording = false;

        if (this.stopRecording) {
            this.stopRecording();
            this.stopRecording = null;
            InternalLogger.info('RRWebPlugin rrweb recording stopped');
        }

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
            InternalLogger.info('RRWebPlugin flush timer cleared');
        }

        // Drain any remaining buffered events
        this.flush();
    }

    /** Buffer an incoming rrweb event; auto-flush when batchSize is reached. */
    private handleRRWebEvent(event: RRWebRecordEvent): void {
        if (!this.isRecording) {
            return;
        }

        this.recordingEvents.push(event);

        if (this.recordingEvents.length >= this.config.batchSize) {
            InternalLogger.info(
                'RRWebPlugin flushing events due to batch size',
                {
                    eventCount: this.recordingEvents.length,
                    batchSize: this.config.batchSize
                }
            );
            this.flush();
        }
    }

    /**
     * Drain the event buffer into a single {@link RRWebEvent} and
     * record it via `context.record()`. No-op when the buffer is empty.
     *
     * Called automatically by the web client during page unload
     * (via EventCache → PluginManager → flush lifecycle) so that
     * buffered replay data is not lost. Also called internally on
     * batchSize threshold, flushInterval timer, and disable().
     */
    flush(): void {
        if (this.recordingEvents.length === 0) {
            InternalLogger.info(
                'RRWebPlugin flushEvent called but no events to flush'
            );
            return;
        }

        InternalLogger.info('RRWebPlugin flushing events', {
            eventCount: this.recordingEvents.length
        });

        const events = [...this.recordingEvents];

        const eventData: RRWebEvent = {
            version: '1.0.0',
            events,
            eventCount: events.length
        };

        this.context.record(RRWEB_EVENT_TYPE, eventData);
        InternalLogger.info('RRWebPlugin events sent to RUM', {
            eventType: RRWEB_EVENT_TYPE,
            eventCount: this.recordingEvents.length
        });

        this.recordingEvents = [];
    }
}
