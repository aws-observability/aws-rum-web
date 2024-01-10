import { InternalPlugin } from '../InternalPlugin';
import { LargestContentfulPaintEvent } from '../../events/largest-contentful-paint-event';
import { CumulativeLayoutShiftEvent } from '../../events/cumulative-layout-shift-event';
import { FirstInputDelayEvent } from '../../events/first-input-delay-event';
import {
    CLSMetricWithAttribution,
    FIDMetricWithAttribution,
    LCPMetricWithAttribution,
    Metric,
    onCLS,
    onFID,
    onLCP
} from 'web-vitals/attribution';
import {
    CLS_EVENT_TYPE,
    FID_EVENT_TYPE,
    LCP_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE,
    PERFORMANCE_RESOURCE_EVENT_TYPE
} from '../utils/constant';
import { Subscriber, Topic } from '../../event-bus/EventBus';
import { ParsedRumEvent } from '../../dispatch/dataplane';

import {
    ResourceType,
    performanceKey,
    RumLCPAttribution,
    isLCPSupported,
    getResourceFileType
} from '../../utils/common-utils';
import { ResourceEvent } from '../../events/resource-event';

export const WEB_VITAL_EVENT_PLUGIN_ID = 'web-vitals';

export class WebVitalsPlugin extends InternalPlugin {
    constructor() {
        super(WEB_VITAL_EVENT_PLUGIN_ID);
    }
    private resourceEventIds = new Map<string, string>();
    private navigationEventId?: string;
    private cacheLCPCandidates = isLCPSupported();

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    enable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    configure(config: any): void {}

    protected onload(): void {
        this.context.eventBus.subscribe(Topic.EVENT, this.messageHandler); // eslint-disable-line @typescript-eslint/unbound-method
        onLCP((metric) => this.handleLCP(metric));
        onFID((metric) => this.handleFID(metric));
        onCLS((metric) => this.handleCLS(metric));
    }

    private messageHandler: Subscriber = (
        event: ParsedRumEvent,
        name?: string
    ) => {
        switch (event.type) {
            // lcp resource is either image or text
            case PERFORMANCE_RESOURCE_EVENT_TYPE:
                const details = event.details as ResourceEvent;
                if (
                    this.cacheLCPCandidates &&
                    getResourceFileType(name!, details.initiatorType) ===
                        ResourceType.IMAGE
                ) {
                    this.resourceEventIds.set(
                        performanceKey(details as PerformanceEntry),
                        event.id
                    );
                }
                break;
            case PERFORMANCE_NAVIGATION_EVENT_TYPE:
                this.navigationEventId = event.id;
                break;
        }
    };

    private handleLCP(metric: LCPMetricWithAttribution | Metric) {
        const a = (metric as LCPMetricWithAttribution).attribution;
        const attribution: RumLCPAttribution = {
            element: a.element,
            url: a.url,
            timeToFirstByte: a.timeToFirstByte,
            resourceLoadDelay: a.resourceLoadDelay,
            resourceLoadTime: a.resourceLoadTime,
            elementRenderDelay: a.elementRenderDelay
        };
        if (a.lcpResourceEntry) {
            const key = performanceKey(a.lcpResourceEntry as PerformanceEntry);
            attribution.lcpResourceEntry = this.resourceEventIds.get(key);
        }
        if (this.navigationEventId) {
            attribution.navigationEntry = this.navigationEventId;
        }
        this.context?.record(LCP_EVENT_TYPE, {
            version: '1.0.0',
            value: metric.value,
            attribution
        } as LargestContentfulPaintEvent);

        // teardown
        this.context?.eventBus.unsubscribe(Topic.EVENT, this.messageHandler); // eslint-disable-line
        this.resourceEventIds.clear();
        this.navigationEventId = undefined;
    }

    private handleCLS(metric: CLSMetricWithAttribution | Metric) {
        const a = (metric as CLSMetricWithAttribution).attribution;
        this.context?.record(CLS_EVENT_TYPE, {
            version: '1.0.0',
            value: metric.value,
            attribution: {
                largestShiftTarget: a.largestShiftTarget,
                largestShiftValue: a.largestShiftValue,
                largestShiftTime: a.largestShiftTime,
                loadState: a.loadState
            }
        } as CumulativeLayoutShiftEvent);
    }

    private handleFID(metric: FIDMetricWithAttribution | Metric) {
        const a = (metric as FIDMetricWithAttribution).attribution;
        this.context?.record(FID_EVENT_TYPE, {
            version: '1.0.0',
            value: metric.value,
            attribution: {
                eventTarget: a.eventTarget,
                eventType: a.eventType,
                eventTime: a.eventTime,
                loadState: a.loadState
            }
        } as FirstInputDelayEvent);
    }
}
