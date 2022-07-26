import { InternalPlugin } from '../InternalPlugin';
import { JS_GENERAL_EVENT_TYPE } from '../utils/constant';
import { JSGeneralEvent } from '../../events/js-general-event';

export const JS_GENERAL_EVENT_PLUGIN_ID = 'js-event';

interface JsEvent {
    name: string;
    data?: any;
}

export type RecordJsEvent = JsEvent | string;

export type JsEventPluginConfig = {
    ignore: (event: JsEvent) => boolean;
};

const defaultConfig: JsEventPluginConfig = {
    ignore: () => false
};

export class JsEventPlugin extends InternalPlugin<unknown, RecordJsEvent> {
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

    record(event: RecordJsEvent): void {
        let eventToSend: JsEvent;

        if (typeof event === 'string') {
            eventToSend = { name: event };
        } else {
            eventToSend = event;
        }

        if (!this.enabled || this.config.ignore(eventToSend)) {
            return;
        }

        const rumEvent: JSGeneralEvent = {
            version: '1.0.0',
            ...eventToSend
        };

        this.context?.record(JS_GENERAL_EVENT_TYPE, rumEvent);
    }
}
