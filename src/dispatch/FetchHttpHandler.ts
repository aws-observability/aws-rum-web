import { HttpHandler, HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { buildQueryString } from '@aws-sdk/querystring-builder';
import { HeaderBag, HttpHandlerOptions } from '@aws-sdk/types';

import { requestTimeout } from './request-timeout';

declare let AbortController: any;

/**
 * Represents the http options that can be passed to a browser http client.
 */
export interface FetchHttpHandlerOptions {
    /**
     * The number of milliseconds a request can take before being automatically
     * terminated.
     */
    requestTimeout?: number;

    /**
     * The function to use to execute the fetch request.
     *
     * Defaults to window.fetch if not provided.
     */
    fetchFunction?: (
        input: RequestInfo,
        init?: RequestInit
    ) => Promise<Response>;
}

export class FetchHttpHandler implements HttpHandler {
    private readonly requestTimeout?: number;
    private fetchFunction?: (
        input: RequestInfo,
        init?: RequestInit
    ) => Promise<Response>;

    constructor({
        fetchFunction,
        requestTimeout
    }: FetchHttpHandlerOptions = {}) {
        this.requestTimeout = requestTimeout;
        this.fetchFunction = fetchFunction;
    }

    destroy(): void {
        // Do nothing. TLS and HTTP/2 connection pooling is handled by the browser.
    }

    handle(
        request: HttpRequest,
        { abortSignal }: HttpHandlerOptions = {}
    ): Promise<{ response: HttpResponse }> {
        const requestTimeoutInMs = this.requestTimeout;

        // if the request was already aborted, prevent doing extra work
        if (abortSignal?.aborted) {
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';
            return Promise.reject(abortError);
        }

        let path = request.path;
        if (request.query) {
            const queryString = buildQueryString(request.query);
            if (queryString) {
                path += `?${queryString}`;
            }
        }

        const { port, method } = request;
        const url = `${request.protocol}//${request.hostname}${
            port ? `:${port}` : ''
        }${path}`;
        // Request constructor doesn't allow GET/HEAD request with body
        // ref: https://github.com/whatwg/fetch/issues/551
        const body =
            method === 'GET' || method === 'HEAD' ? undefined : request.body;
        const requestOptions: RequestInit = {
            body,
            headers: new Headers(request.headers),
            method
        };

        // some browsers support abort signal
        if (typeof AbortController !== 'undefined') {
            (requestOptions as any).signal = abortSignal;
        }

        const fetchRequest = new Request(url, requestOptions);
        const raceOfPromises = [
            this.fetchFunction!.apply(window, [fetchRequest]).then(
                (response) => {
                    const fetchHeaders: any = response.headers;
                    const transformedHeaders: HeaderBag = {};

                    for (const pair of fetchHeaders.entries() as string[][]) {
                        transformedHeaders[pair[0]] = pair[1];
                    }

                    const hasReadableStream = response.body !== undefined;

                    // Return the response with buffered body
                    if (!hasReadableStream) {
                        return response.blob().then((body) => ({
                            response: new HttpResponse({
                                headers: transformedHeaders,
                                statusCode: response.status,
                                body
                            })
                        }));
                    }
                    // Return the response with streaming body
                    return {
                        response: new HttpResponse({
                            headers: transformedHeaders,
                            statusCode: response.status,
                            body: response.body
                        })
                    };
                }
            ),
            requestTimeout(requestTimeoutInMs)
        ];
        if (abortSignal) {
            raceOfPromises.push(
                new Promise<never>((resolve, reject) => {
                    abortSignal.onabort = () => {
                        const abortError = new Error('Request aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    };
                })
            );
        }
        return Promise.race(raceOfPromises);
    }

    updateHttpClientConfig(_key: never, _value: never): void {
        // No-op: Customize if needed
    }

    httpHandlerConfigs(): Record<string, never> {
        return {};
    }
}
