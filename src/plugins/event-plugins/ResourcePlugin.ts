import { InternalPlugin } from '../InternalPlugin';
import {
    getResourceFileType,
    isPutRumEventsCall
} from '../../utils/common-utils';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../utils/constant';
import {
    ResourceEvent,
    PerformanceServerTimingPolyfill
} from '../../events/resource-event';
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

            // (1) Ignore by custom callback.
            // (2) Ignore calls to PutRumEvents (i.e., the CloudWatch RUM data plane),
            // otherwise we end up in an infinite loop of recording PutRumEvents.
            if (
                this.config.ignore(e) ||
                isPutRumEventsCall(name, this.context.config.endpointUrl.host)
            ) {
                continue;
            }

            // Sampling logic
            const fileType = getResourceFileType(initiatorType);
            if (this.config.recordAllTypes.includes(fileType)) {
                // Always record
                this.recordResourceEvent(entry);
            } else if (
                this.sampleCount < this.config.eventLimit &&
                this.config.sampleTypes.includes(fileType)
            ) {
                // Only sample first N
                this.recordResourceEvent(entry);
                this.sampleCount++;
            }
        }
    };

    recordResourceEvent = (r: PerformanceResourceTimingPolyfill): void => {
        this.context?.record(PERFORMANCE_RESOURCE_EVENT_TYPE, {
            version: '2.0.0',
            name: this.context.config.recordResourceUrl ? r.name : undefined,
            entryType: RESOURCE,
            startTime: r.startTime,
            duration: r.duration,
            connectStart: r.connectStart,
            connectEnd: r.connectEnd,
            decodedBodySize: r.decodedBodySize,
            domainLookupEnd: r.domainLookupEnd,
            domainLookupStart: r.domainLookupStart,
            fetchStart: r.fetchStart,
            encodedBodySize: r.encodedBodySize,
            initiatorType: r.initiatorType,
            nextHopProtocol: r.nextHopProtocol,
            redirectEnd: r.redirectEnd,
            redirectStart: r.redirectStart,
            renderBlockingStatus: r.renderBlockingStatus,
            requestStart: r.requestStart,
            responseEnd: r.responseEnd,
            responseStart: r.responseStart,
            secureConnectionStart: r.secureConnectionStart,
            serverTiming: r.serverTiming
                ? (r.serverTiming.map(
                      (e) => e as PerformanceServerTimingPolyfill
                  ) as PerformanceServerTimingPolyfill[])
                : undefined,
            transferSize: r.transferSize,
            workerStart: r.workerStart
        } as ResourceEvent);
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
