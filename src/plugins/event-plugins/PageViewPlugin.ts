import { PAGE_ID_FORMAT } from '../../orchestration/Orchestration';
import { MonkeyPatch, MonkeyPatched } from '../MonkeyPatched';
import { Plugin, PluginContext } from '../Plugin';

export const PAGE_EVENT_PLUGIN_ID = 'com.amazonaws.rum.page-view';

export type Push = (data: any, title: string, url?: string | null) => void;
export type Replace = (data: any, title: string, url?: string | null) => void;

/**
 * A plugin which records page view transitions.
 *
 * When a session is initialized, the PageManager records the landing page. When
 * subsequent pages are viewed, this plugin updates the page.
 */
export class PageViewPlugin extends MonkeyPatched implements Plugin {
    private pluginId: string;
    private context: PluginContext;

    constructor() {
        super();
        this.pluginId = PAGE_EVENT_PLUGIN_ID;
        this.enable();
    }

    public load(context: PluginContext): void {
        this.context = context;
        this.addListener();
    }

    public getPluginId(): string {
        return this.pluginId;
    }

    protected patches(): MonkeyPatch[] {
        return [
            {
                nodule: History.prototype,
                name: 'pushState',
                wrapper: this.pushState
            },
            {
                nodule: History.prototype,
                name: 'replaceState',
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
                const retVal = original.apply(this, arguments);
                self.recordPageView();
                return retVal;
            };
        };
    };

    private replaceState = (): ((original: Replace) => Replace) => {
        const self = this;
        return (original: Replace): Replace => {
            return function (
                this: Replace,
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
