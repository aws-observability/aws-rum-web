import { PageIdFormatEnum } from '../../orchestration/Orchestration';
import { MonkeyPatched } from '../MonkeyPatched';

export const PAGE_EVENT_PLUGIN_ID = 'page-view';

export type ChangeHistory = History['replaceState'] | History['pushState'];

/**
 * A plugin which records page view transitions.
 *
 * When a session is initialized, the PageManager records the landing page. When
 * subsequent pages are viewed, this plugin updates the page.
 */
export class PageViewPlugin extends MonkeyPatched<
    History,
    'replaceState' | 'pushState'
> {
    constructor() {
        super(PAGE_EVENT_PLUGIN_ID);
        this.enable();
    }

    protected onload(): void {
        this.addHistoryListener();
        this.recordPageView();
    }

    protected get patches() {
        return [
            {
                nodule: History.prototype,
                name: 'replaceState' as const,
                wrapper: this.historyState
            },
            {
                nodule: History.prototype,
                name: 'pushState' as const,
                wrapper: this.historyState
            }
        ];
    }

    private historyState = () => {
        const self = this;
        return (original: ChangeHistory): ChangeHistory => {
            return function (
                this: ChangeHistory,
                data: string,
                title: string,
                url?: string | null
            ): void {
                const retVal = original.apply(this, arguments);
                self.recordPageView();
                return retVal;
            };
        };
    };

    /**
     * See note here in MDN docs as to why it needs to be wrapped in a setTimeout
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event#sect1
     * (basically to wait for the end of the page load event loop)
     */
    private addHistoryListener() {
        window.addEventListener('popstate', () => {
            // this will save the current time before waiting for the load stack to finish
            const interactionStart = Date.now();
            setTimeout(() => this.recordPageView(interactionStart), 0);
        });
    }

    private recordPageView = (interactionStart?: number) => {
        this.context.recordPageView(
            this.createIdForCurrentPage(),
            interactionStart
        );
    };

    private createIdForCurrentPage(): string {
        const path = window.location.pathname;
        const hash = window.location.hash;
        switch (this.context.config.pageIdFormat) {
            case PageIdFormatEnum.PathAndHash:
                if (path && hash) {
                    return path + hash;
                } else if (path) {
                    return path;
                } else if (hash) {
                    return hash;
                }
                return '';
            case PageIdFormatEnum.Hash:
                return hash ? hash : '';
            case PageIdFormatEnum.Path:
            default:
                return path ? path : '';
        }
    }
}
