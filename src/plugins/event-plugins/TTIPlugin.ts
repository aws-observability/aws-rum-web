import { InternalPlugin } from '../InternalPlugin';
import { TTIBoomerang2 } from './TTIBommerang2';
import { TimeToInteractiveEvent } from '../../events/time-to-interactive-event';
import { TIME_TO_INTERACTIVE_EVENT_TYPE } from '../utils/constant';

export const TTI_EVENT_PLUGIN_ID = 'time-to-interactive';

export class TTIPlugin extends InternalPlugin {
    constructor() {
        super(TTI_EVENT_PLUGIN_ID);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    enable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disable(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    configure(config: any): void {}

    protected onload(): void {
        const tti: TTIBoomerang2 = new TTIBoomerang2();

        tti.computeTimeToInteractive().then((ttiVal) => {
            this.context?.record(TIME_TO_INTERACTIVE_EVENT_TYPE, {
                version: '1.0.0',
                value: ttiVal
            } as TimeToInteractiveEvent);
        });
    }
}
