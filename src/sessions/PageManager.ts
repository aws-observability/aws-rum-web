import { Config, PAGE_ID_FORMAT } from '../orchestration/Orchestration';
import { RecordEvent } from '../plugins/Plugin';
import { PageViewEvent } from '../events/page-view-event';

export const PAGE_VIEW_TYPE = 'com.amazon.rum.page_view_event';
export const PAGE_COOKIE_NAME = 'rum_page_id';

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
    private attributes: Attributes;

    constructor(config: Config, record: RecordEvent) {
        this.config = config;
        this.record = record;
        this.page = undefined;
    }

    public getPage(): Page {
        return this.page;
    }

    public getAttributes(): object {
        return this.attributes;
    }

    public startSession(): PageViewEvent {
        if (!this.page) {
            this.page = {
                pageId: this.createIdForCurrentPage(),
                interaction: 0,
                start: Date.now()
            };
        }
        this.collectAttributes();
        return this.createPageViewEvent();
    }

    public resumeSession(pageId: string, interaction: number) {
        this.page = {
            pageId: this.createIdForCurrentPage(),
            interaction: interaction + 1,
            parentPageId: pageId,
            start: Date.now()
        };
        this.collectAttributes();
        this.recordPageViewEvent();
    }

    public recordPageView(pageId: string) {
        if (this.page.pageId === pageId) {
            // The view has not changed.
            return;
        }
        this.page = {
            pageId,
            parentPageId: this.page.pageId,
            interaction: this.page.interaction + 1,
            start: Date.now()
        };
        this.collectAttributes();
        this.recordPageViewEvent();
    }

    private collectAttributes() {
        this.attributes = {
            title: document.title,
            url: document.location.toString(),
            pageUrl: document.location.toString(),
            pageId: this.page.pageId
        };

        if (this.page.interaction !== undefined) {
            this.attributes.interaction = this.page.interaction;
        }

        if (this.page.parentPageId !== undefined) {
            this.attributes.parentPageId = this.page.parentPageId;
        }
    }

    private createPageViewEvent() {
        const pageViewEvent: PageViewEvent = {
            version: '1.0.0',
            pageId: this.page.pageId
        };

        if (this.page.interaction !== undefined) {
            pageViewEvent.interaction = this.page.interaction;
            pageViewEvent.pageInteractionId =
                this.page.pageId + '-' + this.page.interaction;
        }

        if (
            this.page.parentPageId !== undefined &&
            this.page.interaction !== undefined
        ) {
            pageViewEvent.parentPageInteractionId =
                this.page.parentPageId + '-' + (this.page.interaction - 1);
        }

        return pageViewEvent;
    }

    private recordPageViewEvent() {
        this.record(PAGE_VIEW_TYPE, this.createPageViewEvent());
    }

    private createIdForCurrentPage(): string {
        const path = document.location.pathname;
        const hash = document.location.hash;
        switch (this.config.pageIdFormat) {
            case PAGE_ID_FORMAT.PATH_AND_HASH:
                if (path && hash) {
                    return path + hash;
                } else if (path) {
                    return path;
                } else if (hash) {
                    return hash;
                }
                return '';
            case PAGE_ID_FORMAT.HASH:
                return hash ? hash : '';
            case PAGE_ID_FORMAT.PATH:
            default:
                return path ? path : '';
        }
    }
}
