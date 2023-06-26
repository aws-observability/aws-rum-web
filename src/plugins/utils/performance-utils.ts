export const defaultPerformanceIgnore = (entry: PerformanceEntry) =>
    entry.entryType === 'resource' && !/^https?:/.test(entry.name);

export type PartialPerformancePluginConfig = {
    ignore?: (event: PerformanceEntry) => any;
    eventLimit?: number;
};

export type PerformancePluginConfig = {
    ignore: (event: PerformanceEntry) => any;
    eventLimit: number;
};

export const defaultPerformancePluginConfig = {
    ignore: defaultPerformanceIgnore,
    eventLimit: 10
};
