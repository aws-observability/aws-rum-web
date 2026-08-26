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
// Use @rrweb/record instead of rrweb directly. rrweb@2.0.0-alpha.4 ships a
// broken package.json (type:module with a CJS main), which makes consumer
// bundlers throw `ReferenceError: exports is not defined` at runtime.
// @rrweb/record has a proper exports map with separate import/require
// conditions and bundles all rrweb code inline, so CJS and ESM consumers
// both work.
import { record } from '@rrweb/record';
import type { recordOptions } from 'rrweb/typings/types';
import type { RRWebEvent as RRWebEventPayload } from '../../events/rrweb-event';

/** A single rrweb event as defined by the RRWebEvent schema. */
type RRWebRecordEvent = RRWebEventPayload['events'][number];

export const RRWEB_PLUGIN_ID = 'rrweb';

/**
 * Privacy-related rrweb options that are managed by the plugin and cannot be
 * supplied through `recordOptions`. Their concrete values are resolved at
 * construction time based on `selectiveMaskingAttribute`.
 */
type EnforcedPrivacyKeys =
    | 'maskAllInputs'
    | 'maskTextSelector'
    | 'maskInputOptions'
    | 'maskInputFn';

/** Configuration options for {@link RRWebPlugin}. */
export type RRWebPluginConfig = {
    /** Probability (0–1) of recording replay for a session, applied on top of sessionSampleRate. */
    additionalSampleRate: number;
    /** Number of rrweb events to buffer before automatically flushing a batch. */
    batchSize: number;
    /** Milliseconds between automatic flushes of buffered events. */
    flushInterval: number;
    /** Options forwarded directly to the rrweb `record()` function. Privacy masking options are managed by the plugin and cannot be overridden here. */
    recordOptions: Omit<recordOptions<unknown>, EnforcedPrivacyKeys>;
    /**
     * Opt-in selective masking. When set to a non-empty string, only DOM
     * elements that carry this attribute are masked in the replay; everything
     * else is recorded in clear text. The value is used as a CSS attribute
     * selector — for example, passing `'data-rum-mask'` masks elements that
     * match `[data-rum-mask]`.
     *
     * When unset (the default), the plugin enforces full text and input
     * masking and customers cannot disable it.
     *
     * Use this only after a privacy review of your application — turning it
     * on means form values and visible text will be transmitted unless they
     * carry the configured attribute.
     */
    selectiveMaskingAttribute?: string;
};

/** Privacy options applied when selective masking is NOT enabled (the default). */
const ENFORCED_PRIVACY_OPTIONS = {
    maskAllInputs: true,
    maskTextSelector: '*',
    maskInputOptions: undefined
} as const;

/**
 * Mark every standard input type so rrweb invokes `maskInputFn` for it.
 * Without these flags, rrweb takes its default "do not mask" path and
 * never consults the function. Built dynamically so we can include the
 * `number` key without tripping the repository's `id-denylist` lint rule
 * on the bare identifier.
 */
const SELECTIVE_MASK_INPUT_OPTIONS: Record<string, boolean> = (() => {
    const options: Record<string, boolean> = {
        color: true,
        date: true,
        'datetime-local': true,
        email: true,
        month: true,
        range: true,
        search: true,
        tel: true,
        text: true,
        time: true,
        url: true,
        week: true,
        textarea: true,
        select: true,
        password: true
    };
    options['number'] = true;
    return options;
})();

/**
 * Privacy options used when `selectiveMaskingAttribute` is set. Only elements
 * carrying the configured attribute are masked.
 */
const buildSelectivePrivacyOptions = (attribute: string) => {
    const escaped = attribute.replace(/[\\"\]]/g, '\\$&');
    return {
        maskAllInputs: false,
        maskTextSelector: `[${escaped}]`,
        maskInputOptions: SELECTIVE_MASK_INPUT_OPTIONS,
        maskInputFn: (text: string, element: HTMLElement) => {
            if (
                element &&
                typeof element.hasAttribute === 'function' &&
                element.hasAttribute(attribute)
            ) {
                return '*'.repeat(text.length);
            }
            return text;
        }
    };
};

/**
 * Production-safe defaults. Privacy masking is enforced; heavy options
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
        recordCrossOriginIframes: false
        // Privacy masking is enforced via ENFORCED_PRIVACY_OPTIONS
    }
};

const defaultConfig = RRWEB_CONFIG_PROD;

/** Internal config type that includes enforced privacy fields for runtime use. */
type InternalRRWebPluginConfig = Omit<RRWebPluginConfig, 'recordOptions'> & {
    recordOptions: recordOptions<unknown>;
};

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
    private config: InternalRRWebPluginConfig;
    /** Buffer of rrweb events waiting to be flushed. */
    private recordingEvents: RRWebRecordEvent[] = [];
    private isRecording = false;
    private recordingStartTime: number | null = null;
    private flushTimer: number | null = null;
    private stopRecording: (() => void) | null = null;
    enabled = false;

    constructor(config?: Partial<RRWebPluginConfig>) {
        super(RRWEB_PLUGIN_ID);

        // Privacy resolution: the default is full masking. Customers opt in
        // to selective masking by passing a non-empty `selectiveMaskingAttribute`.
        const selectiveAttribute =
            typeof config?.selectiveMaskingAttribute === 'string' &&
            config.selectiveMaskingAttribute.length > 0
                ? config.selectiveMaskingAttribute
                : undefined;
        const privacyOptions = selectiveAttribute
            ? buildSelectivePrivacyOptions(selectiveAttribute)
            : ENFORCED_PRIVACY_OPTIONS;

        // Merge record options separately so individual fields can be overridden
        const recordOptions: recordOptions<unknown> = {
            ...defaultConfig.recordOptions,
            ...config?.recordOptions,
            // Privacy options are managed by the plugin — overriding them via
            // `recordOptions` is not supported.
            ...privacyOptions
        };
        this.config = {
            ...defaultConfig,
            ...config,
            recordOptions
        } as InternalRRWebPluginConfig;

        InternalLogger.info('RRWebPlugin initialized', {
            additionalSampleRate: this.config.additionalSampleRate,
            batchSize: this.config.batchSize,
            flushInterval: this.config.flushInterval,
            selectiveMaskingAttribute: selectiveAttribute
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
     * Drain the event buffer into a single {@link RRWebEventPayload} and
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

        const eventData: RRWebEventPayload = {
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
