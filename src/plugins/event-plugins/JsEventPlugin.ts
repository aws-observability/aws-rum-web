import { InternalPlugin } from '../InternalPlugin';
import { JS_GENERAL_EVENT_TYPE } from '../utils/constant';
import { JSGeneralEvent } from '../../events/js-general-event';

export const JS_GENERAL_EVENT_PLUGIN_ID = 'js-event';

export type JsEventPluginConfig = {
    ignore: (event: any) => boolean;
};

const defaultConfig: JsEventPluginConfig = {
    ignore: () => false
};

export class JsEventPlugin extends InternalPlugin {
    private config: JsEventPluginConfig;

    constructor(config?: Partial<JsEventPluginConfig>) {
        super(JS_GENERAL_EVENT_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
    }

    record(event: any): void {
        if (!this.enabled || this.config.ignore(event)) {
            return;
        }

        const rumEvent: JSGeneralEvent = {
            version: '1.0.0',
            metadata: event
        };

        this.context?.record(JS_GENERAL_EVENT_TYPE, rumEvent);
    }
}
