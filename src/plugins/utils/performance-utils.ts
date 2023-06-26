export const defaultPerformanceIgnore = (entry: PerformanceEntry) =>
    entry.name.startsWith('chrome-extension');

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
