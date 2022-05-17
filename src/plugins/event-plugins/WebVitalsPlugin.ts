import { RecordEvent, Plugin, PluginContext } from '../Plugin';
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

export class WebVitalsPlugin extends Plugin {
    private recordEvent: RecordEvent | undefined;

    constructor() {
        super(WEB_VITAL_EVENT_PLUGIN_ID);
    }

    load(context: PluginContext): void {
        this.recordEvent = context.record;
        getLCP((data) => this.getWebVitalData(data, LCP_EVENT_TYPE));
        getFID((data) => this.getWebVitalData(data, FID_EVENT_TYPE));
        getCLS((data) => this.getWebVitalData(data, CLS_EVENT_TYPE));
    }

    // tslint:disable-next-line:no-empty
    enable(): void {}

    // tslint:disable-next-line:no-empty
    disable(): void {}

    // tslint:disable-next-line:no-empty
    configure(config: any): void {}

    getWebVitalData(webVitalData: Metric, eventType: string): void {
        const webVitalEvent:
            | LargestContentfulPaintEvent
            | FirstInputDelayEvent
            | CumulativeLayoutShiftEvent = {
            version: '1.0.0',
            value: webVitalData.value
        };
        this.recordEvent(eventType, webVitalEvent);
    }
}
