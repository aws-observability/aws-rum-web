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
    LCP_EVENT_TYPE
} from '../utils/constant';

export const WEB_VITAL_EVENT_PLUGIN_ID = 'web-vitals';

export class WebVitalsPlugin extends InternalPlugin {
    constructor() {
        super(WEB_VITAL_EVENT_PLUGIN_ID);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    enable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    configure(config: any): void {}

    protected onload(): void {
        onLCP((metric) => this.handleLCP(metric));
        onFID((metric) => this.handleFID(metric));
        onCLS((metric) => this.handleCLS(metric));
    }

    handleLCP(metric: LCPMetricWithAttribution | Metric) {
        const lcpEvent: LargestContentfulPaintEvent = {
            version: '1.0.0',
            value: metric.value
        };
        if ('attribution' in metric) {
            const a = (metric as LCPMetricWithAttribution).attribution;
            lcpEvent.attribution = {
                element: a.element,
                url: a.url,
                timeToFirstByte: a.timeToFirstByte,
                resourceLoadDelay: a.resourceLoadDelay,
                resourceLoadTime: a.resourceLoadTime,
                elementRenderDelay: a.elementRenderDelay
            };
        }
        this.context?.record(LCP_EVENT_TYPE, lcpEvent);
    }

    handleCLS(metric: CLSMetricWithAttribution | Metric) {
        const clsEvent: CumulativeLayoutShiftEvent = {
            version: '1.0.0',
            value: metric.value
        };
        if ('attribution' in metric) {
            const a = (metric as CLSMetricWithAttribution).attribution;
            clsEvent.attribution = {
                largestShiftTarget: a.largestShiftTarget,
                largestShiftValue: a.largestShiftValue,
                largestShiftTime: a.largestShiftTime,
                loadState: a.loadState
            };
        }
        this.context?.record(CLS_EVENT_TYPE, clsEvent);
    }

    handleFID(metric: FIDMetricWithAttribution | Metric) {
        const fidEvent: FirstInputDelayEvent = {
            version: '1.0.0',
            value: metric.value
        };
        if ('attribution' in metric) {
            const a = (metric as FIDMetricWithAttribution).attribution;
            fidEvent.attribution = {
                eventTarget: a.eventTarget,
                eventType: a.eventType,
                eventTime: a.eventTime,
                loadState: a.loadState
            };
        }
        this.context?.record(FID_EVENT_TYPE, fidEvent);
    }
}
