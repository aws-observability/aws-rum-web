import { InternalPlugin } from '../InternalPlugin';
import { LargestContentfulPaintEvent } from '../../events/largest-contentful-paint-event';
import { FirstInputDelayEvent } from '../../events/first-input-delay-event';
import { CumulativeLayoutShiftEvent } from '../../events/cumulative-layout-shift-event';
import { getCLS, getFID, getLCP, Metric } from 'web-vitals';
import {
    LCP_EVENT_TYPE,
    FID_EVENT_TYPE,
    CLS_EVENT_TYPE
} from '../utils/constant';

export const WEB_VITAL_EVENT_PLUGIN_ID = 'web-vitals';

export class WebVitalsPlugin extends InternalPlugin {
    // tslint:disable-next-line:no-empty
    enable(): void {}

    // tslint:disable-next-line:no-empty
    disable(): void {}

    getWebVitalData(webVitalData: Metric, eventType: string): void {
        const webVitalEvent:
            | LargestContentfulPaintEvent
            | FirstInputDelayEvent
            | CumulativeLayoutShiftEvent = {
            version: '1.0.0',
            value: webVitalData.value
        };
        this.context?.record(eventType, webVitalEvent);
    }
    protected getDefaultConfig() {
        return {
            name: WEB_VITAL_EVENT_PLUGIN_ID
        };
    }

    protected onload(): void {
        getLCP((data) => this.getWebVitalData(data, LCP_EVENT_TYPE));
        getFID((data) => this.getWebVitalData(data, FID_EVENT_TYPE));
        getCLS((data) => this.getWebVitalData(data, CLS_EVENT_TYPE));
    }
}
