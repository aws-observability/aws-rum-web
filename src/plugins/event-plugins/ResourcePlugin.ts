import { InternalPlugin } from '../InternalPlugin';
import {
    getResourceFileType,
    ResourceType,
    shuffle
} from '../../utils/common-utils';
import { ResourceEvent } from '../../events/resource-event';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../utils/constant';
import {
    defaultPerformancePluginConfig,
    PartialPerformancePluginConfig,
    PerformancePluginConfig
} from '../utils/performance-utils';

export const RESOURCE_EVENT_PLUGIN_ID = 'resource';

const RESOURCE = 'resource';
const LOAD = 'load';

/**
 * This plugin records resource performance timing events generated during every page load/re-load.
 */
export class ResourcePlugin extends InternalPlugin {
    private config: PerformancePluginConfig;

    constructor(config?: PartialPerformancePluginConfig) {
        super(RESOURCE_EVENT_PLUGIN_ID);
        this.config = { ...defaultPerformancePluginConfig, ...config };
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
                .filter((e) => !this.config.ignore(e))
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
            events
                .filter((e) => !this.config.ignore(e))
                .forEach((event) => {
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
        const pathRegex =
            /.*\/application\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/events/;
        const entryUrl = new URL(entryData.name);
        if (
            entryUrl.host === this.context.config.endpointUrl.host &&
            pathRegex.test(entryUrl.pathname)
        ) {
            // Ignore calls to PutRumEvents (i.e., the CloudWatch RUM data
            // plane), otherwise we end up in an infinite loop of recording
            // PutRumEvents.
            return;
        }

        if (this.context?.record) {
            const fileType = getResourceFileType(entryData.name);
            const eventData: ResourceEvent = {
                version: '1.0.0',
                initiatorType: entryData.initiatorType,
                duration: entryData.duration,
                fileType,
                transferSize: entryData.transferSize
            };
            if (this.context.config.recordResourceUrl) {
                eventData.targetUrl = entryData.name;
            }
            const parsedEvent = this.context.record(
                PERFORMANCE_RESOURCE_EVENT_TYPE,
                eventData
            );

            if (parsedEvent && fileType === ResourceType.IMAGE) {
                this.context?.bus.dispatch(PERFORMANCE_RESOURCE_EVENT_TYPE, {
                    key: entryData,
                    payload: parsedEvent
                });
            }
        }
    };

    protected onload(): void {
        window.addEventListener(LOAD, this.resourceEventListener);
    }
}
