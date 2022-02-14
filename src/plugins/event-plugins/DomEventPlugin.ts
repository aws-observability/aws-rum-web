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
    private eventListenerMap: Map<TargetDomEvent, Map<string, EventListener>>;
    private identifierToEventListenerMap: Map<string, EventListener>;
    private enabled: boolean;
    private config: DomEventPluginConfig;

    constructor(config?: PartialDomEventPluginConfig) {
        this.pluginId = DOM_EVENT_PLUGIN_ID;
        this.eventListenerMap = new Map<
            TargetDomEvent,
            Map<string, EventListener>
        >();
        this.identifierToEventListenerMap = new Map<string, EventListener>();
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
                elementId: this.getElementId(event)
            };
            if (domEvent?.cssLocator) {
                eventData.cssLocator = this.getElementCSSLocator(domEvent);
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

    private getElementCSSLocator(domEvent: TargetDomEvent) {
        if (domEvent.cssLocator) {
            return domEvent.cssLocator;
        }
        return undefined;
    }
    private addEventHandler(domEvent: TargetDomEvent): void {
        const eventType = domEvent.event;

        this.eventListenerMap.set(domEvent, this.identifierToEventListenerMap);
        const eventListenerCSS = this.getEventListener(domEvent);
        const eventListenerID = this.getEventListener();
        this.identifierToEventListenerMap.set('CSS', eventListenerCSS);
        this.identifierToEventListenerMap.set('ID', eventListenerID);

        let isElementIdentifiedByLocator = false;

        // first add event listener to all elements identified by the CSS locator
        if (domEvent.cssLocator) {
            const elementList = document.querySelectorAll(domEvent.cssLocator);
            elementList.forEach((element: HTMLElement) => {
                if (document.getElementById(domEvent.elementId) === element) {
                    isElementIdentifiedByLocator = true;
                }
                element.addEventListener(eventType, eventListenerCSS);
            });
        }

        // add event listener to element identified by the element ID if no CSS locator provided or
        // the element is not one of the elements identified by the CSS locator
        if (domEvent.elementId && !isElementIdentifiedByLocator) {
            document
                .getElementById(domEvent.elementId)
                ?.addEventListener(eventType, eventListenerID);

            // safe default
        } else if (domEvent.element) {
            domEvent.element.addEventListener(eventType, eventListenerID);
        }
    }

    private removeEventHandler(domEvent: TargetDomEvent): void {
        const eventListenerID:
            | EventListener
            | undefined = this.eventListenerMap.get(domEvent).get('ID');
        const eventListenerCSS:
            | EventListener
            | undefined = this.eventListenerMap.get(domEvent).get('CSS');

        let isElementIdentifiedByLocator = false;

        // first remove event listener from all elements identified by the CSS locator
        if (domEvent.cssLocator) {
            const elementList = document.querySelectorAll(domEvent.cssLocator);
            elementList.forEach((element: HTMLElement) => {
                if (document.getElementById(domEvent.elementId) === element) {
                    isElementIdentifiedByLocator = true;
                }
                element.removeEventListener(domEvent.event, eventListenerCSS);
            });
        }

        // remove event listener from element identified by the element ID if no CSS locator provided or
        // the element is not one of the elements identified by the CSS locator
        if (domEvent.elementId && eventListenerID) {
            const element = document.getElementById(domEvent.elementId);
            if (element) {
                element.removeEventListener(domEvent.event, eventListenerID);
            }

            // remove event listener from default
        } else if (domEvent.element && eventListenerID) {
            domEvent.element.removeEventListener(
                domEvent.event,
                eventListenerID
            );
        }
        this.eventListenerMap.delete(domEvent);
    }
}
