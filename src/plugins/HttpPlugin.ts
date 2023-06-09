import { MonkeyPatched } from './MonkeyPatched';
import { HttpEvent } from 'events/http-event';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from './utils/constant';
import { Queue } from '../utils/Queue';
import { XRayTraceEvent } from 'events/xray-trace-event';

export enum HttpInitiatorType {
    FETCH = 'fetch',
    XHR = 'xmlhttprequest'
}

/** A plugin that updates HttpEvents and XrayTraceEvents with timestamps from the Performance API if supported by the browser.*/
export abstract class HttpPlugin<
    Nodule extends object,
    FieldName extends keyof Nodule
> extends MonkeyPatched<Nodule, FieldName> {
    private performanceObserver?: PerformanceObserver;
    private httpEventCache = new Queue<HttpEvent>(250);
    private traceEventCache = new Queue<XRayTraceEvent>(250);

    constructor(pluginId: string, private initatorType: HttpInitiatorType) {
        super(pluginId);
        this.initPerformanceObserver();
    }

    protected get supportsPerformanceAPI() {
        return !!(
            window.PerformanceObserver && window.PerformanceResourceTiming
        );
    }

    private initPerformanceObserver() {
        if (this.supportsPerformanceAPI) {
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    const prtEntry = entry as PerformanceResourceTiming;
                    if (prtEntry.initiatorType !== this.initatorType) {
                        return;
                    }

                    const httpEvent = this.httpEventCache.findFirstMatchAndPull(
                        (httpEvent) => httpEvent.request.url === prtEntry.name
                    );
                    if (httpEvent) {
                        httpEvent.duration = prtEntry.duration;
                        this.context.record(HTTP_EVENT_TYPE, httpEvent);
                    }

                    const traceEvent =
                        this.traceEventCache.findFirstMatchAndPull(
                            (traceEvent) =>
                                traceEvent.http?.request?.url === prtEntry.name
                        );
                    if (traceEvent) {
                        traceEvent.end_time =
                            (prtEntry.startTime + prtEntry.duration) / 1000;
                        this.context.record(XRAY_TRACE_EVENT_TYPE, traceEvent);
                    }
                });
            });
        }
    }

    private unsubscribe() {
        this.performanceObserver?.disconnect();
    }

    private subscribe() {
        this.performanceObserver?.observe({ type: 'resource', buffered: true });
    }

    enable() {
        super.enable();
        this.subscribe();
    }

    disable() {
        super.disable();
        this.unsubscribe();
    }

    /** Caches the http event for Perfomance API to update later if supported by browser, or records immediately */
    protected handoffHttpEventToPerformanceAPI(httpEvent: HttpEvent) {
        if (this.supportsPerformanceAPI) {
            this.httpEventCache.add(httpEvent);
        } else {
            this.context.record(HTTP_EVENT_TYPE, httpEvent);
        }
    }

    /** Caches the trace event for Perfomance API to update later if supported by browser, or records immediately */
    protected handoffTraceEventToPerformanceAPI(traceEvent: XRayTraceEvent) {
        if (this.supportsPerformanceAPI) {
            this.traceEventCache.add(traceEvent);
        } else {
            this.context.record(XRAY_TRACE_EVENT_TYPE, traceEvent);
        }
    }
}
