export const UNKNOWN = 'unknown';

// Http request event schemas
export const HTTP_EVENT_TYPE = 'com.amazon.rum.http_event';
export const XRAY_TRACE_EVENT_TYPE = 'com.amazon.rum.xray_trace_event';

// Web vitals event schemas
export const LCP_EVENT_TYPE = 'com.amazon.rum.largest_contentful_paint_event';
export const FID_EVENT_TYPE = 'com.amazon.rum.first_input_delay_event';
export const CLS_EVENT_TYPE = 'com.amazon.rum.cumulative_layout_shift_event';

// Page load event schemas
export const PERFORMANCE_NAVIGATION_EVENT_TYPE =
    'com.amazon.rum.performance_navigation_event';
export const PERFORMANCE_RESOURCE_EVENT_TYPE =
    'com.amazon.rum.performance_resource_event';
export const PERFORMANCE_FIRST_PAINT_EVENT_TYPE =
    'com.amazon.rum.performance_first_paint_event';
export const PERFORMANCE_FIRST_CONTENTFUL_PAINT_EVENT_TYPE =
    'com.amazon.rum.performance_first_contentful_paint_event';

// DOM event schemas
export const DOM_EVENT_TYPE = 'com.amazon.rum.dom_event';

// JS error event schemas
export const JS_ERROR_EVENT_TYPE = 'com.amazon.rum.js_error_event';

// Page view event
export const PAGE_VIEW_EVENT_TYPE = 'com.amazon.rum.page_view_event';

// Session start event
export const SESSION_START_EVENT_TYPE = 'com.amazon.rum.session_start_event';
