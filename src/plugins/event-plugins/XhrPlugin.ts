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
    private xhrMap: Map<XMLHttpRequest, XhrDetails>;

    constructor(config?: PartialHttpPluginConfig) {
        super(XHR_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };
        this.xhrMap = new Map<XMLHttpRequest, XhrDetails>();
    }

    protected onload(): void {
        this.enable();
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
        const xhr: XMLHttpRequest = e.target as XMLHttpRequest;
        const xhrDetails: XhrDetails = this.xhrMap.get(xhr) as XhrDetails;
        if (xhrDetails) {
            const endTimee = epochTime();
            xhrDetails.trace!.end_time = endTimee;
            xhrDetails.trace!.subsegments![0].end_time = endTimee;
            xhrDetails.trace!.subsegments![0].http!.response = {
                status: xhr.status
            };

            if (is429(xhr.status)) {
                xhrDetails.trace!.subsegments![0].throttle = true;
                xhrDetails.trace!.throttle = true;
            } else if (is4xx(xhr.status)) {
                xhrDetails.trace!.subsegments![0].error = true;
                xhrDetails.trace!.error = true;
            } else if (is5xx(xhr.status)) {
                xhrDetails.trace!.subsegments![0].fault = true;
                xhrDetails.trace!.fault = true;
            }

            const clStr = xhr.getResponseHeader('Content-Length');
            const cl = clStr ? parseInt(clStr, 10) : NaN;
            if (!isNaN(cl)) {
                xhrDetails.trace!.subsegments![0].http!.response.content_length = cl;
            }
            this.recordTraceEvent(xhrDetails.trace!);
            this.recordHttpEventWithResponse(xhrDetails, xhr);
        }
    };

    private handleXhrErrorEvent = (e: Event) => {
        const xhr: XMLHttpRequest = e.target as XMLHttpRequest;
        const xhrDetails = this.xhrMap.get(xhr);
        const errorName = 'XMLHttpRequest error';
        const errorMessage: string = xhr.statusText
            ? xhr.status.toString() + ': ' + xhr.statusText
            : xhr.status.toString();
        if (xhrDetails) {
            const endTime = epochTime();
            // Guidance from X-Ray documentation:
            // > Record errors in segments when your application returns an
            // > error to the user, and in subsegments when a downstream call
            // > returns an error.
            xhrDetails.trace!.fault = true;
            xhrDetails.trace!.end_time = endTime;
            xhrDetails.trace!.subsegments![0].end_time = endTime;
            xhrDetails.trace!.subsegments![0].fault = true;
            xhrDetails.trace!.subsegments![0].cause = {
                exceptions: [
                    {
                        type: errorName,
                        message: errorMessage
                    }
                ]
            };
            this.recordTraceEvent(xhrDetails.trace!);
            this.recordHttpEventWithError(
                xhrDetails,
                new XhrError(errorMessage)
            );
        }
    };

    private handleXhrAbortEvent = (e: Event) => {
        const xhr: XMLHttpRequest = e.target as XMLHttpRequest;
        const xhrDetails = this.xhrMap.get(xhr);
        const errorName = 'XMLHttpRequest abort';
        this.handleXhrDetailsOnError(xhrDetails, errorName);
    };

    private handleXhrTimeoutEvent = (e: Event) => {
        const xhr: XMLHttpRequest = e.target as XMLHttpRequest;
        const xhrDetails = this.xhrMap.get(xhr);
        const errorName = 'XMLHttpRequest timeout';
        this.handleXhrDetailsOnError(xhrDetails, errorName);
    };

    private handleXhrDetailsOnError(
        xhrDetails: XhrDetails | undefined,
        errorName: string
    ) {
        if (xhrDetails) {
            const endTime = epochTime();
            xhrDetails.trace!.end_time = endTime;
            xhrDetails.trace!.subsegments![0].end_time = endTime;
            xhrDetails.trace!.subsegments![0].error = true;
            xhrDetails.trace!.subsegments![0].cause = {
                exceptions: [
                    {
                        type: errorName
                    }
                ]
            };
            this.recordTraceEvent(xhrDetails.trace!);
            this.recordHttpEventWithError(xhrDetails, errorName);
        }
    }

    private statusOk(status: number) {
        return status >= 200 && status < 300;
    }

    private recordHttpEventWithResponse(
        xhrDetails: XhrDetails,
        xhr: XMLHttpRequest
    ) {
        if (this.config.recordAllRequests || !this.statusOk(xhr.status)) {
            this.context.record(HTTP_EVENT_TYPE, {
                version: '1.0.0',
                request: { method: xhrDetails.method, url: xhrDetails.url },
                response: { status: xhr.status, statusText: xhr.statusText }
            });
        }
    }

    private recordHttpEventWithError(
        xhrDetails: XhrDetails,
        error: Error | string | number | boolean | undefined | null
    ) {
        const httpEvent: HttpEvent = {
            version: '1.0.0',
            request: { method: xhrDetails.method, url: xhrDetails.url }
        };
        httpEvent.error = errorEventToJsErrorEvent(
            {
                type: 'error',
                error
            } as ErrorEvent,
            this.config.stackTraceLength
        );
        this.context.record(HTTP_EVENT_TYPE, httpEvent);
    }

    private recordTraceEvent(trace: XRayTraceEvent) {
        if (this.isTracingEnabled() && this.isSessionRecorded()) {
            this.context.record(XRAY_TRACE_EVENT_TYPE, trace);
        }
    }

    private initializeTrace = (xhrDetails: XhrDetails) => {
        const startTime = epochTime();
        xhrDetails.trace = createXRayTraceEvent(
            this.config.logicalServiceName,
            startTime
        );
        xhrDetails.trace.subsegments!.push(
            createXRaySubsegment(
                requestInfoToHostname(xhrDetails.url),
                startTime,
                {
                    request: {
                        method: xhrDetails.method,
                        url: xhrDetails.url,
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
                const xhrDetails = self.xhrMap.get(this);
                if (xhrDetails) {
                    this.addEventListener('load', self.handleXhrLoadEvent);
                    this.addEventListener('error', self.handleXhrErrorEvent);
                    this.addEventListener('abort', self.handleXhrAbortEvent);
                    this.addEventListener(
                        'timeout',
                        self.handleXhrTimeoutEvent
                    );

                    self.initializeTrace(xhrDetails);

                    if (
                        self.isTracingEnabled() &&
                        self.addXRayTraceIdHeader() &&
                        self.isSessionRecorded()
                    ) {
                        this.setRequestHeader(
                            X_AMZN_TRACE_ID,
                            getAmznTraceIdHeaderValue(
                                xhrDetails.trace!.trace_id,
                                xhrDetails.trace!.subsegments![0].id
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
                    self.xhrMap.set(this, { url, method, async });
                }
                return original.apply(this, arguments);
            };
        };
    };
}
