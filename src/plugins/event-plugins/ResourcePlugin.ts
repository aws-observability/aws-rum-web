import { InternalPlugin } from '../InternalPlugin';
import {
    getResourceFileType,
    isPutRumEventsCall
} from '../../utils/common-utils';
import { PERFORMANCE_RESOURCE_TIMING_EVENT_TYPE } from '../utils/constant';
import {
    PerformanceResourceTimingEvent,
    PerformanceServerTimingPolyfill
} from '../../events/performance-resource-timing-event';
import {
    defaultPerformancePluginConfig,
    PartialPerformancePluginConfig,
    PerformancePluginConfig,
    PerformanceResourceTimingPolyfill
} from '../utils/performance-utils';

export const RESOURCE_EVENT_PLUGIN_ID = 'resource';
const RESOURCE = 'resource';

/**
 * This plugin records resource performance timing events generated during every page load/re-load.
 */
export class ResourcePlugin extends InternalPlugin {
    private config: PerformancePluginConfig;
    private resourceObserver: PerformanceObserver;
    private sampleCount: number;

    constructor(config?: PartialPerformancePluginConfig) {
        super(RESOURCE_EVENT_PLUGIN_ID);
        this.config = { ...defaultPerformancePluginConfig, ...config };
        this.sampleCount = 0;
        this.resourceObserver = new PerformanceObserver(
            this.performanceEntryHandler
        );
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        this.resourceObserver.observe({
            type: RESOURCE,
            buffered: true
        });
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.resourceObserver.disconnect();
    }

    performanceEntryHandler = (list: PerformanceObserverEntryList): void => {
        for (const e of list.getEntries()) {
            const entry = e as PerformanceResourceTimingPolyfill;
            const { name, initiatorType } = entry;

            // Ignore calls to PutRumEvents (i.e., the CloudWatch RUM data plane),
            // otherwise we end up in an infinite loop of recording PutRumEvents.
            if (
                isPutRumEventsCall(name, this.context.config.endpointUrl.host)
            ) {
                continue;
            }

            // Ignore by custom callback
            if (this.config.ignore(e)) {
                continue;
            }

            // Sampling logic
            const type = getResourceFileType(name, initiatorType);
            if (this.config.recordAllTypes.includes(type)) {
                // Always capture recordAll types
                this.recordResourceEvent(entry);
            } else if (
                this.sampleCount < this.config.eventLimit &&
                this.config.sampleTypes.includes(type)
            ) {
                // Capture first N sampled types
                this.recordResourceEvent(entry);
                this.sampleCount++;
            }
        }
    };

    recordResourceEvent = ({
        name,
        startTime,
        duration,
        connectEnd,
        connectStart,
        decodedBodySize,
        domainLookupEnd,
        domainLookupStart,
        encodedBodySize,
        fetchStart,
        initiatorType,
        nextHopProtocol,
        redirectEnd,
        redirectStart,
        renderBlockingStatus,
        requestStart,
        responseEnd,
        responseStart,
        secureConnectionStart,
        serverTiming,
        transferSize,
        workerStart
    }: PerformanceResourceTimingPolyfill): void => {
        this.context?.record(
            PERFORMANCE_RESOURCE_TIMING_EVENT_TYPE,
            {
                name: this.context.config.recordResourceUrl ? name : undefined,
                entryType: RESOURCE,
                startTime,
                duration,
                connectEnd,
                connectStart,
                decodedBodySize,
                domainLookupEnd,
                domainLookupStart,
                encodedBodySize,
                fetchStart,
                initiatorType,
                nextHopProtocol,
                redirectEnd,
                redirectStart,
                renderBlockingStatus,
                requestStart,
                responseEnd,
                responseStart,
                secureConnectionStart,
                serverTiming: serverTiming.map(
                    (e) => e as PerformanceServerTimingPolyfill
                ) as PerformanceServerTimingPolyfill[],
                transferSize,
                workerStart
            } as PerformanceResourceTimingEvent,
            name
        );
    };

    protected onload(): void {
        // We need to set `buffered: true`, so the observer also records past
        // resource entries. However, there is a limited buffer size, so we may
        // not be able to collect all resource entries.
        this.resourceObserver.observe({
            type: RESOURCE,
            buffered: true
        });
    }
}
