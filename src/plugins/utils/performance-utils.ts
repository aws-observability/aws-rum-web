export const defaultPerformanceIgnore = (entry: PerformanceEntry) =>
    entry.name.startsWith('chrome-extension');
