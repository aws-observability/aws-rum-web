import { ResourceType } from '../../utils/common-utils';

export const defaultIgnore = (entry: PerformanceEntry) =>
    entry.entryType === 'resource' && !/^https?:/.test(entry.name);

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
    recordAllTypes: [ResourceType.DOCUMENT, ResourceType.SCRIPT],
    sampleTypes: [
        ResourceType.STYLESHEET,
        ResourceType.IMAGE,
        ResourceType.FONT,
        ResourceType.OTHER
    ]
};
