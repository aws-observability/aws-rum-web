import { RecordEvent, Plugin, PluginContext } from '../Plugin';

export const DEMO_EVENT_TYPE = 'com.amazon.rum.demo_event';
export const DEMO_PLUGIN_ID = 'com.amazonaws.rum.demo';

/**
 * The demo plugin is a dummy plugins. The demo plugin:
 * 1. Trigger a dummy activity every 1 sec.
 * 2. Call back to the session manager to record the demo event data.
 */

export class DemoPlugin implements Plugin {
    configuration: any;
    timerId: number | undefined;
    private recordEvent: RecordEvent | undefined;

    constructor() {
        this.configuration = {};
        this.timerId = undefined;
    }

    load(context: PluginContext): void {
        this.recordEvent = context.record;
        this.enable();
    }

    enable(): void {
        // dummy activity every 1 sec
        if (!this.timerId) {
            this.timerId = window.setInterval(() => {
                if (this.recordEvent) {
                    this.eventHandler(this.recordEvent);
                }
            }, 1_000);
        }
    }

    disable(): void {
        if (this.timerId) {
            window.clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }

    getPluginId(): string {
        return DEMO_PLUGIN_ID;
    }

    record(data: any): void {
        const demoEvent = {
            eventData: data
        };
        this.recordEvent(DEMO_EVENT_TYPE, demoEvent);
    }

    private eventHandler(recordEvent: RecordEvent): void {
        if (this.configuration.enable) {
            const demoEvent = {
                eventData: 'demoEventData'
            };
            recordEvent(DEMO_EVENT_TYPE, demoEvent);
        }
    }
}
