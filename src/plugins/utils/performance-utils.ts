import { ResourceType } from '../../utils/common-utils';

export const defaultIgnore = (entry: PerformanceEntry) =>
    entry.entryType === 'resource' &&
    (!/^https?:/.test(entry.name) ||
        /^(fetch|xmlhttprequest)$/.test(
            (entry as PerformanceResourceTimingPolyfill).initiatorType
        ));

export type PartialPerformancePluginConfig = {
    eventLimit?: number;
    ignore?: (event: PerformanceEntry) => any;
    recordAllTypes?: ResourceType[];
    sampleTypes?: ResourceType[];
};

export type PerformancePluginConfig = {
    eventLimit: number;
    ignore: (event: PerformanceEntry) => any;
    recordAllTypes: ResourceType[];
    sampleTypes: ResourceType[];
};

export const defaultPerformancePluginConfig = {
    eventLimit: 10,
    ignore: defaultIgnore,
    recordAllTypes: [
        ResourceType.DOCUMENT,
        ResourceType.SCRIPT,
        ResourceType.STYLESHEET,
        ResourceType.FONT
    ],
    sampleTypes: [ResourceType.IMAGE, ResourceType.OTHER]
};

/** Field renderBlockingStatus is currently missing from the node runtime and will cause build failures. */
export interface PerformanceResourceTimingPolyfill
    extends PerformanceResourceTiming {
    renderBlockingStatus?: string;
}
