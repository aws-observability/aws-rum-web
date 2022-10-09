import { Config } from '../orchestration/Orchestration';
import { RecordEvent } from '../plugins/types';
import { PageViewEvent } from '../events/page-view-event';
import { VirtualPageLoadTimer } from '../sessions/VirtualPageLoadTimer';
import { PAGE_VIEW_EVENT_TYPE } from '../plugins/utils/constant';

export type Page = {
    pageId: string;
    interaction: number;
    parentPageId?: string;
    start: number;
};

export type Attributes = {
    title: string;
    pageId: string;
    parentPageId?: string;
    interaction?: number;
    pageTags?: string[];
    // The value types of custom attributes are restricted to the types: string | number | boolean
    // However, given that pageTags is a string array, we need to include it as a valid type
    // Events will be verified by our service to validate attribute value types where
    //  1) pageTags attribute value must be of type string[]
    //  2) any other attribute value must be of the following types:
    //      string | number | boolean
    [key: string]: string | number | boolean | string[] | undefined;
};

export type PageAttributes = {
    pageId: string;
    pageTags?: string[];
    pageAttributes?: { [key: string]: string | number | boolean | undefined };
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
    private virtualPageLoadTimer: VirtualPageLoadTimer;
    private TIMEOUT = 1000;

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
        this.virtualPageLoadTimer = new VirtualPageLoadTimer(
            this,
            config,
            record
        );
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
            start: 0
        };
    }

    public recordPageView(payload: string | PageAttributes) {
        let pageId;
        if (typeof payload === 'string') {
            pageId = payload;
        } else {
            pageId = payload.pageId;
        }

        if (this.useCookies()) {
            this.recordInteraction = true;
        }

        if (!this.page && this.resumed) {
            this.createResumedPage(pageId, this.resumed);
        } else if (!this.page) {
            this.createLandingPage(pageId);
        } else if (this.page.pageId !== pageId) {
            this.createNextPage(this.page, pageId);
        } else {
            // The view has not changed.
            return;
        }

        // this.page is guaranteed to have been initialized

        // Attributes will be added to all events as meta data
        this.collectAttributes(
            this.page as Page,
            typeof payload === 'object' ? payload : undefined
        );

        // The SessionManager will update its cookie with the new page
        this.recordPageViewEvent(this.page as Page);
    }

    private createResumedPage(pageId: string, resumed: Page) {
        this.page = {
            pageId,
            parentPageId: resumed.pageId,
            interaction: resumed.interaction + 1,
            start: Date.now()
        };
        this.resumed = undefined;
    }

    private createNextPage(currentPage: Page, pageId: string) {
        let startTime = Date.now();
        const interactionTime = this.virtualPageLoadTimer.latestInteractionTime;

        // The latest interaction time (latest) is not guaranteed to be the
        // interaction that triggered the route change (actual). There are two
        // cases to consider:
        //
        // 1. Latest is older than actual. This can happen if the user navigates
        // with the browser back/forward button, or if the interaction is not a
        // click/keyup event.
        //
        // 2. Latest is newer than actual. This can happen if the user clicks or
        // types in the time between actual and when recordPageView is called.
        //
        // We believe that case (1) has a high risk of skewing route change
        // timing metrics because (a) browser navigation is common and (b) there
        // is no limit on when the lastest interaction may have occurred. To
        // help mitigate this, if the route change is already longer than 1000ms,
        // then we do not bother timing the route change.
        //
        // We do not believe that case (2) has a high risk of skewing route
        // change timing, and therefore ignore case (2).
        if (startTime - interactionTime <= this.TIMEOUT) {
            startTime = interactionTime;
            this.virtualPageLoadTimer.startTiming();
        }
        this.page = {
            pageId,
            parentPageId: currentPage.pageId,
            interaction: currentPage.interaction + 1,
            start: startTime
        };
    }

    private createLandingPage(pageId: string) {
        this.page = {
            pageId,
            interaction: 0,
            start: Date.now()
        };
    }

    private collectAttributes(
        page: Page,
        customPageAttributes?: PageAttributes
    ) {
        this.attributes = {
            title: document.title,
            pageId: page.pageId
        };

        if (this.recordInteraction) {
            this.attributes.interaction = page.interaction;
            if (page.parentPageId !== undefined) {
                this.attributes.parentPageId = page.parentPageId;
            }
        }

        if (customPageAttributes?.pageTags) {
            (this.attributes as Attributes)['pageTags'] =
                customPageAttributes['pageTags'];
        }
        if (customPageAttributes?.pageAttributes) {
            this.attributes = {
                ...customPageAttributes.pageAttributes,
                ...this.attributes
            };
        }
    }

    private createPageViewEvent(page: Page) {
        const pageViewEvent: PageViewEvent = {
            version: '1.0.0',
            pageId: page.pageId
        };

        if (this.recordInteraction) {
            pageViewEvent.interaction = page.interaction;
            pageViewEvent.pageInteractionId =
                page.pageId + '-' + page.interaction;

            if (page.parentPageId !== undefined) {
                pageViewEvent.parentPageInteractionId =
                    page.parentPageId + '-' + (page.interaction - 1);
            }
        }

        return pageViewEvent;
    }

    private recordPageViewEvent(page: Page) {
        this.record(PAGE_VIEW_EVENT_TYPE, this.createPageViewEvent(page));
    }

    /**
     * Returns true when cookies should be used to store user ID and session ID.
     */
    private useCookies() {
        return navigator.cookieEnabled && this.config.allowCookies;
    }
}
