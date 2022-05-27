import { Plugin } from '../Plugin';
import { RecordEvent, PluginContext } from '../types';

export const DEMO_EVENT_TYPE = 'com.amazon.rum.demo_event';
export const DEMO_PLUGIN_ID = 'demo';

/**
 * The demo plugin is a dummy plugins. The demo plugin:
 * 1. Trigger a dummy activity every 1 sec.
 * 2. Call back to the session manager to record the demo event data.
 */

export class DemoPlugin implements Plugin {
    configuration: any;
    timerId: number | undefined;
    private context: PluginContext;

    constructor() {
        this.configuration = {};
        this.timerId = undefined;
    }

    getPluginId(): string {
        return DEMO_PLUGIN_ID;
    }

    recordEvent(evt: string, obj: object) {
        this.context?.record(evt, obj);
    }

    load(context: PluginContext): void {
        this.context = context;
        this.enable();
    }

    enable(): void {
        // dummy activity every 1 sec
        if (!this.timerId) {
            this.timerId = window.setInterval(this.eventHandler, 1_000);
        }
    }

    disable(): void {
        if (this.timerId) {
            window.clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }

    record(data: any): void {
        const demoEvent = {
            eventData: data
        };
        this.recordEvent(DEMO_EVENT_TYPE, demoEvent);
    }

    private eventHandler = (): void => {
        if (this.configuration.enable) {
            const demoEvent = {
                eventData: 'demoEventData'
            };
            this.recordEvent(DEMO_EVENT_TYPE, demoEvent);
        }
    };
}
