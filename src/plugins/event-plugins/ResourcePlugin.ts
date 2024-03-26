import { InternalPlugin } from '../InternalPlugin';
import { getResourceFileType, shuffle } from '../../utils/common-utils';
import { ResourceEvent } from '../../events/resource-event';
import { PERFORMANCE_RESOURCE_EVENT_TYPE } from '../utils/constant';
import {
    defaultPerformancePluginConfig,
    PerformancePluginConfig
} from '../utils/performance-utils';

export const RESOURCE_EVENT_PLUGIN_ID = 'resource';

const RESOURCE = 'resource';

/**
 * This plugin records resource performance timing events generated during every page load/re-load.
 */
export class ResourcePlugin extends InternalPlugin {
    private config: PerformancePluginConfig;
    private resourceObserver: PerformanceObserver;
    private eventCount: number;

    constructor(config?: Partial<PerformancePluginConfig>) {
        super(RESOURCE_EVENT_PLUGIN_ID);
        this.config = { ...defaultPerformancePluginConfig, ...config };
        this.eventCount = 0;
        this.resourceObserver = new PerformanceObserver(
            this.performanceEntryHandler
        );
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        this.resourceObserver.observe({
            type: RESOURCE,
            buffered: true
        });
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.resourceObserver.disconnect();
    }

    performanceEntryHandler = (list: PerformanceObserverEntryList): void => {
        this.recordPerformanceEntries(list.getEntries());
    };

    recordPerformanceEntries = (list: PerformanceEntryList) => {
        const recordAll: PerformanceEntry[] = [];
        const sample: PerformanceEntry[] = [];

        list.filter((e) => e.entryType === RESOURCE)
            .filter((e) => !this.config.ignore(e))
            .forEach((event) => {
                const { name, initiatorType } =
                    event as PerformanceResourceTiming;
                const type = getResourceFileType(name, initiatorType);
                if (this.config.recordAllTypes.includes(type)) {
                    recordAll.push(event);
                } else if (this.config.sampleTypes.includes(type)) {
                    sample.push(event);
                }
            });

        // Record all events for resources in recordAllTypes
        recordAll.forEach((r) =>
            this.recordResourceEvent(r as PerformanceResourceTiming)
        );

        // Record events from resources in sample until we hit the resource limit
        shuffle(sample);
        while (sample.length > 0 && this.eventCount < this.config.eventLimit) {
            this.recordResourceEvent(sample.pop() as PerformanceResourceTiming);
            this.eventCount++;
        }
    };

    recordResourceEvent = ({
        name,
        startTime,
        initiatorType,
        duration,
        transferSize
    }: PerformanceResourceTiming): void => {
        const pathRegex =
            /.*\/application\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/events/;
        let entryUrl: URL;
        try {
            entryUrl = new URL(name);
        } catch {
            // Throw error if constructing URL for name fails. Log name
            // value with the error to identify patterns that cause such
            // failures.
            throw new Error(
                `Unable to construct URL from PerformanceResourceTiming name: ${name}`
            );
        }
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
            const eventData: ResourceEvent = {
                version: '1.0.0',
                initiatorType,
                startTime,
                duration,
                fileType: getResourceFileType(name, initiatorType),
                transferSize
            };
            if (this.context.config.recordResourceUrl) {
                eventData.targetUrl = name;
            }
            this.context.record(PERFORMANCE_RESOURCE_EVENT_TYPE, eventData);
        }
    };

    protected onload(): void {
        // We need to set `buffered: true`, so the observer also records past
        // resource entries. However, there is a limited buffer size, so we may
        // not be able to collect all resource entries.
        this.resourceObserver.observe({
            type: RESOURCE,
            buffered: true
        });
    }
}
