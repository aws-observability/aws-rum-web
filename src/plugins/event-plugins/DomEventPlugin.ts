import { RecordEvent, Plugin, PluginContext } from '../Plugin';
import { DomEvent } from '../../events/dom-event';
import { DOM_EVENT_TYPE } from '../utils/constant';

export const DOM_EVENT_PLUGIN_ID = 'com.amazonaws.rum.dom-event';

export type TargetDomEvent = {
    /**
     * DOM event type (e.g., click, scroll, hover, etc.)
     */
    event: string;

    /**
     * DOM element ID.
     */
    elementId?: string;

    /**
     * DOM element map to identify one element attribute and its expected value
     */
    cssLocator?: string;

    /**
     * DOM element
     */
    element?: HTMLElement;
};

export type PartialDomEventPluginConfig = {
    events?: TargetDomEvent[];
};

export type DomEventPluginConfig = {
    events: TargetDomEvent[];
};

const defaultConfig: DomEventPluginConfig = {
    events: []
};

export class DomEventPlugin implements Plugin {
    private recordEvent: RecordEvent | undefined;
    private pluginId: string;
    private eventListenerMap: Map<TargetDomEvent, EventListener>;
    private enabled: boolean;
    private config: DomEventPluginConfig;

    constructor(config?: PartialDomEventPluginConfig) {
        this.pluginId = DOM_EVENT_PLUGIN_ID;
        this.eventListenerMap = new Map<TargetDomEvent, EventListener>();
        this.config = { ...defaultConfig, ...config };
        this.enabled = false;
    }

    load(context: PluginContext): void {
        this.recordEvent = context.record;
        this.enable();
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.addListeners();
        this.enabled = true;
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.removeListeners();
        this.enabled = false;
    }

    getPluginId(): string {
        return this.pluginId;
    }

    private removeListeners() {
        this.config.events.forEach((domEvent) =>
            this.removeEventHandler(domEvent)
        );
    }

    private addListeners() {
        this.config.events.forEach((domEvent) =>
            this.addEventHandler(domEvent)
        );
    }

    private getEventListener(domEvent?: TargetDomEvent): EventListener {
        return (event: Event): void => {
            const eventData: DomEvent = {
                version: '1.0.0',
                event: event.type,
                elementId: this.getElementId(event),
                cssLocator: this.getElementCSSLocator(event, domEvent)
            };
            if (this.recordEvent) {
                this.recordEvent(DOM_EVENT_TYPE, eventData);
            }
        };
    }

    private getElementId(event: Event) {
        if (!event.target) {
            return '';
        }

        if (event.target instanceof Element && event.target.id) {
            return event.target.id;
        }

        if (event.target instanceof Node) {
            return event.target.nodeName;
        }

        return '';
    }

    private getElementCSSLocator(event: Event, domEvent: TargetDomEvent) {
        if (!event.target) {
            return '';
        }

        if (event.target instanceof Element && domEvent.cssLocator) {
            return domEvent.cssLocator;
        }

        if (event.target instanceof Node) {
            return event.target.nodeName;
        }
    }
    private addEventHandler(domEvent: TargetDomEvent): void {
        const eventType = domEvent.event;
        const eventListener = this.getEventListener(domEvent);
        this.eventListenerMap.set(domEvent, eventListener);

        if (domEvent.elementId) {
            document
                .getElementById(domEvent.elementId)
                ?.addEventListener(eventType, eventListener);
        } else if (domEvent.cssLocator) {
            const elementList = document.querySelectorAll(domEvent.cssLocator);
            for (let i = 0; i < elementList.length; i++) {
                elementList[i].addEventListener(eventType, eventListener);
            }
        } else if (domEvent.element) {
            domEvent.element.addEventListener(eventType, eventListener);
        }
    }

    private removeEventHandler(domEvent: TargetDomEvent): void {
        const eventListener:
            | EventListener
            | undefined = this.eventListenerMap.get(domEvent);

        if (domEvent.elementId && eventListener) {
            const element = document.getElementById(domEvent.elementId);
            if (element) {
                element.removeEventListener(domEvent.event, eventListener);
            }
        } else if (domEvent.element && eventListener) {
            domEvent.element.removeEventListener(domEvent.event, eventListener);
        }
        this.eventListenerMap.delete(domEvent);
    }
}
