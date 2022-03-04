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

export type ElementEventListener = {
    element: HTMLElement;
    eventListener: EventListener;
};

export class DomEventPlugin implements Plugin {
    private recordEvent: RecordEvent | undefined;
    private pluginId: string;
    private eventListenerMap: Map<TargetDomEvent, ElementEventListener[]>;
    private enabled: boolean;
    private config: DomEventPluginConfig;
    private observer: MutationObserver;

    constructor(config?: PartialDomEventPluginConfig) {
        this.pluginId = DOM_EVENT_PLUGIN_ID;
        this.eventListenerMap = new Map<
            TargetDomEvent,
            ElementEventListener[]
        >();
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
        this.observeDOMMutation();
        this.enabled = true;
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.removeListeners();
        this.observer.disconnect();
        this.enabled = false;
    }

    getPluginId(): string {
        return this.pluginId;
    }

    update(events: TargetDomEvent[]): void {
        events.forEach((domEvent) => {
            this.addEventHandler(domEvent);
            this.config.events.push(domEvent);
        });
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

    private getEventListener(cssLocator?: string): EventListener {
        return (event: Event): void => {
            const eventData: DomEvent = {
                version: '1.0.0',
                event: event.type,
                elementId: this.getElementId(event)
            };
            if (cssLocator !== undefined) {
                eventData.cssLocator = cssLocator;
            }
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

    private addEventHandler(domEvent: TargetDomEvent): void {
        const eventType = domEvent.event;
        const eventListener = this.getEventListener(domEvent.cssLocator);

        const identifiedElementList = [];
        const elementEventListenerList: ElementEventListener[] = this.eventListenerMap.has(
            domEvent
        )
            ? this.eventListenerMap.get(domEvent)
            : [];

        // first add event listener to all elements identified by the CSS locator
        if (domEvent.cssLocator) {
            const cssLocatedElements = document.querySelectorAll(
                domEvent.cssLocator
            );
            cssLocatedElements.forEach((element) => {
                identifiedElementList.push(element);
            });
        } else if (domEvent.elementId) {
            const identifiedElement = document.getElementById(
                domEvent.elementId
            );
            if (identifiedElement) {
                identifiedElementList.push(identifiedElement);
            }
        } else if (domEvent.element) {
            identifiedElementList.push(domEvent.element);
        }

        identifiedElementList.forEach((element) => {
            element.addEventListener(eventType, eventListener);
            elementEventListenerList.push({ element, eventListener });
        });

        this.eventListenerMap.set(domEvent, elementEventListenerList);
    }

    private removeEventHandler(domEvent: TargetDomEvent): void {
        const elementEventListenerList = this.eventListenerMap.get(domEvent);
        if (elementEventListenerList) {
            elementEventListenerList.forEach((elementEventListener) => {
                const element = elementEventListener.element;
                const eventListener = elementEventListener.eventListener;
                element.removeEventListener(domEvent.event, eventListener);
            });
            this.eventListenerMap.delete(domEvent);
        }
    }

    private observeDOMMutation() {
        this.observer = new MutationObserver(() => {
            this.removeListeners();
            this.addListeners();
        });
        //  we track only changes to nodes/DOM elements, not attributes or characterData
        this.observer.observe(document, { childList: true, subtree: true });
    }
}
