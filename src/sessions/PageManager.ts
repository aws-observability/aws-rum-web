import { Config } from '../orchestration/Orchestration';
import { RecordEvent } from '../plugins/Plugin';
import { PageViewEvent } from '../events/page-view-event';
import { NavigationEvent } from '../events/navigation-event';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../plugins/utils/constant';
import { MonkeyPatch, MonkeyPatched } from '../plugins/MonkeyPatched';

type Fetch = typeof fetch;
type Send = () => void;
export const PAGE_VIEW_TYPE = 'com.amazon.rum.page_view_event';

export type Page = {
    pageId: string;
    interaction: number;
    parentPageId?: string;
    start: number;
    ongoingActivity: Set<XMLHttpRequest>;
    latestEndTime: number;
    isLoaded?: boolean;
};

export type Attributes = {
    title: string;
    pageId: string;
    parentPageId?: string;
    interaction?: number;
};

/**
 * The page manager keeps the state of the current page and interaction level.
 *
 * A page is a unique view (user interface) of the application. For 'multi page' applications (i.e., 'classic' web
 * applications that have multiple html files), the page changes when the user nagivates to a new web page. For
 * 'single page' applications (i.e., 'ajax' web applications that have a single html file), the page changes when (1)
 * the popstate event emitted, or (2) the application indicates a new page has loaded using the RUM agent API.
 *
 * The interaction level is the order of a page in the sequence of pages sorted by the time they were viewed.
 */
export class PageManager extends MonkeyPatched {
    private config: Config;
    private record: RecordEvent;
    private page: Page | undefined;
    private resumed: Page | undefined;
    private attributes: Attributes | undefined;

    /** Unique ID of periodic activity checker for virtual page loads. */
    private periodicCheckerId;
    /** Unique ID of activity timeout Timer object */
    private activityTimeoutCheckerId;
    /** Observer to liten for DOM changes */
    private domMutationObserver: MutationObserver;

    /** Buffer to hold outgoing XMLHttpRequests before new page is created. */
    private requestBuffer: Set<XMLHttpRequest>;
    /** Indicate the number of active Fetch requests. */
    private fetchCounter: number;

    /** Soft timeout for periodic checker to determine virtual page load has completed. */
    private PERIODIC_CHECKER_INTERVAL: number;
    /** Hard timeout for PageManager to stop checking for virtual page load */
    private ACTIVITY_TIMEOUT_LIMIT: number;

    /**
     * A flag which keeps track of whether or not cookies have been enabled.
     *
     * We will only record the interaction (i.e., depth and parent) after
     * cookies have been enabled once.
     */
    private recordInteraction: boolean;

    constructor(config: Config, record: RecordEvent) {
        super();
        this.config = config;
        this.record = record;
        this.page = undefined;
        this.resumed = undefined;
        this.recordInteraction = false;

        this.periodicCheckerId = undefined;
        this.activityTimeoutCheckerId = undefined;
        this.domMutationObserver = new MutationObserver(
            this.domMutationCallback
        );
        this.requestBuffer = new Set();
        this.PERIODIC_CHECKER_INTERVAL = 100;
        this.ACTIVITY_TIMEOUT_LIMIT = this.config.spaActivityTimeoutLimit
            ? this.config.spaActivityTimeoutLimit
            : 1000;
        this.fetchCounter = 0;
    }

    public getPage(): Page | undefined {
        return this.page;
    }

    public getAttributes(): Attributes | undefined {
        return this.attributes;
    }

    public resumeSession(pageId: string, interaction: number) {
        this.recordInteraction = true;
        this.resumed = {
            pageId,
            interaction,
            start: 0,
            ongoingActivity: new Set<XMLHttpRequest>(),
            latestEndTime: 0
        };
    }

    /** Creates a new page object from either an initial load or route change. */
    public recordPageView(pageId: string) {
        if (this.useCookies()) {
            this.recordInteraction = true;
        }

        if (!this.page && this.resumed) {
            this.createResumedPage(pageId);
        } else if (!this.page) {
            this.createLandingPage(pageId);
        } else if (this.page.pageId !== pageId) {
            this.createNextPage(pageId);

            // Clean up existing timer objects and mutationObserver
            if (this.periodicCheckerId) {
                clearInterval(this.periodicCheckerId);
            }
            if (this.activityTimeoutCheckerId) {
                clearTimeout(this.activityTimeoutCheckerId);
            }
            this.domMutationObserver.disconnect();

            // Initialize timer objects and start observing
            this.periodicCheckerId = setInterval(
                this.periodicCheckerCallback,
                this.PERIODIC_CHECKER_INTERVAL
            );
            this.activityTimeoutCheckerId = setTimeout(
                this.activityTimeoutCallback,
                this.ACTIVITY_TIMEOUT_LIMIT
            );
            this.domMutationObserver.observe(document, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true
            });

            // Indicate page has not loaded, and carry over buffered requests.
            this.page.isLoaded = false;
            this.requestBuffer.forEach(this.moveItemsFromBuffer);
            this.requestBuffer.clear();
        } else {
            // The view has not changed.
            return;
        }

        // Attributes will be added to all events as meta data
        this.collectAttributes();

        // The SessionManager will update its cookie with the new page
        this.recordPageViewEvent();
    }

    protected patches(): MonkeyPatch[] {
        return [
            {
                nodule: XMLHttpRequest.prototype,
                name: 'send',
                wrapper: this.sendWrapper
            },
            {
                nodule: window,
                name: 'fetch',
                wrapper: this.fetchWrapper
            }
        ];
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
        const page = this.page;
        if (page && page.isLoaded !== null && page.isLoaded === false) {
            page.ongoingActivity.add(item);
        } else {
            this.requestBuffer.add(item);
        }
    }

    private removeXhr(item: XMLHttpRequest, currTime: number) {
        const page = this.page;
        if (page && page.ongoingActivity.has(item)) {
            page.ongoingActivity.delete(item);
            page.latestEndTime = Math.max(page.latestEndTime, currTime);
        } else if (this.requestBuffer.has(item)) {
            this.requestBuffer.delete(item);
        }
    }

    /**
     * Removes the current event from either requestBuffer or ongoingActivity set.
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
        const self = this;
        return original
            .apply(thisArg, argsArray)
            .then((response: Response) => {
                self.updateFetchCounter();
            })
            .catch((error) => {
                self.updateFetchCounter();
            });
    };

    /**
     * Increment the fetch counter in PageManager when fetch is beginning
     */
    private fetchWrapper = (): ((
        original: (input: RequestInfo, init?: RequestInit) => Promise<Response>
    ) => (input: RequestInfo, init?: RequestInit) => Promise<Response>) => {
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

    private updateFetchCounter() {
        const page = this.page;
        // prevent NPE
        if (page && !page.isLoaded) {
            page.latestEndTime = Math.max(page.latestEndTime, Date.now());
        }
        if (this.fetchCounter > 0) {
            this.fetchCounter -= 1;
        }
    }

    private createResumedPage(pageId: string) {
        this.page = {
            pageId,
            parentPageId: this.resumed.pageId,
            interaction: this.resumed.interaction + 1,
            start: Date.now(),
            ongoingActivity: new Set<XMLHttpRequest>(),
            latestEndTime: Date.now()
        };
        this.page.isLoaded = true;
    }

    private createNextPage(pageId: string) {
        this.page = {
            pageId,
            parentPageId: this.page.pageId,
            interaction: this.page.interaction + 1,
            start: Date.now(),
            ongoingActivity: new Set<XMLHttpRequest>(),
            latestEndTime: Date.now()
        };
    }

    private createLandingPage(pageId: string) {
        this.page = {
            pageId,
            interaction: 0,
            start: Date.now(),
            ongoingActivity: new Set<XMLHttpRequest>(),
            latestEndTime: Date.now()
        };
        this.page.isLoaded = true;
    }

    private collectAttributes() {
        this.attributes = {
            title: document.title,
            pageId: this.page.pageId
        };

        if (this.recordInteraction) {
            this.attributes.interaction = this.page.interaction;
            if (this.page.parentPageId !== undefined) {
                this.attributes.parentPageId = this.page.parentPageId;
            }
        }
    }

    private createPageViewEvent() {
        const pageViewEvent: PageViewEvent = {
            version: '1.0.0',
            pageId: this.page.pageId
        };

        if (this.recordInteraction) {
            pageViewEvent.interaction = this.page.interaction;
            pageViewEvent.pageInteractionId =
                this.page.pageId + '-' + this.page.interaction;

            if (this.page.parentPageId !== undefined) {
                pageViewEvent.parentPageInteractionId =
                    this.page.parentPageId + '-' + (this.page.interaction - 1);
            }
        }

        return pageViewEvent;
    }

    private recordPageViewEvent() {
        this.record(PAGE_VIEW_TYPE, this.createPageViewEvent());
    }

    private moveItemsFromBuffer = (item: any) => {
        this.page.ongoingActivity.add(item);
    };

    /**
     * Returns true when cookies should be used to store user ID and session ID.
     */
    private useCookies() {
        return navigator.cookieEnabled && this.config.allowCookies;
    }

    /**
     * Checks whether the virtual page is still being loaded.
     * If completed:
     * (1) Clear the timers
     * (2) Record data using NavigationEvent
     * (3) Indicate current page has finished loading
     */
    private periodicCheckerCallback = () => {
        if (this.page.ongoingActivity.size === 0 && this.fetchCounter === 0) {
            clearInterval(this.periodicCheckerId);
            clearTimeout(this.activityTimeoutCheckerId);
            this.domMutationObserver.disconnect();
            this.recordVirtualPageNavigationEvent();
            this.periodicCheckerId = undefined;
            this.activityTimeoutCheckerId = undefined;
            this.page.isLoaded = true;
        }
    };

    /** Clears timers and disconnects observer to stop page timing. */
    private activityTimeoutCallback = () => {
        clearInterval(this.periodicCheckerId);
        this.periodicCheckerId = undefined;
        this.activityTimeoutCheckerId = undefined;
        this.domMutationObserver.disconnect();
        this.page.isLoaded = true;
    };

    /** Resets periodic check timer and updates page's latestEndTime. */
    private domMutationCallback = () => {
        this.page.latestEndTime = Math.max(this.page.latestEndTime, Date.now());
        clearInterval(this.periodicCheckerId);
        this.periodicCheckerId = setInterval(
            this.periodicCheckerCallback,
            this.PERIODIC_CHECKER_INTERVAL
        );
    };

    private recordVirtualPageNavigationEvent() {
        const virtualPageNavigationEvent: NavigationEvent = {
            version: '1.0.0',
            initiatorType: 'route_change',
            navigationType: 'navigate',
            startTime: this.page.start,
            duration: this.page.latestEndTime - this.page.start
        };
        if (this.record) {
            this.record(
                PERFORMANCE_NAVIGATION_EVENT_TYPE,
                virtualPageNavigationEvent
            );
        }
    }
}
