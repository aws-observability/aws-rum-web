import { XRayTraceEvent } from '../../events/xray-trace-event';
import { HttpEvent } from '../../events/http-event';
import { MonkeyPatch, MonkeyPatched } from '../MonkeyPatched';
import {
    PartialHttpPluginConfig,
    defaultConfig,
    epochTime,
    createXRayTraceEvent,
    getAmznTraceIdHeaderValue,
    X_AMZN_TRACE_ID,
    isUrlAllowed,
    HttpPluginConfig,
    createXRaySubsegment,
    requestInfoToHostname,
    is429,
    is4xx,
    is5xx
} from '../utils/http-utils';
import { XhrError } from '../../errors/XhrError';
import { HTTP_EVENT_TYPE, XRAY_TRACE_EVENT_TYPE } from '../utils/constant';
import { errorEventToJsErrorEvent } from '../utils/js-error-utils';

type XhrDetails = {
    method: string;
    url: string;
    async: boolean;
    trace?: XRayTraceEvent;
};

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

export const XHR_PLUGIN_ID = 'xhr';

/**
 * A plugin which initiates and records AWS X-Ray traces for XML HTTP requests (XMLHttpRequest).
 *
 * The XMLHttpRequest API is monkey patched using shimmer so all calls to XMLHttpRequest are intercepted. Only calls
 * to URLs which are on the allowlist and are not on the denylist are traced and recorded.
 *
 * The XHR events we use (i.e., onload, onerror, onabort, ontimeout) are only
 * supported by newer browsers. If we want to support older browsers we will
 * need to detect older browsers and use the onreadystatechange event.
 *
 * For example, the following sequence events occur for each case:
 *
 * Case 1: Request succeeds events
 * -------------------------------
 * readystatechange (state = 1, status = 0)
 * loadstart
 * readystatechange (state = 2, status = 200)
 * readystatechange (state = 3, status = 200)
 * readystatechange (state = 4, status = 200)
 * load
 * loadend
 *
 * Case 2: Request fails because of invalid domain or CORS failure
 * -------------------------------
 * readystatechange (state = 1, status = 0)
 * loadstart
 * readystatechange (state = 4, status = 0)
 * error
 * loadend
 *
 * Case 3: Request fails because of timeout
 * -------------------------------
 * readystatechange (state = 1, status = 0)
 * loadstart
 * readystatechange (state = 4, status = 0)
 * timeout
 * loadend
 *
 * Case 4: Request is aborted
 * -------------------------------
 * readystatechange (state = 1, status = 0)
 * loadstart
 * readystatechange (state = 2, status = 200)
 * readystatechange (state = 3, status = 200)
 * readystatechange (state = 4, status = 0)
 * abort
 * loadend
 *
 * See
 * - https://xhr.spec.whatwg.org/#event-handlers.
 * - https://xhr.spec.whatwg.org/#events
 */
export class XhrPlugin extends MonkeyPatched<XMLHttpRequest, 'send' | 'open'> {
    private config: HttpPluginConfig;
    private map: Map<XMLHttpRequest, XhrDetails>;

    constructor(config?: PartialHttpPluginConfig) {
        super(XHR_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };
        this.map = new Map<XMLHttpRequest, XhrDetails>();
    }

    protected onload(): void {
        this.enable();
    }

    get cacheSize() {
        return this.map.size;
    }

    protected get patches() {
        return [
            {
                nodule: XMLHttpRequest.prototype,
                name: 'send' as const,
                wrapper: this.sendWrapper
            },
            {
                nodule: XMLHttpRequest.prototype,
                name: 'open' as const,
                wrapper: this.openWrapper
            } as MonkeyPatch<XMLHttpRequest, 'send' | 'open'>
        ];
    }

    private addXRayTraceIdHeader = () => {
        return this.config.addXRayTraceIdHeader;
    };

    private isTracingEnabled = () => {
        return this.context.config.enableXRay;
    };

    private isSessionRecorded = () => {
        return this.context.getSession()?.record || false;
    };

    private handleXhrLoadEvent = (e: Event) => {
        const request = e.target as XMLHttpRequest;
        const details = this.map.get(request);
        if (details) {
            const endTime = epochTime();
            details.trace!.end_time = endTime;
            details.trace!.subsegments![0].end_time = endTime;
            details.trace!.subsegments![0].http!.response = {
                status: request.status
            };

            if (is429(request.status)) {
                details.trace!.subsegments![0].throttle = true;
                details.trace!.throttle = true;
            } else if (is4xx(request.status)) {
                details.trace!.subsegments![0].error = true;
                details.trace!.error = true;
            } else if (is5xx(request.status)) {
                details.trace!.subsegments![0].fault = true;
                details.trace!.fault = true;
            }

            const clStr = request.getResponseHeader('Content-Length');
            const cl = clStr ? parseInt(clStr, 10) : NaN;
            if (!isNaN(cl)) {
                details.trace!.subsegments![0].http!.response.content_length =
                    cl;
            }
            this.recordTraceEvent(details.trace!);
            this.recordHttpEventWithResponse(details, request);
        }
    };

    private handleXhrErrorEvent = (e: Event) => {
        const request = e.target as XMLHttpRequest;
        const details = this.map.get(request);
        const errorName = 'XMLHttpRequest error';
        const errorMessage: string = request.statusText
            ? request.status.toString() + ': ' + request.statusText
            : request.status.toString();
        if (details) {
            const endTime = epochTime();
            // Guidance from X-Ray documentation:
            // > Record errors in segments when your application returns an
            // > error to the user, and in subsegments when a downstream call
            // > returns an error.
            details.trace!.fault = true;
            details.trace!.end_time = endTime;
            details.trace!.subsegments![0].end_time = endTime;
            details.trace!.subsegments![0].fault = true;
            details.trace!.subsegments![0].cause = {
                exceptions: [
                    {
                        type: errorName,
                        message: errorMessage
                    }
                ]
            };
            this.recordTraceEvent(details.trace!);
            this.recordHttpEventWithError(
                details,
                request,
                new XhrError(errorMessage)
            );
        }
    };

    private handleXhrAbortEvent = (e: Event) => {
        const request = e.target as XMLHttpRequest;
        const details = this.map.get(request);
        if (details) {
            this.handleXhrDetailsOnError(
                details,
                request,
                'XMLHttpRequest abort'
            );
        }
    };

    private handleXhrTimeoutEvent = (e: Event) => {
        const request = e.target as XMLHttpRequest;
        const details = this.map.get(request);
        const errorName = 'XMLHttpRequest timeout';
        this.handleXhrDetailsOnError(details, request, errorName);
    };

    private handleXhrDetailsOnError(
        details: XhrDetails | undefined,
        request: XMLHttpRequest,
        errorName: string
    ) {
        if (details) {
            const endTime = epochTime();
            details.trace!.end_time = endTime;
            details.trace!.subsegments![0].end_time = endTime;
            details.trace!.subsegments![0].error = true;
            details.trace!.subsegments![0].cause = {
                exceptions: [
                    {
                        type: errorName
                    }
                ]
            };
            this.recordTraceEvent(details.trace!);
            this.recordHttpEventWithError(details, request, errorName);
        }
    }

    private statusOk(status: number) {
        return status >= 200 && status < 300;
    }

    private recordHttpEventWithResponse(
        details: XhrDetails,
        request: XMLHttpRequest
    ) {
        this.map.delete(request);
        const httpEvent: HttpEvent = {
            version: '1.0.0',
            request: { method: details.method, url: details.url },
            response: {
                status: request.status,
                statusText: request.statusText
            }
        };
        if (this.config.recordAllRequests || !this.statusOk(request.status)) {
            this.context.record(HTTP_EVENT_TYPE, httpEvent);
        }
    }

    private recordHttpEventWithError(
        details: XhrDetails,
        request: XMLHttpRequest,
        error: Error | string | number | boolean | undefined | null
    ) {
        this.map.delete(request);
        const httpEvent: HttpEvent = {
            version: '1.0.0',
            request: { method: details.method, url: details.url },
            error: errorEventToJsErrorEvent(
                {
                    type: 'error',
                    error
                } as ErrorEvent,
                this.config.stackTraceLength
            )
        };
        this.context.record(HTTP_EVENT_TYPE, httpEvent);
    }

    private recordTraceEvent(trace: XRayTraceEvent) {
        if (this.isTracingEnabled() && this.isSessionRecorded()) {
            this.context.record(XRAY_TRACE_EVENT_TYPE, trace);
        }
    }

    private initializeTrace = (details: XhrDetails) => {
        const startTime = epochTime();
        details.trace = createXRayTraceEvent(
            this.config.logicalServiceName,
            startTime
        );
        details.trace.subsegments!.push(
            createXRaySubsegment(
                requestInfoToHostname(details.url),
                startTime,
                {
                    request: {
                        method: details.method,
                        url: details.url,
                        traced: true
                    }
                }
            )
        );
    };

    private sendWrapper = () => {
        const self = this;
        return (original: any) => {
            return function (this: XMLHttpRequest): void {
                const details = self.map.get(this);
                if (details) {
                    this.addEventListener('load', self.handleXhrLoadEvent);
                    this.addEventListener('error', self.handleXhrErrorEvent);
                    this.addEventListener('abort', self.handleXhrAbortEvent);
                    this.addEventListener(
                        'timeout',
                        self.handleXhrTimeoutEvent
                    );

                    self.initializeTrace(details);

                    if (
                        self.isTracingEnabled() &&
                        self.addXRayTraceIdHeader() &&
                        self.isSessionRecorded()
                    ) {
                        this.setRequestHeader(
                            X_AMZN_TRACE_ID,
                            getAmznTraceIdHeaderValue(
                                details.trace!.trace_id,
                                details.trace!.subsegments![0].id
                            )
                        );
                    }
                }
                return original.apply(this, arguments);
            };
        };
    };

    private openWrapper = () => {
        const self = this;
        return (original: any) => {
            return function (
                this: XMLHttpRequest,
                method: string,
                url: string,
                async: boolean
            ): void {
                if (isUrlAllowed(url, self.config)) {
                    self.map.set(this, { url, method, async });
                }
                return original.apply(this, arguments);
            };
        };
    };
}
