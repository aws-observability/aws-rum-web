import { TTIMetric, onTTI } from '../../time-to-interactive/TimeToInteractive';
import { TimeToInteractiveEvent } from '../../events/time-to-interactive-event';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../utils/constant';
import { PluginContext } from './../types';
import { InternalPlugin } from '../InternalPlugin';

export const TTI_EVENT_PLUGIN_ID = 'time-to-interactive';

export class TTIPlugin extends InternalPlugin {
    protected fpsEnabled;

    constructor(fpsMeasurementEnabled = false) {
        super(TTI_EVENT_PLUGIN_ID);
        this.fpsEnabled = fpsMeasurementEnabled;
    }

    protected context!: PluginContext;

    enable(): void {
        /* Nothing to do. */
    }

    disable(): void {
        /* Nothing to do. */
    }

    configure(): void {
        /* Nothing to do. */
    }

    onload(): void {
        onTTI(this.handleTTI, { fpsEnabled: this.fpsEnabled });
    }

    private handleTTI = (metric: TTIMetric): void => {
        const ttiEvent: TimeToInteractiveEvent = {
            version: '1.0.0',
            value: Math.round(metric.value)
        };
        this.context.record(TIME_TO_INTERACTIVE_EVENT_TYPE, ttiEvent);
    };
}
