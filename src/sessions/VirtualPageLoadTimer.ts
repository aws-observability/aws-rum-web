import { NavigationEvent } from '../events/navigation-event';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../plugins/utils/constant';
import { MonkeyPatched } from '../plugins/MonkeyPatched';
import { Config } from '../orchestration/Orchestration';
import { RecordEvent } from '../plugins/types';
import { PageManager, Page } from './PageManager';

type Fetch = typeof fetch;
type Send = () => void;
type Patching = Pick<XMLHttpRequest & Window, 'fetch' | 'send'>;
/**
 * Maintains the core logic for virtual page load timing functionality.
 * (1) Holds all virtual page load timing related resources
 * (2) Intercepts outgoing XMLHttpRequests and Fetch requests and listens for DOM changes
 * (3) Records virtual page load
 */
export class VirtualPageLoadTimer extends MonkeyPatched<
    Patching,
    'fetch' | 'send'
> {
    protected get patches() {
        return [
            {
                nodule: (XMLHttpRequest.prototype as unknown) as Patching,
                name: 'send' as const,
                wrapper: this.sendWrapper as any
            },
            {
                nodule: (window as unknown) as Patching,
                name: 'fetch' as const,
                wrapper: this.fetchWrapper as any
            }
        ];
    }
    /** Latest interaction time by user on the document */
    public latestInteractionTime: number;
    /** Unique ID of virtual page load periodic checker. */
    private periodicCheckerId: number | undefined;
    /** Unique ID of virtual page load timeout checker. */
    private timeoutCheckerId: number | undefined;
    /** Observer to liten for DOM changes. */
    private domMutationObserver: MutationObserver;
    /** Set to hold outgoing XMLHttpRequests for current virtual page. */
    private ongoingRequests: Set<XMLHttpRequest>;
    /** Buffer to hold outgoing XMLHttpRequests before new page is created. */
    private requestBuffer: Set<XMLHttpRequest>;
    /** Indicate the number of active Fetch requests. */
    private fetchCounter: number;
    /** Indicate the status of the current Page */
    private isPageLoaded: boolean;
    /** Indicate the current page's load end time value. */
    private latestEndTime: number;

    private config: Config;
    private pageManager: PageManager;
    // @ts-ignore
    private readonly record: RecordEvent;

    constructor(pageManager: PageManager, config: Config, record: RecordEvent) {
        super('virtual-page-load-timer');
        this.periodicCheckerId = undefined;
        this.timeoutCheckerId = undefined;
        this.domMutationObserver = new MutationObserver(this.resetInterval);
        this.ongoingRequests = new Set<XMLHttpRequest>();
        this.requestBuffer = new Set();
        this.fetchCounter = 0;
        this.isPageLoaded = true;
        this.latestEndTime = 0;
        this.latestInteractionTime = 0;

        this.config = config;
        this.pageManager = pageManager;
        this.record = record;
        this.enable();

        // Start tracking the timestamps
        document.addEventListener(
            'mousedown',
            this.updateLatestInteractionTime
        );
        document.addEventListener('keydown', this.updateLatestInteractionTime);
    }

    /** Initializes timing related resources for current page. */
    public startTiming() {
        this.latestEndTime = Date.now();
        // Clean up existing timer objects and mutationObserver
        if (this.periodicCheckerId) {
            clearInterval(this.periodicCheckerId);
        }
        if (this.timeoutCheckerId) {
            clearTimeout(this.timeoutCheckerId);
        }
        this.domMutationObserver.disconnect();

        // Initialize timer objects and start observing
        this.periodicCheckerId = (setInterval(
            this.checkLoadStatus,
            this.config.routeChangeComplete
        ) as unknown) as number;
        this.timeoutCheckerId = (setTimeout(
            this.declareTimeout,
            this.config.routeChangeTimeout
        ) as unknown) as number;
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

    private sendWrapper = (): ((original: Send) => Send) => {
        const self = this;

        return (original: Send): Send => {
            return function (this: XMLHttpRequest): void {
                self.recordXhr(this);
                this.addEventListener('loadend', self.endTracking);
                return original.apply(this, arguments as any);
            };
        };
    };

    private recordXhr(item: XMLHttpRequest) {
        const page = this.pageManager.getPage();
        if (page && this.isPageLoaded === false) {
            this.ongoingRequests.add(item);
        } else {
            this.requestBuffer.add(item);
        }
    }

    private removeXhr(item: XMLHttpRequest, currTime: number) {
        const page = this.pageManager.getPage();
        if (page && this.ongoingRequests.has(item)) {
            this.ongoingRequests.delete(item);
            this.latestEndTime = currTime;
        } else if (this.requestBuffer.has(item)) {
            this.requestBuffer.delete(item);
        }
    }

    /**
     * Removes the current event from either requestBuffer or ongoingRequests set.
     *
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
        argsArray: IArguments
    ): Promise<Response> => {
        return original
            .apply(thisArg, argsArray as any)
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
                input: RequestInfo | URL,
                init?: RequestInit
            ): Promise<Response> {
                self.fetchCounter += 1;
                return self.fetch(original, this, arguments);
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
            this.recordRouteChangeNavigationEvent(
                this.pageManager.getPage() as Page
            );
            this.periodicCheckerId = undefined;
            this.timeoutCheckerId = undefined;
            this.isPageLoaded = true;
        }
    };

    /** Clears timers and disconnects observer to stop page timing. */
    private declareTimeout = () => {
        clearInterval(this.periodicCheckerId);
        this.periodicCheckerId = undefined;
        this.timeoutCheckerId = undefined;
        this.domMutationObserver.disconnect();
        this.isPageLoaded = true;
    };

    private resetInterval = () => {
        this.latestEndTime = Date.now();
        clearInterval(this.periodicCheckerId);
        this.periodicCheckerId = (setInterval(
            this.checkLoadStatus,
            this.config.routeChangeComplete
        ) as unknown) as number;
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
        if (this.record) {
            this.record(
                PERFORMANCE_NAVIGATION_EVENT_TYPE,
                virtualPageNavigationEvent
            );
        }
    }

    private updateLatestInteractionTime = (e: Event) => {
        this.latestInteractionTime = Date.now();
    };
}
