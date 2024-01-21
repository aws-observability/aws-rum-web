import { InternalPlugin } from '../InternalPlugin';
import {
    getResourceFileType,
    isPutRumEventsCall,
    isResourceSupported
} from '../../utils/common-utils';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../utils/constant';
import { PerformanceResourceTimingEvent } from '../../events/performance-resource-timing';
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
    private resourceObserver?: PerformanceObserver;
    private sampleCount: number;

    constructor(config?: PartialPerformancePluginConfig) {
        super(RESOURCE_EVENT_PLUGIN_ID);
        this.config = { ...defaultPerformancePluginConfig, ...config };
        this.sampleCount = 0;
        this.resourceObserver = isResourceSupported()
            ? new PerformanceObserver(this.performanceEntryHandler)
            : undefined;
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        this.observe();
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.resourceObserver?.disconnect();
    }

    private observe() {
        // We need to set `buffered: true`, so the observer also records past
        // resource entries. However, there is a limited buffer size, so we may
        // not be able to collect all resource entries.
        this.resourceObserver?.observe({
            type: RESOURCE,
            buffered: true
        });
    }

    performanceEntryHandler = (list: PerformanceObserverEntryList): void => {
        for (const entry of list.getEntries()) {
            const e = entry as PerformanceResourceTimingPolyfill;
            if (
                this.config.ignore(e) ||
                // Ignore calls to PutRumEvents (i.e., the CloudWatch RUM data
                // plane), otherwise we end up in an infinite loop of recording
                // PutRumEvents.
                isPutRumEventsCall(e.name, this.context.config.endpointUrl.host)
            ) {
                continue;
            }

            // Sampling logic
            const fileType = getResourceFileType(e.initiatorType);
            if (this.config.recordAllTypes.includes(fileType)) {
                // Always record
                this.recordResourceEvent(e);
            } else if (
                this.sampleCount < this.config.eventLimit &&
                this.config.sampleTypes.includes(fileType)
            ) {
                // Only sample first N
                this.recordResourceEvent(e);
                this.sampleCount++;
            }
        }
    };

    recordResourceEvent = (e: PerformanceResourceTimingPolyfill): void => {
        this.context?.record(PERFORMANCE_RESOURCE_EVENT_TYPE, {
            name: this.context.config.recordResourceUrl ? e.name : undefined,
            entryType: RESOURCE,
            startTime: e.startTime,
            duration: e.duration,
            connectStart: e.connectStart,
            connectEnd: e.connectEnd,
            decodedBodySize: e.decodedBodySize,
            domainLookupEnd: e.domainLookupEnd,
            domainLookupStart: e.domainLookupStart,
            fetchStart: e.fetchStart,
            encodedBodySize: e.encodedBodySize,
            initiatorType: e.initiatorType,
            nextHopProtocol: e.nextHopProtocol,
            redirectEnd: e.redirectEnd,
            redirectStart: e.redirectStart,
            renderBlockingStatus: e.renderBlockingStatus,
            requestStart: e.requestStart,
            responseEnd: e.responseEnd,
            responseStart: e.responseStart,
            secureConnectionStart: e.secureConnectionStart,
            transferSize: e.transferSize,
            workerStart: e.workerStart
        } as PerformanceResourceTimingEvent);
    };

    protected onload(): void {
        this.observe();
    }
}
