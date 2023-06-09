import { MonkeyPatched } from './MonkeyPatched';
import { HttpEvent } from 'events/http-event';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from './utils/constant';
import { Queue } from '../utils/Queue';
import { XRayTraceEvent } from 'events/xray-trace-event';

export enum HttpInitiatorType {
    FETCH = 'fetch',
    XHR = 'xmlhttprequest'
}

export abstract class HttpPlugin<
    Nodule extends object,
    FieldName extends keyof Nodule
> extends MonkeyPatched<Nodule, FieldName> {
    protected observer?: PerformanceObserver;
    readonly initiatorType: string;
    private httpEventCache = new Queue<HttpEvent>(250);
    private traceEventCache = new Queue<XRayTraceEvent>(250);

    constructor(pluginId: string, httpInitatorType: HttpInitiatorType) {
        super(pluginId);
        this.initiatorType = httpInitatorType;
        this.initObserver();
    }

    protected get supportsPerformanceAPI() {
        return !!(
            window.performance &&
            window.PerformanceObserver &&
            window.PerformanceEntry &&
            window.PerformanceResourceTiming
        );
    }

    private initObserver() {
        if (this.supportsPerformanceAPI) {
            this.observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    const prtEntry = entry as PerformanceResourceTiming;
                    if (prtEntry.initiatorType !== this.initiatorType) {
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
        this.observer?.disconnect();
    }

    private subscribe() {
        this.observer?.observe({ type: 'resource', buffered: true });
    }

    enable() {
        super.enable();
        this.subscribe();
    }

    disable() {
        super.disable();
        this.unsubscribe();
    }

    protected handleHttpEvent(httpEvent: HttpEvent) {
        if (this.supportsPerformanceAPI) {
            this.httpEventCache.add(httpEvent);
        } else {
            this.context.record(HTTP_EVENT_TYPE, httpEvent);
        }
    }

    protected handleTraceEvent(traceEvent: XRayTraceEvent) {
        if (this.supportsPerformanceAPI) {
            this.traceEventCache.add(traceEvent);
        } else {
            this.context.record(XRAY_TRACE_EVENT_TYPE, traceEvent);
        }
    }
}
