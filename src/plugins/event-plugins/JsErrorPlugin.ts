import { RecordEvent, Plugin, PluginContext } from '../Plugin';
import { JS_ERROR_EVENT_TYPE } from '../utils/constant';
import { errorEventToJsErrorEvent } from '../utils/js-error-utils';

export const JS_ERROR_EVENT_PLUGIN_ID = 'com.amazonaws.rum.js-error';

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

    constructor(config?: JsErrorPluginConfig) {
        this.pluginId = JS_ERROR_EVENT_PLUGIN_ID;
        this.enabled = true;
        this.config = config ? config : defaultConfig;
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

    configure(config: JsErrorPluginConfig): void {
        this.config = config;
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

    private addEventHandler(): void {
        window.addEventListener('error', this.eventHandler);
    }

    private removeEventHandler(): void {
        window.removeEventListener('error', this.eventHandler);
    }
}
