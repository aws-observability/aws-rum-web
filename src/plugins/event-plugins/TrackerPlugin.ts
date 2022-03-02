import { Plugin, PluginContext } from '../Plugin';
import { MonkeyPatch, MonkeyPatched } from '../MonkeyPatched';

type Send = () => void;
type Open = (method: string, url: string, async: boolean) => void;
type XhrDetails = {
    method: string;
    url: string;
    async: boolean;
};
type Fetch = typeof fetch;

export const TRACKER_PLUGIN_ID = 'com.amazonaws.rum.tracker';

/**
 * TrackerPlugin is responsible for intercepting outgoing XMLHttpRequests and Fetch requests
 * that are required to calculate the page load timing for single page applications (SPA).
 * The plugin adds an eventListener to individual requests listening for "loadend",
 * which is an indication of the request completing, regardless of success or failure.
 *
 * XMLHttpRequests have two phases
 * (1) Open: this is where the configurations for the request is defined.
 * (2) Send: this is when the actual network activity happens.
 *
 * During the send, the plugin will save the request into one of two locations:
 * (1) If the current Page is not loaded, the request will be added to the Page object's
 * ongoingActivity set, since we are certain the request belongs to the current Page.
 * (2) If the current Page is loaded, we are not sure whether a route change will happen soon,
 * or this is a request for some other purpose. As a result, we store this request into
 * the PageManager's requestCache. If route change is detected, we can assume this request
 * belongs to the route change, so we move the requests in the cache into the newly created
 * Page object's ongoingActivity.
 *
 * Once the request is completed, it will mark the time of completion to calculate the current
 * Page object's latestEndTime (if in ongoingActivity and page has not loaded),
 * or simply removed from requestCache (if page has loaded).
 *
 * For Fetch, we use the input url combined with the init? parameter.
 * Intuition behind this is that requests that have the same URL will most likely be
 * POST requests, that have the init? parameter populated. As a result, combining init? with
 * input url will ensure trackerPlugin can distinguish different fetch requests with same URLs.
 */
export class TrackerPlugin extends MonkeyPatched implements Plugin {
    private pluginId: string;
    private xhrMap: Map<XMLHttpRequest, XhrDetails>;
    private context: PluginContext;

    constructor() {
        super();
        this.pluginId = TRACKER_PLUGIN_ID;
        this.xhrMap = new Map<XMLHttpRequest, XhrDetails>();
    }

    public load(context: PluginContext): void {
        this.context = context;
        this.enable();
    }

    public getPluginId(): string {
        return this.pluginId;
    }

    protected patches(): MonkeyPatch[] {
        return [
            {
                nodule: XMLHttpRequest.prototype,
                name: 'send',
                wrapper: this.sendWrapper
            },
            {
                nodule: XMLHttpRequest.prototype,
                name: 'open',
                wrapper: this.openWrapper
            },
            {
                nodule: window,
                name: 'fetch',
                wrapper: this.fetchWrapper
            }
        ];
    }

    /**
     * Removes the current event from either requestCache or ongoingActivity set.
     * @param event
     */
    private endTracking = (e: Event) => {
        const currTime = Date.now();

        const xhr: XMLHttpRequest = e.target as XMLHttpRequest;
        xhr.removeEventListener('loadend', this.endTracking);

        this.removeInPageManager(xhr, currTime);
    };

    private sendWrapper = (): ((original: Send) => Send) => {
        const self = this;

        return (original: Send): Send => {
            return function (this: XMLHttpRequest): void {
                const xhrDetails: XhrDetails = self.xhrMap.get(this);
                if (xhrDetails) {
                    this.addEventListener('loadend', self.endTracking);
                    self.recordInPageManager(this);
                }
                return original.apply(this, arguments);
            };
        };
    };

    private openWrapper = (): ((original: Open) => Open) => {
        const self = this;
        return (original: Open): Open => {
            return function (
                this: XMLHttpRequest,
                method: string,
                url: string,
                async: boolean
            ): void {
                self.xhrMap.set(this, { url, method, async });
                return original.apply(this, arguments);
            };
        };
    };

    /**
     * Method that intercepts outgoing fetch requests.
     * Once the fetch request is completed/failed, it will decrement the fetch counter
     */
    private fetch = (
        original: Fetch,
        thisArg: Fetch,
        argsArray: IArguments,
        input: RequestInfo,
        init?: RequestInit
    ): Promise<Response> => {
        const self = this;
        return original.apply(thisArg, argsArray).then((response: Response) => {
            self.context.decrementFetch();
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
                self.context.incrementFetch();
                return self.fetch(original, this, arguments, input, init);
            };
        };
    };

    /**
     * Helper method to record the xhr object into ongoingActivity or cache
     */
    private recordInPageManager(item: XMLHttpRequest) {
        const page = this.context.getCurrentPage();
        const requestCache = this.context.getRequestCache();
        if (page && page.isLoaded !== null && page.isLoaded === false) {
            page.ongoingActivity.add(item);
        } else {
            requestCache.add(item);
        }
    }

    /**
     * Helper method to remove xhr object from ongoingActivity or cache
     * @param item
     * @param currTime
     */
    private removeInPageManager(item: XMLHttpRequest, currTime: number) {
        const page = this.context.getCurrentPage();
        const requestCache = this.context.getRequestCache();
        if (page && page.ongoingActivity.has(item)) {
            page.ongoingActivity.delete(item);
            page.latestEndTime = Math.max(page.latestEndTime, currTime);
        } else if (requestCache.has(item)) {
            requestCache.delete(item);
        }
    }
}
