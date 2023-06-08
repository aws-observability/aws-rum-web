import { MonkeyPatched } from './MonkeyPatched';
import { HttpEvent } from 'events/http-event';
import { HTTP_EVENT_TYPE } from './utils/constant';

export enum HttpInitiatorType {
    FETCH = 'fetch',
    XHR = 'xmlhttprequest'
}

export abstract class HttpPlugin<
    Nodule extends object,
    FieldName extends keyof Nodule
> extends MonkeyPatched<Nodule, FieldName> {
    protected observer!: PerformanceObserver;
    readonly initiatorType: string;
    private eventCache: HttpEvent[] = [];

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
                    const httpEvent = this.pullEvent(prtEntry.name);
                    if (httpEvent) {
                        httpEvent.startTime = prtEntry.startTime;
                        httpEvent.duration = prtEntry.duration;
                    } else {
                        console.log(
                            this.eventCache.length,
                            'todo: handle cache miss',
                            prtEntry
                        );
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

    protected cacheEvent(httpEvent: HttpEvent) {
        this.eventCache.push(httpEvent);
    }

    private pullEvent(url: string) {
        const eventCache = this.eventCache;
        for (let i = 0; i < eventCache.length; i++) {
            const event = eventCache[i];
            if (event.request.url === url) {
                eventCache.splice(i, 1);
                return event;
            }
        }
    }

    enable() {
        super.enable();
        this.subscribe();
    }

    disable() {
        super.disable();
        this.unsubscribe();
    }

    protected recordIfPerformanceAPINotSupported(httpEvent: HttpEvent) {
        if (this.supportsPerformanceAPI) {
            this.cacheEvent(httpEvent);
        } else {
            this.context.record(HTTP_EVENT_TYPE, httpEvent as object);
        }
    }
}
