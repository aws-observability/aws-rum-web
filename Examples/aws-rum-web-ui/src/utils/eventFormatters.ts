export const RRWEB_EVENT_TYPE_NAMES: Record<number, string> = {
    0: 'DomContentLoaded',
    1: 'Load',
    2: 'FullSnapshot',
    3: 'IncrementalSnapshot',
    4: 'Meta',
    5: 'Custom',
    6: 'Plugin'
};

export function getEventColor(type: string): string {
    if (type.includes('error')) return '#d13212';
    if (type.includes('navigation') || type.includes('page_view'))
        return '#0972d3';
    if (type.includes('http')) return '#037f0c';
    if (type.includes('performance')) return '#8b6ccf';
    if (type.includes('rrweb')) return '#8b6ccf';
    return '#5f6b7a';
}

export function getEventLabel(type: string): string {
    const label = type.replace('com.amazon.rum.', '').replace(/_/g, ' ');
    if (label === 'rrweb') return 'RRWeb Event';
    return label
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
