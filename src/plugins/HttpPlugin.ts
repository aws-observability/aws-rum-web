import { MonkeyPatched } from './MonkeyPatched';

export enum HttpInitiatorType {
    fetch = 'fetch',
    xhr = 'xmlhttprequest'
}

export abstract class HttpPlugin<
    Nodule extends object,
    FieldName extends keyof Nodule
> extends MonkeyPatched<Nodule, FieldName> {
    protected observer!: PerformanceObserver;
    readonly initiatorType: string;
    readonly usesPRT: boolean;

    constructor(pluginId: string, httpInitatorType: HttpInitiatorType) {
        super(pluginId);
        this.initiatorType = httpInitatorType;
        this.usesPRT = this.initObserver();
    }

    private initObserver(): boolean {
        const prtIsSupported = !!(
            window.performance &&
            window.PerformanceObserver &&
            window.PerformanceEntry
        );
        if (prtIsSupported) {
            this.observer = new PerformanceObserver((list, observer) => {
                list.getEntries().forEach((entry, index) => {
                    console.log(index, entry);
                    // todo: refactor to cache performance data
                });
            });
        }
        return prtIsSupported;
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
}
