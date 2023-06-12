import { MonkeyPatched } from './MonkeyPatched';
import { HttpEvent } from 'events/http-event';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from './utils/constant';
import { Queue } from '../utils/Queue';
import { XRayTraceEvent } from 'events/xray-trace-event';

export enum HttpInitiatorType {
    FETCH = 'fetch',
    XHR = 'xmlhttprequest'
}

/** A plugin that updates HttpEvents and XrayTraceEvents with latency from the Performance API if supported. */
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

    public get supportsPerformanceAPI() {
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

    /** Caches an http or trace event for Perfomance API to update after the PerformanceResourcinTiming entry is created
     * If PRT is unavailable or the cache is full, then the event is recorded immediately
     */
    protected cacheEventForPerformanceObserver(
        eventType: string,
        eventData: HttpEvent | XRayTraceEvent
    ) {
        let wasCached = false;
        if (this.supportsPerformanceAPI) {
            if (eventType === HTTP_EVENT_TYPE) {
                wasCached = this.httpEventCache.add(eventData as HttpEvent);
            } else if (eventType === XRAY_TRACE_EVENT_TYPE) {
                wasCached = this.traceEventCache.add(
                    eventData as XRayTraceEvent
                );
            }
        }

        // PRT is not supported or the cache is full
        if (!wasCached) {
            this.context.record(eventType, eventData);
        }
    }
}
