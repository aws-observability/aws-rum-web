import { Plugin, PluginContext } from '../Plugin';
import { Http, XRayTraceEvent } from '../../events/xray-trace-event';
import { MonkeyPatch, MonkeyPatched } from '../MonkeyPatched';
import {
    PartialHttpPluginConfig,
    defaultConfig,
    epochTime,
    createXRayTraceEvent,
    addAmznTraceIdHeader,
    HttpPluginConfig,
    createXRayTraceEventHttp,
    isUrlAllowed
} from '../utils/http-utils';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from '../utils/constant';
import { errorEventToJsErrorEvent } from '../utils/js-error-utils';
import { HttpEvent } from '../../events/http-event';

type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

/**
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
 */
type Error = {
    message: string;
    name: string;
    fileName?: string; // non-standard Mozilla
    lineNumber?: number; // non-standard Mozilla
    columnNumber?: number; // non-standard Mozilla
    stack?: string; // non-standard Mozilla
};

export const FETCH_PLUGIN_ID = 'com.amazonaws.rum.fetch';

/**
 * A plugin which initiates and records AWS X-Ray traces for fetch HTTP requests.
 *
 * The fetch API is monkey patched using shimmer so all calls to fetch are intercepted. Only calls to URLs which are
 * on the allowlist and are not on the denylist are traced and recorded.
 */
export class FetchPlugin extends MonkeyPatched implements Plugin {
    private pluginId: string;
    private config: HttpPluginConfig;
    private context: PluginContext;

    constructor(config?: PartialHttpPluginConfig) {
        super();
        this.pluginId = FETCH_PLUGIN_ID;
        this.config = { ...defaultConfig, ...config };
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
                nodule: window,
                name: 'fetch',
                wrapper: this.fetchWrapper
            }
        ];
    }

    private isTracingEnabled = () => {
        return this.context.config.enableXRay;
    };

    private isSessionRecorded = () => {
        return this.context.getSession().record;
    };

    private beginTrace = (
        input: RequestInfo,
        init: RequestInit
    ): XRayTraceEvent => {
        const startTime = epochTime();
        const http: Http = createXRayTraceEventHttp(init, true);
        const xRayTraceEvent: XRayTraceEvent = createXRayTraceEvent(
            this.config.logicalServiceName,
            startTime,
            http
        );

        addAmznTraceIdHeader(init, xRayTraceEvent.trace_id, xRayTraceEvent.id);

        return xRayTraceEvent;
    };

    private endTrace = (
        xRayTraceEvent: XRayTraceEvent,
        response: Response | undefined,
        error: Error | string | number | boolean | undefined
    ) => {
        if (xRayTraceEvent) {
            const endTime = epochTime();
            xRayTraceEvent.end_time = endTime;

            if (response) {
                xRayTraceEvent.http.response = {
                    status: response.status
                };
            }

            if (error) {
                xRayTraceEvent.error = true;
                if (error instanceof Object) {
                    this.appendErrorCauseFromObject(xRayTraceEvent, error);
                } else {
                    this.appendErrorCauseFromPrimitive(xRayTraceEvent, error);
                }
            }

            this.context.record(XRAY_TRACE_EVENT_TYPE, xRayTraceEvent);
        }
    };

    private appendErrorCauseFromPrimitive(
        xRayTraceEvent: XRayTraceEvent,
        error: any
    ) {
        xRayTraceEvent.cause = {
            exceptions: [
                {
                    type: error.toString()
                }
            ]
        };
    }

    private appendErrorCauseFromObject(
        xRayTraceEvent: XRayTraceEvent,
        error: Error
    ) {
        xRayTraceEvent.cause = {
            exceptions: [
                {
                    type: error.name,
                    message: error.message
                }
            ]
        };
    }

    private createHttpEvent = (
        input: RequestInfo,
        init: RequestInit
    ): HttpEvent => {
        return {
            version: '1.0.0',
            request: {
                method: init.method ? init.method : 'GET'
            }
        };
    };

    private recordHttpEventWithResponse = (
        httpEvent: HttpEvent,
        response: Response
    ) => {
        if (this.config.recordAllRequests || !response.ok) {
            httpEvent.response = {
                status: response.status,
                statusText: response.statusText
            };
            this.context.record(HTTP_EVENT_TYPE, httpEvent);
        }
    };

    private recordHttpEventWithError = (
        httpEvent: HttpEvent,
        error: Error | string | number | boolean | undefined | null
    ) => {
        httpEvent.error = errorEventToJsErrorEvent(
            {
                type: 'error',
                error
            } as ErrorEvent,
            this.config.stackTraceLength
        );
        this.context.record(HTTP_EVENT_TYPE, httpEvent);
    };

    private fetch = (
        original: Fetch,
        thisArg: Fetch,
        argsArray: IArguments,
        input: RequestInfo,
        init?: RequestInit
    ): Promise<Response> => {
        init = init ? init : {};
        const httpEvent: HttpEvent = this.createHttpEvent(input, init);
        let trace: XRayTraceEvent | undefined;

        let url: string;
        if (typeof input === 'string') {
            url = input;
        } else {
            url = input.url;
        }

        if (!isUrlAllowed(url, this.config)) {
            return original.apply(thisArg, argsArray);
        }

        if (this.isTracingEnabled() && this.isSessionRecorded()) {
            trace = this.beginTrace(input, init);
        }

        return original
            .apply(thisArg, argsArray)
            .then((response: Response) => {
                this.endTrace(trace, response, undefined);
                this.recordHttpEventWithResponse(httpEvent, response);
                return response;
            })
            .catch((error: Error) => {
                this.endTrace(trace, undefined, error);
                this.recordHttpEventWithError(httpEvent, error);
                throw error;
            });
    };

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
                return self.fetch(original, this, arguments, input, init);
            };
        };
    };
}
