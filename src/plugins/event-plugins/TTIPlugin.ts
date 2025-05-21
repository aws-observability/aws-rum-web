import { TTIMetric, onTTI } from '../../time-to-interactive/TimeToInteractive';
import { TimeToInteractiveEvent } from '../../events/time-to-interactive-event';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../utils/constant';
import { InternalPlugin } from '../InternalPlugin';

export const TTI_EVENT_PLUGIN_ID = 'time-to-interactive';

export class TTIPlugin extends InternalPlugin {
    protected fpsEnabled;
    private prerenderedPageLoad;
    private normalPageLoad;

    constructor(fpsMeasurementEnabled = false) {
        super(TTI_EVENT_PLUGIN_ID);
        this.fpsEnabled = fpsMeasurementEnabled;
        this.prerenderedPageLoad = false;
        this.normalPageLoad = true;
        this.checkPrerenderingActivity();
    }

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
        if (this.normalPageLoad || this.prerenderedPageLoad) {
            this.recordTTIEvent();
        }
    }

    private recordTTIEvent = (): void => {
        onTTI(this.handleTTI, { fpsEnabled: this.fpsEnabled });
    };

    private checkPrerenderingActivity = (): void => {
        if (
            typeof document !== 'undefined' &&
            typeof document.prerendering === 'boolean' &&
            document.prerendering
        ) {
            this.normalPageLoad = false;
            document.addEventListener('prerenderingchange', () => {
                this.prerenderedPageLoad = true;
                this.recordTTIEvent();
            });
        }

        if (
            typeof performance !== 'undefined' &&
            typeof performance.getEntriesByType === 'function'
        ) {
            try {
                const entries = performance.getEntriesByType('navigation');
                if (entries && entries.length > 0) {
                    const navigation = entries[0];
                    if (
                        navigation &&
                        navigation.activationStart &&
                        navigation.activationStart > 0
                    ) {
                        this.prerenderedPageLoad = true;
                        this.normalPageLoad = false;
                    }
                }
            } catch (e) {
                console.debug('Error accessing Performance API:', e);
            }
        }
    };

    private handleTTI = (metric: TTIMetric): void => {
        const ttiEvent: TimeToInteractiveEvent = {
            version: '1.0.0',
            value: Math.round(metric.value)
        };
        this.context.record(TIME_TO_INTERACTIVE_EVENT_TYPE, ttiEvent);
    };
}
