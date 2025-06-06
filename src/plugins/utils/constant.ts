export const UNKNOWN = 'unknown';
export const RUM_AMZ_PREFIX = 'com.amazon.rum';
export const RUM_AWS_PREFIX = 'com.amazonaws.rum';

// Http request event schemas
export const HTTP_EVENT_TYPE = `${RUM_AMZ_PREFIX}.http_event`;
export const XRAY_TRACE_EVENT_TYPE = `${RUM_AMZ_PREFIX}.xray_trace_event`;

// Web vitals event schemas
export const LCP_EVENT_TYPE = `${RUM_AMZ_PREFIX}.largest_contentful_paint_event`;
export const FID_EVENT_TYPE = `${RUM_AMZ_PREFIX}.first_input_delay_event`;
export const CLS_EVENT_TYPE = `${RUM_AMZ_PREFIX}.cumulative_layout_shift_event`;
export const INP_EVENT_TYPE = `${RUM_AMZ_PREFIX}.interaction_to_next_paint_event`;

// Page load event schemas
export const PERFORMANCE_NAVIGATION_EVENT_TYPE = `${RUM_AMZ_PREFIX}.performance_navigation_event`;
export const PERFORMANCE_RESOURCE_EVENT_TYPE = `${RUM_AMZ_PREFIX}.performance_resource_event`;

// DOM event schemas
export const DOM_EVENT_TYPE = `${RUM_AMZ_PREFIX}.dom_event`;

// JS error event schemas
export const JS_ERROR_EVENT_TYPE = `${RUM_AMZ_PREFIX}.js_error_event`;

// Page view event
export const PAGE_VIEW_EVENT_TYPE = `${RUM_AMZ_PREFIX}.page_view_event`;

// Session start event
export const SESSION_START_EVENT_TYPE = `${RUM_AMZ_PREFIX}.session_start_event`;

// Time to interactive event
export const TIME_TO_INTERACTIVE_EVENT_TYPE = `${RUM_AMZ_PREFIX}.time_to_interactive_event`;
