import { NavigationEvent } from '../../events/navigation-event';
import { Config } from '../../orchestration/Orchestration';
import { Page } from '../../sessions/PageManager';
import { MonkeyPatched } from '../MonkeyPatched';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../utils/constant';

type Fetch = typeof fetch;
type Send = () => void;
type Patching = Pick<XMLHttpRequest & Window, 'fetch' | 'send'>;

export const VIRTUAL_PAGELOAD_PLUGIN_ID = 'virtual-page-load-timer';
/**
 * Maintains the core logic for virtual page load timing functionality.
 * (1) Holds all virtual page load timing related resources
 * (2) Intercepts outgoing XMLHttpRequests and Fetch requests and listens for DOM changes
 * (3) Records virtual page load
 */
export class VirtualPageLoadPlugin extends MonkeyPatched<
    Patching,
    'fetch' | 'send'
> {
    protected get patches() {
        return [
            {
                nodule: (XMLHttpRequest.prototype as unknown) as Patching,
                name: 'send' as const,
                wrapper: this.sendWrapper
            },
            {
                nodule: (window as unknown) as Patching,
                name: 'fetch' as const,
                wrapper: this.fetchWrapper
            }
        ];
    }

    /** Unique ID of virtual page load periodic checker. */
    private periodicCheckerId?: ReturnType<typeof setInterval>;
    /** Unique ID of virtual page load timeout checker. */
    private timeoutCheckerId?: ReturnType<typeof setTimeout>;
    /** Observer to liten for DOM changes. */
    private domMutationObserver: MutationObserver;
    /** Set to hold outgoing XMLHttpRequests for current virtual page. */
    private ongoingRequests: Set<XMLHttpRequest> = new Set<XMLHttpRequest>();
    /** Buffer to hold outgoing XMLHttpRequests before new page is created. */
    private requestBuffer: Set<XMLHttpRequest> = new Set<XMLHttpRequest>();
    /** Indicate the number of active Fetch requests. */
    private fetchCounter: number = 0;
    /** Indicate the status of the current Page */
    private isPageLoaded: boolean = true;
    /** Indicate the current page's load end time value. */
    private latestEndTime: number = 0;

    constructor(private config: Config) {
        super(VIRTUAL_PAGELOAD_PLUGIN_ID);
    }

    /** Initializes timing related resources for current page. */
    public startTiming() {
        this.latestEndTime = Date.now();
        // Clean up existing timer objects and mutationObserver
        clearInterval(this.periodicCheckerId);
        clearTimeout(this.timeoutCheckerId);
        this.domMutationObserver.disconnect();

        // Initialize timer objects and start observing
        this.periodicCheckerId = setInterval(
            this.checkLoadStatus,
            this.config.routeChangeComplete
        );
        this.timeoutCheckerId = setTimeout(
            this.declareTimeout,
            this.config.routeChangeTimeout
        );
        // observing the add/delete of nodes
        this.domMutationObserver.observe(document, {
            subtree: true,
            childList: true,
            attributes: false,
            characterData: false
        });

        // Indicate page has not loaded, and carry over buffered requests.
        this.isPageLoaded = false;
        this.requestBuffer.forEach(this.moveItemsFromBuffer);
        this.requestBuffer.clear();
    }

    update(): void {
        this.startTiming();
    }

    protected onload(): void {
        this.domMutationObserver = new MutationObserver(this.resetInterval);
        this.enable();
    }

    private sendWrapper = (): ((original: Send) => Send) => {
        const self = this;

        return (original: Send): Send => {
            return function (this: XMLHttpRequest): void {
                self.recordXhr(this);
                this.addEventListener('loadend', self.endTracking);
                return original.apply(this, arguments);
            };
        };
    };

    private recordXhr(item: XMLHttpRequest) {
        const page = this.context?.getPage?.();
        if (page && this.isPageLoaded === false) {
            this.ongoingRequests.add(item);
        } else {
            this.requestBuffer.add(item);
        }
    }

    private removeXhr(item: XMLHttpRequest, currTime: number) {
        const page = this.context?.getPage?.();
        if (page && this.ongoingRequests.has(item)) {
            this.ongoingRequests.delete(item);
            this.latestEndTime = currTime;
        } else if (this.requestBuffer.has(item)) {
            this.requestBuffer.delete(item);
        }
    }

    /**
     * Removes the current event from either requestBuffer or ongoingRequests set.
     * @param event
     */
    private endTracking = (e: Event) => {
        const currTime = Date.now();
        const xhr: XMLHttpRequest = e.target as XMLHttpRequest;
        xhr.removeEventListener('loadend', this.endTracking);
        this.removeXhr(xhr, currTime);
    };

    private fetch = (
        original: Fetch,
        thisArg: Fetch,
        argsArray: IArguments,
        input: RequestInfo,
        init?: RequestInit
    ): Promise<Response> => {
        return original
            .apply(thisArg, argsArray)
            .catch((error) => {
                throw error;
            })
            .finally(this.decrementFetchCounter);
    };

    /**
     * Increment the fetch counter in PageManager when fetch is beginning
     */
    private fetchWrapper = (): ((original: Fetch) => Fetch) => {
        const self = this;
        return (original: Fetch): Fetch => {
            return function (
                this: Fetch,
                input: RequestInfo,
                init?: RequestInit
            ): Promise<Response> {
                self.fetchCounter += 1;
                return self.fetch(original, this, arguments, input, init);
            };
        };
    };

    private decrementFetchCounter = () => {
        if (!this.isPageLoaded) {
            this.latestEndTime = Date.now();
        }
        this.fetchCounter -= 1;
    };

    /**
     * Checks whether the virtual page is still being loaded.
     * If completed:
     * (1) Clear the timers
     * (2) Record data using NavigationEvent
     * (3) Indicate current page has finished loading
     */
    private checkLoadStatus = () => {
        if (this.ongoingRequests.size === 0 && this.fetchCounter === 0) {
            clearInterval(this.periodicCheckerId);
            clearTimeout(this.timeoutCheckerId);
            this.domMutationObserver.disconnect();
            this.recordRouteChangeNavigationEvent(this.context?.getPage?.());
            this.isPageLoaded = true;
        }
    };

    /** Clears timers and disconnects observer to stop page timing. */
    private declareTimeout = () => {
        clearInterval(this.periodicCheckerId);
        this.domMutationObserver.disconnect();
        this.isPageLoaded = true;
    };

    private resetInterval = () => {
        this.latestEndTime = Date.now();
        clearInterval(this.periodicCheckerId);
        this.periodicCheckerId = setInterval(
            this.checkLoadStatus,
            this.config.routeChangeComplete
        );
    };

    private moveItemsFromBuffer = (item: XMLHttpRequest) => {
        this.ongoingRequests.add(item);
    };

    private recordRouteChangeNavigationEvent(page: Page) {
        const virtualPageNavigationEvent: NavigationEvent = {
            version: '1.0.0',
            initiatorType: 'route_change',
            navigationType: 'navigate',
            startTime: page.start,
            duration: this.latestEndTime - page.start
        };
        if (this.context?.record) {
            this.context.record(
                PERFORMANCE_NAVIGATION_EVENT_TYPE,
                virtualPageNavigationEvent
            );
        }
    }
}
