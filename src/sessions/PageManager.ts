import { Config } from '../orchestration/Orchestration';
import { RecordEvent } from '../plugins/Plugin';
import { PageViewEvent } from '../events/page-view-event';

export const PAGE_VIEW_TYPE = 'com.amazon.rum.page_view_event';

export type Page = {
    pageId: string;
    interaction: number;
    parentPageId?: string;
    start: number;
};

export type Attributes = {
    title: string;
    url: string;
    pageUrl: string;
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
        } else {
            // The view has not changed.
            return;
        }

        // Attributes will be added to all events as meta data
        this.collectAttributes();

        // The SessionManager will update its cookie with the new page
        this.recordPageViewEvent();
    }

    private createResumedPage(pageId: string) {
        this.page = {
            pageId,
            parentPageId: this.resumed.pageId,
            interaction: this.resumed.interaction + 1,
            start: Date.now()
        };
        this.resumed = undefined;
    }

    private createNextPage(pageId: string) {
        this.page = {
            pageId,
            parentPageId: this.page.pageId,
            interaction: this.page.interaction + 1,
            start: Date.now()
        };
    }

    private createLandingPage(pageId: string) {
        this.page = {
            pageId,
            interaction: 0,
            start: Date.now()
        };
    }

    private collectAttributes() {
        this.attributes = {
            title: document.title,
            url: document.location.toString(),
            pageUrl: document.location.toString(),
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
}
