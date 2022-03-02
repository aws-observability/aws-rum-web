import {
    PAGE_ID_FORMAT,
    PAGE_INVOKE_TYPE
} from '../../orchestration/Orchestration';
import { MonkeyPatch, MonkeyPatched } from '../MonkeyPatched';
import { Plugin, PluginContext } from '../Plugin';

export const PAGE_EVENT_PLUGIN_ID = 'com.amazonaws.rum.page-view';

export type Push = (data: any, title: string, url?: string | null) => void;
export type Replace = (data: any, title: string, url?: string | null) => void;
export type ClickInfo = {
    timestamp: number;
};

/**
 * A plugin which records page view transitions.
 *
 * When a session is initialized, the PageManager records the landing page. When
 * subsequent pages are viewed, this plugin updates the page.
 *
 * When AutoPageView is enabled, this plugin does the following:
 * (1) Records initial page as INITIAL_LOAD during load()
 * (2) Any subsequent route changes via Browser History API is intercepted to:
 *      - Create a new Page object with pageInvokeType as ROUTE_CHANGE
 *
 * In order for accurate tracking in SPA, recommend using PATH_AND_HASH for pageId.
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
        this.recordPageView(PAGE_INVOKE_TYPE.INITIAL_LOAD);
    }

    public getPluginId(): string {
        return this.pluginId;
    }

    /**
     * Monkey patches pushState and replaceState APIs to check whether
     * route change has occurred.
     */
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
                self.recordRouteChange();
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
                self.recordRouteChange();
                return retVal;
            };
        };
    };

    /**
     * Checks the current browser's URL against the current Page object's id.
     * If they are different, indicate route change has occurred, start Page creation.
     */
    private recordRouteChange = () => {
        const newUrl = location.pathname + location.hash;
        if (this.context.getCurrentUrl() !== newUrl) {
            this.recordPageView(PAGE_INVOKE_TYPE.ROUTE_CHANGE);
        }
    };

    private addListener() {
        // popstate will fire under the following conditions:
        // (1) The history back, forward or go APIs are used
        // (2) The URI's fragment (hash) changes
        window.addEventListener('popstate', this.recordRouteChange);
        window.addEventListener('hashchange', this.recordRouteChange);
    }

    private recordPageView = (invokeType: string) => {
        this.context.recordPageView(this.createIdForCurrentPage(), invokeType);
    };

    /**
     * Creates the pageId for the current page.
     * Output depends on the Partial Configuration.
     * PATH_AND_HASH recommended for SPA.
     * @returns pageId
     */
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
