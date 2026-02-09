import { PageIdFormatEnum } from '../../orchestration/Orchestration';
import { MonkeyPatched } from '../MonkeyPatched';

export const PAGE_EVENT_PLUGIN_ID = 'page-view';

export type Push = (data: any, title: string, url?: string | null) => void;
export type Replace = (data: any, title: string, url?: string | null) => void;

/**
 * A plugin which records page view transitions.
 *
 * When a session is initialized, the PageManager records the landing page. When
 * subsequent pages are viewed, this plugin updates the page.
 */
export class PageViewPlugin extends MonkeyPatched<
    History,
    'pushState' | 'replaceState'
> {
    constructor() {
        super(PAGE_EVENT_PLUGIN_ID);
        this.enable();
    }

    protected onload(): void {
        this.addListener();
        this.recordPageView();
    }

    protected get patches() {
        return [
            {
                nodule: History.prototype,
                name: 'pushState' as const,
                wrapper: this.pushState
            },
            {
                nodule: History.prototype,
                name: 'replaceState' as const,
                wrapper: this.replaceState
            }
        ];
    }

    private pushState = (): ((original: Push) => Push) => {
        const self = this;
        return (original: Push): Push => {
            return function (
                this: Push,
                data: string,
                title: string,
                url?: string | null
            ): void {
                const retVal = original.apply(this, arguments as any);
                self.recordPageView();
                return retVal;
            };
        };
    };

    private replaceState = () => {
        const self = this;
        return (original: Replace): Replace => {
            return function (
                this: Replace,
                data: string,
                title: string,
                url?: string | null
            ): void {
                const retVal = original.apply(this, arguments as any);
                self.recordPageView();
                return retVal;
            };
        };
    };

    private addListener() {
        // popstate will fire under the following conditions:
        // (1) The history back, forward or go APIs are used
        // (2) The URI's fragment (hash) changes
        window.addEventListener('popstate', this.popstateListener);
    }

    private popstateListener: EventListener = (event: Event) => {
        this.recordPageView();
    };

    private recordPageView = () => {
        this.context.recordPageView(this.createIdForCurrentPage());
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
