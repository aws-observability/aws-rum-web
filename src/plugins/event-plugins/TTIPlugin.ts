import { Plugin } from '../Plugin';

import { TTIBoomerang } from '../../time-to-interactive/TTIBoomerang';
import { TimeToInteractiveEvent } from '../../events/time-to-interactive-event';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../utils/constant';
import { PluginContext } from 'plugins/types';
import { isLongTaskSupported } from '../../utils/common-utils';

export const TTI_EVENT_PLUGIN_ID = 'time-to-interactive';

export class TTIPlugin implements Plugin {
    getPluginId() {
        return TTI_EVENT_PLUGIN_ID;
    }
    protected context!: PluginContext;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    enable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    configure(config: any): void {}

    load(context: PluginContext): void {
        this.context = context;
        const ttiBoomerang: TTIBoomerang = new TTIBoomerang();

        // If long task are not supported, TTI can't be computed for now
        if (isLongTaskSupported()) {
            ttiBoomerang
                .computeTimeToInteractive()
                .then((ttiVal) => {
                    this.context?.record(TIME_TO_INTERACTIVE_EVENT_TYPE, {
                        version: '1.0.0',
                        value: Math.round(ttiVal)
                    } as TimeToInteractiveEvent);
                })
                .catch(() => {
                    // If issue, don't record anything to handle gracefully
                });
        }
    }
}
