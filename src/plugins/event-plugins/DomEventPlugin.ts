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

type ElementMap = {
    element: HTMLElement;
    eventListener: EventListener;
};

export class DomEventPlugin implements Plugin {
    private recordEvent: RecordEvent | undefined;
    private pluginId: string;
    private eventListenerMap: Map<TargetDomEvent, ElementMap[]>;
    private enabled: boolean;
    private config: DomEventPluginConfig;
    private observer: MutationObserver;

    constructor(config?: PartialDomEventPluginConfig) {
        this.pluginId = DOM_EVENT_PLUGIN_ID;
        this.eventListenerMap = new Map<TargetDomEvent, ElementMap[]>();
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

    getPluginConfig(): DomEventPluginConfig {
        return this.config;
    }

    update(config: TargetDomEvent[]): void {
        config.forEach((domEvent) => {
            this.addEventHandler(domEvent);
            this.config.events.push(domEvent);
        });
    }

    private removeListeners() {
        this.config.events.forEach((domEvent) =>
            this.removeEventHandler(domEvent)
        );
    }

    private addListeners(targetElement?: HTMLElement) {
        this.config.events.forEach((domEvent) =>
            this.addEventHandler(domEvent, targetElement)
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

    private addEventHandler(
        domEvent: TargetDomEvent,
        targetElement?: HTMLElement
    ): void {
        const eventType = domEvent.event;
        const eventListener = this.getEventListener(domEvent.cssLocator);
        const elementsList = [];

        // first add event listener to all elements identified by the CSS locator
        if (domEvent.cssLocator) {
            let element: HTMLElement;
            const elementList = document.querySelectorAll(domEvent.cssLocator);
            elementList.forEach((identifiedElement: HTMLElement) => {
                if (targetElement) {
                    if (targetElement === identifiedElement) {
                        element = targetElement;
                    }
                } else {
                    element = identifiedElement;
                }

                if (element) {
                    element.addEventListener(eventType, eventListener);
                    elementsList.push(element);
                }
            });
        } else {
            let element: HTMLElement;
            if (domEvent.elementId) {
                if (targetElement && targetElement.id === domEvent.elementId) {
                    element = targetElement;
                } else {
                    element = document.getElementById(domEvent.elementId);
                }
            } else if (domEvent.element) {
                if (targetElement && targetElement === domEvent.element) {
                    element = targetElement;
                } else {
                    element = domEvent.element;
                }
            }
            if (element) {
                element.addEventListener(eventType, eventListener);
                elementsList.push(element);
            }
        }

        elementsList.forEach((element) => {
            const elementMap: ElementMap = {
                element,
                eventListener
            };
            if (this.eventListenerMap.has(domEvent)) {
                this.eventListenerMap.get(domEvent).push(elementMap);
            } else {
                this.eventListenerMap.set(domEvent, [elementMap]);
            }
        });
    }

    private removeEventHandler(domEvent: TargetDomEvent): void {
        const elementMapList = this.eventListenerMap.get(domEvent);
        if (elementMapList) {
            elementMapList.forEach((elementMap) => {
                elementMap.element.removeEventListener(
                    domEvent.event,
                    elementMap.eventListener
                );
            });
            this.eventListenerMap.delete(domEvent);
        }
    }

    private observeDOMMutation() {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    //  we track only elements, skip other nodes (e.g. text nodes)
                    if (node instanceof HTMLElement) {
                        this.addListeners(node);
                    }
                });
            }
        });

        this.observer.observe(document, { childList: true, subtree: true });
    }
}
