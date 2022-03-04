import {
    Config,
    PAGE_INVOKE_TYPE,
    PAGE_TYPE
} from '../orchestration/Orchestration';
import { RecordEvent } from '../plugins/Plugin';
import { PageViewEvent } from '../events/page-view-event';
import { NavigationEvent } from '../events/navigation-event';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../plugins/utils/constant';

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
export class PageManager {
    private config: Config;
    private record: RecordEvent;
    private page: Page | undefined;
    private resumed: Page | undefined;
    private attributes: Attributes | undefined;
    private periodicCheckId;
    private timeoutCheckId;
    private domMutationObserver: MutationObserver;
    private requestCache: Set<XMLHttpRequest>;
    private fetchCounter: number;

    private PERIODIC_TIME: number;
    private TIMEOUT_TIME: number;

    /**
     * A flag which keeps track of whether or not cookies have been enabled.
     *
     * We will only record the interaction (i.e., depth and parent) after
     * cookies have been enabled once.
     */
    private recordInteraction: boolean;

    constructor(config: Config, record: RecordEvent) {
        this.config = config;
        this.record = record;
        this.page = undefined;
        this.resumed = undefined;
        this.recordInteraction = false;
        this.periodicCheckId = undefined;
        this.timeoutCheckId = undefined;
        this.domMutationObserver = new MutationObserver(this.mutationCallback);
        this.requestCache = new Set();
        this.PERIODIC_TIME = 100;
        this.TIMEOUT_TIME = this.config.spaTimeoutLimit
            ? this.config.spaTimeoutLimit
            : 1000;
        this.fetchCounter = 0;
    }

    public getPage(): Page | undefined {
        return this.page;
    }

    public getCurrentUrl(): string {
        return this.page.pageId;
    }

    public getTimeoutValue(): number {
        return this.TIMEOUT_TIME;
    }

    public getFetchCounter(): number {
        return this.fetchCounter;
    }

    public getAttributes(): Attributes | undefined {
        return this.attributes;
    }

    public getIntervalId() {
        return this.periodicCheckId;
    }

    public getTimeoutId() {
        return this.timeoutCheckId;
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

    public getRequestCache(): Set<XMLHttpRequest> {
        return this.requestCache;
    }

    public incrementFetchCounter() {
        this.fetchCounter += 1;
    }

    public decrementFetchCounter = () => {
        if (this.getFetchCounter() > 0) {
            this.fetchCounter -= 1;
        }
    };

    public recordPageView(
        pageId: string,
        invokeType = PAGE_INVOKE_TYPE.INITIAL_LOAD
    ) {
        if (this.useCookies()) {
            this.recordInteraction = true;
        }

        if (!this.page && this.resumed) {
            this.createPage(pageId, invokeType, PAGE_TYPE.RESUME);
        } else if (!this.page) {
            this.createPage(pageId, invokeType, PAGE_TYPE.LANDING);
        } else if (this.page.pageId !== pageId) {
            this.createPage(pageId, invokeType, PAGE_TYPE.NEXT);
        } else {
            // The view has not changed.
            return;
        }

        // Attributes will be added to all events as meta data
        this.collectAttributes();

        // The SessionManager will update its cookie with the new page
        this.recordPageViewEvent();
    }

    /**
     * Create a Page Object based on the given invokeType and pageType parameter.
     * Possible outcomes involve:
     *  (1) resumed page
     *  (2) landing page
     *  (3) next page
     * When the page is created via route change, we create all the resources required
     * to capture the virtual page load timing.
     * @param pageId
     * @param invokeType
     * @param pageType
     */
    private createPage(
        pageId: string,
        invokeType: PAGE_INVOKE_TYPE,
        pageType: PAGE_TYPE
    ) {
        if (pageType === PAGE_TYPE.RESUME) {
            this.page = {
                pageId,
                parentPageId: this.resumed.pageId,
                interaction: this.resumed.interaction + 1,
                start: Date.now(),
                ongoingActivity: new Set<XMLHttpRequest>(),
                latestEndTime: Date.now()
            };
            this.resumed = undefined;
        } else if (pageType === PAGE_TYPE.LANDING) {
            this.page = {
                pageId,
                interaction: 0,
                start: Date.now(),
                ongoingActivity: new Set<XMLHttpRequest>(),
                latestEndTime: Date.now()
            };
        } else {
            this.page = {
                pageId,
                parentPageId: this.page.pageId,
                interaction: this.page.interaction + 1,
                start: Date.now(),
                ongoingActivity: new Set<XMLHttpRequest>(),
                latestEndTime: Date.now()
            };
        }
        if (invokeType === PAGE_INVOKE_TYPE.ROUTE_CHANGE) {
            // First clear the timers and observer to prevent erroneous data capture.
            // Then instantiate the timers and observer for current page.
            if (this.periodicCheckId !== undefined) {
                clearInterval(this.periodicCheckId);
            }
            if (this.timeoutCheckId !== undefined) {
                clearTimeout(this.timeoutCheckId);
            }
            this.periodicCheckId = setInterval(
                this.checkActivities,
                this.PERIODIC_TIME
            );
            this.timeoutCheckId = setTimeout(this.timedOut, this.TIMEOUT_TIME);

            this.domMutationObserver.disconnect();
            this.domMutationObserver.observe(document, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true
            });
            // Indicate page has not loaded, and carry over cached requests.
            // Carry over requests that are not completed in the current point in time.
            this.page.isLoaded = false;
            this.requestCache.forEach(this.moveItemsFromCache);
            this.requestCache.clear();
        } else {
            this.page.isLoaded = true;
        }
    }

    /**
     * Carry over XMLHttpRequests that are not done in the cache into ongoingActivity set.
     * @param item : XMLHttpRequests or string (url+init) in the TrackerPlugin's cache.
     */
    private moveItemsFromCache = (item: any) => {
        this.page.ongoingActivity.add(item);
    };

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
    private checkActivities = () => {
        if (this.page.ongoingActivity.size === 0 && this.fetchCounter === 0) {
            clearInterval(this.periodicCheckId);
            clearTimeout(this.timeoutCheckId);
            this.domMutationObserver.disconnect();
            this.createNagivationEventWithSPATiming();
            this.periodicCheckId = undefined;
            this.timeoutCheckId = undefined;
            this.page.isLoaded = true;
        }
    };

    /**
     * Invoked when the page load has timed out.
     * No data will be recorded, and the current page is marked as loaded.
     */
    private timedOut = () => {
        clearInterval(this.periodicCheckId);
        this.periodicCheckId = undefined;
        this.timeoutCheckId = undefined;
        this.page.isLoaded = true;
    };

    private createNagivationEventWithSPATiming() {
        const routeChangeNavigationEvent: NavigationEvent = {
            version: '1.0.0',
            initiatorType: 'route_change',
            navigationType: 'navigate',
            startTime: this.page.start,
            duration: this.page.latestEndTime - this.page.start
        };

        if (this.record) {
            this.record(
                PERFORMANCE_NAVIGATION_EVENT_TYPE,
                routeChangeNavigationEvent
            );
        }
    }

    /**
     * Invoked whenever mutationObserver identifies a change in DOM on a document level.
     * (1) Updates current page's latestEndTime
     * (2) Resets the periodicChecker interval
     */
    private mutationCallback = () => {
        this.page.latestEndTime = Math.max(this.page.latestEndTime, Date.now());
        clearInterval(this.periodicCheckId);
        this.periodicCheckId = setInterval(
            this.checkActivities,
            this.PERIODIC_TIME
        );
    };
}
