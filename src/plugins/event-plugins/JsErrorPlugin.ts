import { InternalPlugin, InternalPluginConfig } from '../InternalPlugin';
import { JS_ERROR_EVENT_TYPE } from '../utils/constant';
import { errorEventToJsErrorEvent } from '../utils/js-error-utils';

export const JS_ERROR_EVENT_PLUGIN_ID = 'js-error';

export interface JsErrorPluginConfig extends InternalPluginConfig {
    stackTraceLength: number;
    ignore: (error: ErrorEvent | PromiseRejectionEvent) => boolean;
}

export class JsErrorPlugin extends InternalPlugin<JsErrorPluginConfig> {
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

    record(error: any): void {
        if (error instanceof ErrorEvent) {
            this.recordJsErrorEvent(error);
        } else {
            this.recordJsErrorEvent({ type: 'error', error } as ErrorEvent);
        }
    }

    protected getDefaultConfig() {
        return {
            name: JS_ERROR_EVENT_PLUGIN_ID,
            stackTraceLength: 200,
            ignore: (error: ErrorEvent | PromiseRejectionEvent) => false
        };
    }

    protected onload(): void {
        this.addEventHandler();
    }

    private eventHandler = (errorEvent: ErrorEvent) => {
        if (!this.getConfigValue('ignore')(errorEvent)) {
            this.recordJsErrorEvent(errorEvent);
        }
    };

    private promiseRejectEventHandler = (event: PromiseRejectionEvent) => {
        if (!this.getConfigValue('ignore')(event)) {
            this.recordJsErrorEvent({
                type: event.type,
                error: event.reason
            } as ErrorEvent);
        }
    };

    private recordJsErrorEvent(error: any) {
        this.context?.record(
            JS_ERROR_EVENT_TYPE,
            errorEventToJsErrorEvent(
                error,
                this.getConfigValue('stackTraceLength')
            )
        );
    }

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
