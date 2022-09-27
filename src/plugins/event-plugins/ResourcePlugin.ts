import { InternalPlugin } from '../InternalPlugin';
import {
    getResourceFileType,
    ResourceType,
    shuffle
} from '../../utils/common-utils';
import { ResourceEvent } from '../../events/resource-event';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../utils/constant';

export const RESOURCE_EVENT_PLUGIN_ID = 'resource';

const RESOURCE = 'resource';
const LOAD = 'load';

export type PartialResourcePluginConfig = {
    eventLimit?: number;
    recordAllTypes?: ResourceType[];
    sampleTypes?: ResourceType[];
};

export type ResourcePluginConfig = {
    eventLimit: number;
    recordAllTypes: ResourceType[];
    sampleTypes: ResourceType[];
};

export const defaultConfig = {
    eventLimit: 10,
    recordAllTypes: [ResourceType.DOCUMENT, ResourceType.SCRIPT],
    sampleTypes: [
        ResourceType.STYLESHEET,
        ResourceType.IMAGE,
        ResourceType.FONT,
        ResourceType.OTHER
    ]
};

/**
 * This plugin records resource performance timing events generated during every page load/re-load.
 */
export class ResourcePlugin extends InternalPlugin {
    private config: ResourcePluginConfig;

    constructor(config?: PartialResourcePluginConfig) {
        super(RESOURCE_EVENT_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        window.addEventListener(LOAD, this.resourceEventListener);
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        if (this.resourceEventListener) {
            window.removeEventListener(LOAD, this.resourceEventListener);
        }
    }

    resourceEventListener = (event: Event): void => {
        const recordAll: PerformanceEntry[] = [];
        const sample: PerformanceEntry[] = [];
        let eventCount = 0;

        const resourceObserver = new PerformanceObserver((list) => {
            list.getEntries()
                .filter((e) => e.entryType === RESOURCE)
                .forEach((event) => {
                    // Out of n resource events, x events are recorded using Observer API
                    const type: ResourceType = getResourceFileType(event.name);
                    if (this.config.recordAllTypes.includes(type)) {
                        recordAll.push(event);
                    } else if (this.config.sampleTypes.includes(type)) {
                        sample.push(event);
                    }
                });
        });
        resourceObserver.observe({
            entryTypes: [RESOURCE]
        });

        // Remaining (n-x) resource events are recorded using getEntriesByType API.
        // Note: IE11 browser does not support Performance Observer API. Handle the failure gracefully
        const events = performance.getEntriesByType(RESOURCE);
        if (events !== undefined && events.length > 0) {
            events.forEach((event) => {
                const type: ResourceType = getResourceFileType(event.name);
                if (this.config.recordAllTypes.includes(type)) {
                    recordAll.push(event);
                } else if (this.config.sampleTypes.includes(type)) {
                    sample.push(event);
                }
            });
        }

        // Record events for resources in recordAllTypes
        shuffle(recordAll);
        while (recordAll.length > 0 && eventCount < this.config.eventLimit) {
            this.recordResourceEvent(
                recordAll.pop() as PerformanceResourceTiming
            );
            eventCount++;
        }

        // Record events sampled from resources in sample
        shuffle(sample);
        while (sample.length > 0 && eventCount < this.config.eventLimit) {
            this.recordResourceEvent(sample.pop() as PerformanceResourceTiming);
            eventCount++;
        }
    };

    recordResourceEvent = (entryData: PerformanceResourceTiming): void => {
        // Ignore monitoring beacons.
        if (
            new URL(entryData.name).host ===
            this.context.config.endpointUrl.host
        ) {
            return;
        }

        if (this.context?.record) {
            const eventData: ResourceEvent = {
                version: '1.0.0',
                initiatorType: entryData.initiatorType,
                duration: entryData.duration,
                fileType: getResourceFileType(entryData.name),
                transferSize: entryData.transferSize
            };
            if (this.context.config.recordResourceUrl) {
                eventData.targetUrl = entryData.name;
            }
            this.context.record(PERFORMANCE_RESOURCE_EVENT_TYPE, eventData);
        }
    };

    protected onload(): void {
        window.addEventListener(LOAD, this.resourceEventListener);
    }
}
