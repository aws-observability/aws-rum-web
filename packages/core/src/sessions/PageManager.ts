import { Config } from '../orchestration/config';
import { RecordEvent } from '../plugins/types';
import { PageViewEvent } from '../events/page-view-event';
import { PAGE_VIEW_EVENT_TYPE } from '../plugins/utils/constant';
import { InternalLogger } from '../utils/InternalLogger';

export type Page = {
    pageId: string;
    interaction: number;
    parentPageId?: string;
    referrer?: string | null;
    referrerDomain?: string | null;
    start: number;
};

export type Attributes = {
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
 * applications that have multiple html files), the page changes when the user navigates to a new web page. For
 * 'single page' applications (i.e., 'ajax' web applications that have a single html file), the page changes when (1)
 * the popstate event emitted, or (2) the application indicates a new page has loaded using the RUM agent API.
 *
 * The interaction level is the order of a page in the sequence of pages sorted by the time they were viewed.
 */
export class PageManager {
    private config: Config;
    private record: RecordEvent;
    private page: Page | undefined;
    private resumed: boolean;
    private attributes: Attributes | undefined;
    private timeOnParentPage: number | undefined;

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
        this.resumed = false;
        this.recordInteraction = false;
    }

    public getPage(): Page | undefined {
        return this.page;
    }

    public getAttributes(): Attributes | undefined {
        return this.attributes;
    }

    public resumeSession(page: Page | undefined) {
        this.recordInteraction = true;
        if (page) {
            this.page = page;
            this.resumed = true;
        }
    }

    public recordPageView(payload: string | PageAttributes) {
        let pageId;
        if (typeof payload === 'string') {
            pageId = payload;
        } else {
            pageId = payload.pageId;
        }

        InternalLogger.debug(`recordPageView called with pageId: ${pageId}`);

        if (this.useCookies()) {
            this.recordInteraction = true;
        }

        if (!this.page) {
            this.createLandingPage(pageId);
            InternalLogger.info(`Landing page created: ${pageId}`);
        } else if (this.page.pageId !== pageId) {
            this.createNextPage(this.page, pageId);
            InternalLogger.debug(`Navigation to new page: ${pageId}`);
        } else if (this.resumed) {
            InternalLogger.info(`Resumed session for page: ${pageId}`);
            // Update attributes state in PageManager for event metadata
            this.collectAttributes(
                this.page as Page,
                typeof payload === 'object' ? payload : undefined
            );
            return;
        } else {
            InternalLogger.debug(`No page change detected for: ${pageId}`);
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

    private createNextPage(currentPage: Page, pageId: string) {
        const startTime = Date.now();

        InternalLogger.debug(
            `Creating next page ${pageId}, interaction: ${
                currentPage.interaction + 1
            }`
        );

        this.timeOnParentPage = startTime - currentPage.start;
        this.resumed = false;

        this.page = {
            pageId,
            parentPageId: currentPage.pageId,
            interaction: currentPage.interaction + 1,
            referrer: document.referrer,
            referrerDomain: this.getDomainFromReferrer(),
            start: startTime
        };
    }

    private createLandingPage(pageId: string) {
        this.page = {
            pageId,
            interaction: 0,
            referrer: document.referrer,
            referrerDomain: this.getDomainFromReferrer(),
            start: Date.now()
        };
    }

    private collectAttributes(
        page: Page,
        customPageAttributes?: PageAttributes
    ) {
        this.attributes = {
            title: customPageAttributes?.pageAttributes?.title
                ? customPageAttributes.pageAttributes.title
                : document.title,
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
                pageViewEvent.timeOnParentPage = this.timeOnParentPage;
            }

            pageViewEvent.referrer = document.referrer;
            pageViewEvent.referrerDomain = this.getDomainFromReferrer();
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

    /*
    Parses the domain from the referrer, if it is available
    */
    private getDomainFromReferrer() {
        try {
            return new URL(document.referrer).hostname;
        } catch (e) {
            return document.referrer === 'localhost' ? document.referrer : '';
        }
    }
}
