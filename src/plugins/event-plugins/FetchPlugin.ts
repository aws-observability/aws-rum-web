import {
    Http,
    Subsegment,
    XRayTraceEvent
} from '../../events/xray-trace-event';
import { MonkeyPatched } from '../MonkeyPatched';
import {
    PartialHttpPluginConfig,
    defaultConfig,
    epochTime,
    createXRayTraceEvent,
    addAmznTraceIdHeaderToInit,
    HttpPluginConfig,
    createXRayTraceEventHttp,
    isUrlAllowed,
    createXRaySubsegment,
    requestInfoToHostname,
    addAmznTraceIdHeaderToHeaders,
    resourceToUrlString,
    is429,
    is4xx,
    is5xx
} from '../utils/http-utils';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from '../utils/constant';
import {
    errorEventToJsErrorEvent,
    isErrorPrimitive
} from '../utils/js-error-utils';
import { HttpEvent } from '../../events/http-event';

type Fetch = typeof fetch;

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

export const FETCH_PLUGIN_ID = 'fetch';

/**
 * A plugin which initiates and records AWS X-Ray traces for fetch HTTP requests.
 *
 * The fetch API is monkey patched using shimmer so all calls to fetch are intercepted. Only calls to URLs which are
 * on the allowlist and are not on the denylist are traced and recorded.
 */
export class FetchPlugin extends MonkeyPatched<Window, 'fetch'> {
    private readonly config: HttpPluginConfig;

    constructor(config?: PartialHttpPluginConfig) {
        super(FETCH_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };
    }

    protected get patches() {
        return [
            {
                nodule: window as Window,
                name: 'fetch' as const,
                wrapper: this.fetchWrapper
            }
        ];
    }

    protected onload(): void {
        this.enable();
    }

    private isTracingEnabled = () => {
        return this.context.config.enableXRay;
    };

    private isSessionRecorded = () => {
        return this.context.getSession()?.record || false;
    };

    private beginTrace = (
        input: RequestInfo | URL | string,
        init: RequestInit | undefined,
        argsArray: IArguments
    ): XRayTraceEvent => {
        const startTime = epochTime();
        const http: Http = createXRayTraceEventHttp(input, init, true);
        const xRayTraceEvent: XRayTraceEvent = createXRayTraceEvent(
            this.config.logicalServiceName,
            startTime
        );
        const subsegment: Subsegment = createXRaySubsegment(
            requestInfoToHostname(input),
            startTime,
            http
        );
        xRayTraceEvent.subsegments!.push(subsegment);

        if (this.config.addXRayTraceIdHeader) {
            this.addXRayTraceIdHeader(input, init, argsArray, xRayTraceEvent);
        }

        return xRayTraceEvent;
    };

    private addXRayTraceIdHeader = (
        input: RequestInfo | URL | string,
        init: RequestInit | undefined,
        argsArray: IArguments,
        xRayTraceEvent: XRayTraceEvent
    ) => {
        if ((input as Request).headers) {
            return addAmznTraceIdHeaderToHeaders(
                (input as Request).headers,
                xRayTraceEvent.trace_id,
                xRayTraceEvent.subsegments![0].id
            );
        }

        if (!init) {
            init = {};
            [].push.call(argsArray, init as never);
        }

        addAmznTraceIdHeaderToInit(
            init,
            xRayTraceEvent.trace_id,
            xRayTraceEvent.subsegments![0].id
        );
    };

    private endTrace = (
        xRayTraceEvent: XRayTraceEvent | undefined,
        response: Response | undefined,
        error: Error | string | number | boolean | undefined
    ) => {
        if (xRayTraceEvent) {
            const endTime = epochTime();
            xRayTraceEvent.subsegments![0].end_time = endTime;
            xRayTraceEvent.end_time = endTime;

            if (response) {
                xRayTraceEvent.subsegments![0].http!.response = {
                    status: response.status
                };

                if (is429(response.status)) {
                    xRayTraceEvent.subsegments![0].throttle = true;
                    xRayTraceEvent.throttle = true;
                } else if (is4xx(response.status)) {
                    xRayTraceEvent.subsegments![0].error = true;
                    xRayTraceEvent.error = true;
                } else if (is5xx(response.status)) {
                    xRayTraceEvent.subsegments![0].fault = true;
                    xRayTraceEvent.fault = true;
                }

                const clStr = response.headers.get('Content-Length');
                const cl = clStr ? parseInt(clStr, 10) : NaN;
                if (!isNaN(cl)) {
                    xRayTraceEvent.subsegments![0].http!.response.content_length = cl;
                }
            }

            if (error) {
                // Guidance from X-Ray documentation:
                // > Record errors in segments when your application returns an
                // > error to the user, and in subsegments when a downstream call
                // > returns an error.
                xRayTraceEvent.fault = true;
                xRayTraceEvent.subsegments![0].fault = true;
                if (error instanceof Object) {
                    this.appendErrorCauseFromObject(
                        xRayTraceEvent.subsegments![0],
                        error
                    );
                } else if (isErrorPrimitive(error)) {
                    this.appendErrorCauseFromPrimitive(
                        xRayTraceEvent.subsegments![0],
                        error.toString()
                    );
                }
            }

            this.context.record(XRAY_TRACE_EVENT_TYPE, xRayTraceEvent);
        }
    };

    private appendErrorCauseFromPrimitive(
        subsegment: Subsegment,
        error: string
    ) {
        subsegment.cause = {
            exceptions: [
                {
                    type: error
                }
            ]
        };
    }

    private appendErrorCauseFromObject(subsegment: Subsegment, error: Error) {
        subsegment.cause = {
            exceptions: [
                {
                    type: error.name,
                    message: error.message
                }
            ]
        };
    }

    private createHttpEvent = (
        input: RequestInfo | URL | string,
        init?: RequestInit
    ): HttpEvent => {
        return {
            version: '1.0.0',
            request: {
                url: resourceToUrlString(input),
                method: init?.method ? init.method : 'GET'
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
        input: RequestInfo | URL | string,
        init?: RequestInit
    ): Promise<Response> => {
        const httpEvent: HttpEvent = this.createHttpEvent(input, init);
        let trace: XRayTraceEvent | undefined;

        if (!isUrlAllowed(resourceToUrlString(input), this.config)) {
            return original.apply(thisArg, argsArray as any);
        }

        if (this.isTracingEnabled() && this.isSessionRecorded()) {
            trace = this.beginTrace(input, init, argsArray);
        }

        return original
            .apply(thisArg, argsArray as any)
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

    private fetchWrapper = (): ((original: Fetch) => Fetch) => {
        const self = this;
        return (original: Fetch): Fetch => {
            return function (
                this: Fetch,
                input: RequestInfo | URL | string,
                init?: RequestInit
            ): Promise<Response> {
                return self.fetch(original, this, arguments, input, init);
            };
        };
    };
}
