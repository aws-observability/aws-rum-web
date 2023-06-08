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
    protected observer?: PerformanceObserver;
    readonly initiatorType: string;
    private cache: HttpEvent[] = [];
    readonly cacheCapacity = 250;

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
                        httpEvent.duration = prtEntry.duration;
                        this.context.record(HTTP_EVENT_TYPE, httpEvent);
                    } else {
                        console.log(
                            this.cache.length,
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

    /* http event cache handlers */

    private get cacheIsFull() {
        return this.cache.length >= this.cacheCapacity;
    }

    protected cacheEvent(httpEvent: HttpEvent) {
        if (this.cacheIsFull) {
            return;
        }
        this.cache.push(httpEvent);
    }

    private pullEvent(url: string) {
        const cache = this.cache;
        for (let i = 0; i < cache.length; i++) {
            const event = cache[i];
            if (event.request.url === url) {
                cache.splice(i, 1);
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
