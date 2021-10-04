import { RecordEvent, Plugin, PluginContext } from '../Plugin';
import { getHost } from '../../utils/common-utils';
import { PaintEvent } from '../../events/paint-event';
import {
    PERFORMANCE_FIRST_CONTENTFUL_PAINT_EVENT_TYPE,
    PERFORMANCE_FIRST_PAINT_EVENT_TYPE
} from '../utils/constant';

export const PAINT_EVENT_PLUGIN_ID = 'com.amazonaws.rum.paint';

const FIRST_PAINT = 'first-paint';
const FIRST_CONTENTFUL_PAINT = 'first-contentful-paint';
const PAINT = 'paint';
const RESOURCE = 'resource';
const LOAD = 'load';

/**
 * This plugin records paint performance timing events generated during every
 * page load/re-load.
 */
export class PaintPlugin implements Plugin {
    private pluginId: string;
    private enabled: boolean;
    private recordEvent: RecordEvent | undefined;

    /**
     * The data plane service endpoint. Resources from this endpoint will be
     * ignored; i.e., this plugin will not generate resource performance events
     * for them.
     */
    private dataPlaneEndpoint: string;

    constructor(dataPlaneEndpoint) {
        this.pluginId = PAINT_EVENT_PLUGIN_ID;
        this.enabled = true;
        this.dataPlaneEndpoint = dataPlaneEndpoint;
    }

    load(context: PluginContext): void {
        this.recordEvent = context.record;
        if (this.enabled) {
            window.addEventListener(LOAD, this.eventListener);
        }
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        window.addEventListener(LOAD, this.eventListener);
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        if (this.eventListener) {
            window.removeEventListener(LOAD, this.eventListener);
        }
    }

    getPluginId(): string {
        return this.pluginId;
    }

    // tslint:disable:no-empty
    configure(config: string[]): void {}

    eventListener: EventListener = () => {
        let events: PerformanceEntryList;
        let isFirstPaintAvailable = false;
        events = performance.getEntriesByType(PAINT);
        if (events !== undefined && events.length > 0) {
            events.forEach((event) => {
                if (event.name === FIRST_PAINT) {
                    isFirstPaintAvailable = true;
                }
                this.performancePaintEventHandler(event);
            });
        }

        if (!isFirstPaintAvailable) {
            /**
             * 1. Firefox does not provide first-paint and first-contentful Paint API.
             * 2. Safari does not provide first-paint API. Paint is not available in Safari
             *    - https://bugs.webkit.org/show_bug.cgi?id=78011
             * 3. First Paint event is derived using algorithm if not available directly.
             *    Refer - https://github.com/addyosmani/timing.js/issues/31
             */
            this.recordDerivedFirstPaintEvent();
        }
    };

    recordDerivedFirstPaintEvent = () => {
        let events: PerformanceEntryList;
        const filteredEvents = [];

        // 1. record domInteractive
        const domInteractive =
            performance.timing.domInteractive -
            performance.timing.navigationStart;

        const resourceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((event) => {
                // Out of n resource events, x events are recorded using Observer API
                if (
                    event.entryType === RESOURCE &&
                    getHost(event.name) !== getHost(this.dataPlaneEndpoint)
                ) {
                    const e = event as PerformanceResourceTiming;
                    // 2. Filter events with initiatorType as 'script' or 'link' with startTime less than domInteractive
                    if (
                        (e.initiatorType === 'script' ||
                            e.initiatorType === 'link') &&
                        e.startTime < domInteractive
                    ) {
                        filteredEvents.push(e);
                    }
                }
            });
        });
        resourceObserver.observe({
            entryTypes: [RESOURCE]
        });

        /**
         * Remaining (n-x) resource events are recorded using getEntriesByType API.
         * Note: IE11 browser does not support Performance Observer API. Handle the failure gracefully
         */
        events = performance.getEntriesByType(RESOURCE);
        if (events !== undefined && events.length > 0) {
            events.forEach((event) => {
                const e = event as PerformanceResourceTiming;
                // 2. Filter events with initiatorType as 'script' or 'link' with startTime less than domInteractive
                if (
                    (e.initiatorType === 'script' ||
                        e.initiatorType === 'link') &&
                    e.startTime < domInteractive &&
                    getHost(e.name) !== getHost(this.dataPlaneEndpoint)
                ) {
                    filteredEvents.push(e);
                }
            });
        }

        // 3. Find maximum responseEnd event among the filteredEvents
        if (filteredEvents.length > 0) {
            const maxResponseEndEvent = filteredEvents.reduce((prev, current) =>
                prev.responseEnd > current.responseEnd ? prev : current
            );

            const eventData: PaintEvent = {
                version: '1.0.0',
                startTime: maxResponseEndEvent.responseEnd,
                duration: 0
            };

            if (this.recordEvent) {
                this.recordEvent(PERFORMANCE_FIRST_PAINT_EVENT_TYPE, eventData);
            }
        }
    };

    performancePaintEventHandler = (entryData: any): void => {
        const eventData: PaintEvent = {
            version: '1.0.0',
            startTime: entryData.startTime,
            duration: entryData.duration
        };

        let eventType = '';
        switch (entryData.name) {
            case FIRST_PAINT:
                eventType = PERFORMANCE_FIRST_PAINT_EVENT_TYPE;
                break;
            case FIRST_CONTENTFUL_PAINT:
                eventType = PERFORMANCE_FIRST_CONTENTFUL_PAINT_EVENT_TYPE;
                break;
        }
        if (this.recordEvent) {
            this.recordEvent(eventType, eventData);
        }
    };
}
