import { JSErrorEvent } from '../../events/js-error-event';
import { RecordEvent, Plugin, PluginContext } from '../Plugin';
import { JS_ERROR_EVENT_TYPE } from '../utils/constant';
import { errorEventToJsErrorEvent } from '../utils/js-error-utils';

export const JS_ERROR_EVENT_PLUGIN_ID = 'com.amazonaws.rum.js-error';

export type PartialJsErrorPluginConfig = {
    stackTraceLength?: number;
};

export type JsErrorPluginConfig = {
    stackTraceLength: number;
};

const defaultConfig: JsErrorPluginConfig = {
    stackTraceLength: 200
};

export class JsErrorPlugin implements Plugin {
    private pluginId: string;
    private enabled: boolean;
    private config: JsErrorPluginConfig;
    private recordEvent: RecordEvent;

    constructor(config?: PartialJsErrorPluginConfig) {
        this.pluginId = JS_ERROR_EVENT_PLUGIN_ID;
        this.enabled = true;
        this.config = { ...defaultConfig, ...config };
    }

    load(context: PluginContext): void {
        this.recordEvent = context.record;
        this.addEventHandler();
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.addEventHandler();
        this.enabled = true;
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.removeEventHandler();
        this.enabled = false;
    }

    getPluginId(): string {
        return this.pluginId;
    }

    record(error: any): void {
        if (error instanceof ErrorEvent) {
            this.eventHandler(error);
        } else {
            this.eventHandler({ type: 'error', error } as ErrorEvent);
        }
    }

    private eventHandler = (errorEvent: ErrorEvent) => {
        this.recordEvent(
            JS_ERROR_EVENT_TYPE,
            errorEventToJsErrorEvent(errorEvent, this.config.stackTraceLength)
        );
    };

    private promiseRejectEventHandler = (event: PromiseRejectionEvent) => {
        const errorEvent: JSErrorEvent = {
            version: '1.0.0',
            type: event.type,
            message:
                typeof event.reason === 'string'
                    ? event.reason
                    : JSON.stringify(event.reason)
        };
        this.recordEvent(JS_ERROR_EVENT_TYPE, errorEvent);
    };

    private addEventHandler(): void {
        window.addEventListener('error', this.eventHandler);
        window.addEventListener(
            'unhandledrejection',
            this.promiseRejectEventHandler
        );
    }

    private removeEventHandler(): void {
        window.removeEventListener('error', this.eventHandler);
        window.removeEventListener(
            'unhandledrejection',
            this.promiseRejectEventHandler
        );
    }
}
