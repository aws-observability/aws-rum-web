import { FetchPlugin } from '../FetchPlugin';
import {
    PartialHttpPluginConfig,
    X_AMZN_TRACE_ID
} from '../../utils/http-utils';
import { advanceTo } from 'jest-date-mock';
import {
    DEFAULT_CONFIG,
    record,
    recordPageView,
    xRayOffContext,
    xRayOnContext,
    getCurrentUrl,
    getCurrentPage,
    getRequestCache,
    incrementFetch,
    decrementFetch
} from '../../../test-utils/test-utils';
import { GetSession, PluginContext } from '../../Plugin';
import { XRAY_TRACE_EVENT_TYPE, HTTP_EVENT_TYPE } from '../../utils/constant';
import { HttpEvent } from '../../../events/http-event';

// Mock getRandomValues -- since it does nothing, the 'random' number will be 0.
jest.mock('../../../utils/random');

const TRACE_ID =
    'Root=1-0-000000000000000000000000;Parent=0000000000000000;Sampled=1';

const Headers = function (init?: Record<string, string>) {
    const headers = init ? init : {};
    this.get = function (name: string) {
        return headers[name];
    };
    this.set = function (name: string, value: string) {
        headers[name] = value;
    };
};

const Request = function (input: RequestInfo, init?: RequestInit) {
    if (typeof input === 'string') {
        this.url = input;
        this.method = 'GET';
        this.headers = new Headers();
    } else {
        this.url = input.url;
        this.method = input.method ? input.method : 'GET';
        this.headers = input.headers ? input.headers : new Headers();
    }
    if (init) {
        this.method = init.method ? init.method : this.method;
        if (
            this.headers &&
            typeof (init.headers as Headers).get === 'function'
        ) {
            this.headers = init.headers;
        } else if (this.headers) {
            this.headers = new Headers(init.headers as Record<string, string>);
        }
    }
};

const mockFetch = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'Content-Length': '125' }),
            body: '{}',
            ok: true
        } as any)
);

global.fetch = mockFetch;

const mockFetchWith500 = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.resolve({
            status: 500,
            statusText: 'InternalError',
            headers: {},
            body: '',
            ok: false
        } as any)
);

const mockFetchWithError = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject('Timeout')
);

const mockFetchWithErrorObject = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject(new Error('Timeout'))
);

const mockFetchWithErrorObjectAndStack = jest.fn(
    (input: RequestInfo, init?: RequestInit): Promise<Response> =>
        Promise.reject({
            name: 'FetchError',
            message: 'timeout',
            stack: 'stack trace'
        })
);

describe('FetchPlugin tests', () => {
    beforeEach(() => {
        advanceTo(0);
        mockFetch.mockClear();
        mockFetchWith500.mockClear();
        mockFetchWithError.mockClear();
        mockFetchWithErrorObject.mockClear();
        mockFetchWithErrorObjectAndStack.mockClear();
        record.mockClear();
    });

    test('when fetch is called then the plugin records the http request/response', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            response: {
                status: 200,
                statusText: 'OK'
            }
        });
    });

    test('when fetch throws an error then the plugin adds the error to the http event', async () => {
        // Init
        global.fetch = mockFetchWithError;
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithError).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            error: {
                type: 'Timeout'
            }
        });
    });

    test('when fetch throws an error object then the plugin adds the error object to the http event', async () => {
        // Init
        global.fetch = mockFetchWithErrorObject;
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithErrorObject).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            error: {
                type: 'Error',
                message: 'Timeout',
                stack: expect.stringContaining('FetchPlugin.test.ts')
            }
        });
    });

    test('when fetch is called then the plugin records a trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        const tmp = record.mock.calls[0][1];
        expect(record.mock.calls[0][1]).toMatchObject({
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            subsegments: [
                {
                    id: '0000000000000000',
                    name: 'aws.amazon.com',
                    start_time: 0,
                    end_time: 0,
                    namespace: 'remote',
                    http: {
                        request: {
                            method: 'GET',
                            traced: true
                        },
                        response: { status: 200, content_length: 125 }
                    }
                }
            ]
        });
    });

    test('when fetch throws an error then the plugin adds the error to the trace', async () => {
        // Init
        global.fetch = mockFetchWithError;
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithError).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            subsegments: [
                {
                    id: '0000000000000000',
                    name: 'aws.amazon.com',
                    start_time: 0,
                    end_time: 0,
                    http: {
                        request: {
                            method: 'GET',
                            traced: true
                        }
                    },
                    error: true,
                    cause: {
                        exceptions: [
                            {
                                type: 'Timeout'
                            }
                        ]
                    }
                }
            ]
        });
    });

    test('when plugin is disabled then the plugin does not record a trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);
        plugin.disable();

        // Run
        await fetch('https://aws.amazon.com');

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('when plugin is re-enabled then the plugin records a trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);
        plugin.disable();
        plugin.enable();

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
    });

    test('when default config is used then X-Amzn-Trace-Id header is not added to ', async () => {
        // Init
        const config: PartialHttpPluginConfig = {};

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        const init: RequestInit = {};

        // Run
        await fetch('https://aws.amazon.com', init);
        plugin.disable();

        // Assert
        expect(init.headers).toEqual(undefined);
    });

    test('when default config is used then RequestInit is not added to the HTTP request', async () => {
        // Init
        const config: PartialHttpPluginConfig = {};

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch.mock.calls[0][1]).toEqual(undefined);
    });

    test('when addXRayTraceIdHeader is true then X-Amzn-Trace-Id header is added to the HTTP request', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            addXRayTraceIdHeader: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        const init: RequestInit = {};

        // Run
        await fetch('https://aws.amazon.com', init);
        plugin.disable();

        // Assert
        expect((init.headers[X_AMZN_TRACE_ID] = TRACE_ID));
        expect(init.headers instanceof Array).toBeFalsy();
    });

    test('when addXRayTraceIdHeader is true then RequestInit is added to the HTTP request', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            addXRayTraceIdHeader: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch.mock.calls[0][1]).toMatchObject({
            headers: {
                [X_AMZN_TRACE_ID]: TRACE_ID
            }
        });
    });

    test('when trace is disabled then the plugin does not record a trace', async () => {
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('when session is not being recorded then the plugin does not record a trace', async () => {
        const getSession: jest.MockedFunction<GetSession> = jest.fn(() => ({
            sessionId: 'abc123',
            record: false,
            eventCount: 0
        }));
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };
        const xRayOnContext: PluginContext = {
            applicationId: 'b',
            applicationVersion: '1.0',
            config: { ...DEFAULT_CONFIG, ...{ enableXRay: true } },
            record,
            recordPageView,
            getSession,
            getCurrentUrl,
            getCurrentPage,
            getRequestCache,
            incrementFetch,
            decrementFetch
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('when getSession returns undefined then the plugin does not record a trace', async () => {
        const getSession: jest.MockedFunction<GetSession> = jest.fn(
            () => undefined
        );
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };
        const xRayOnContext: PluginContext = {
            applicationId: 'b',
            applicationVersion: '1.0',
            config: { ...DEFAULT_CONFIG, ...{ enableXRay: true } },
            record,
            recordPageView,
            getSession,
            getCurrentUrl,
            getCurrentPage,
            getRequestCache,
            incrementFetch,
            decrementFetch
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('the plugin records a stack trace by default', async () => {
        // Init
        global.fetch = mockFetchWithErrorObjectAndStack;
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithErrorObjectAndStack).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            error: {
                type: 'FetchError',
                message: 'timeout',
                stack: 'stack trace'
            }
        });
    });

    test('when stack trace length is zero then the plugin does not record a stack trace', async () => {
        // Init
        global.fetch = mockFetchWithErrorObjectAndStack;
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            stackTraceLength: 0
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithErrorObjectAndStack).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            error: {
                type: 'FetchError',
                message: 'timeout'
            }
        });
        expect((record.mock.calls[0][1] as HttpEvent).error.stack).toEqual(
            undefined
        );
    });

    test('when recordAllRequests is true then the plugin records a request with status OK', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when recordAllRequests is false then the plugin does not record a request with status OK', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when recordAllRequests is false then the plugin records a request with status 500', async () => {
        // Init
        global.fetch = mockFetchWith500;
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWith500).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when a url is excluded then the plugin does not record a request to that url', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            urlsToExclude: [/aws\.amazon\.com/],
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('when a Request url is excluded then the plugin does not record a request to that url', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/.*/],
            urlsToExclude: [/aws\.amazon\.com/],
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch({ url: 'https://aws.amazon.com' } as Request);
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('all urls are included by default', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalled();
    });

    test('when a request is made to cognito or sts using default exclude list then the requests are not recorded', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://cognito-identity.us-west-2.amazonaws.com');
        await fetch('https://sts.us-west-2.amazonaws.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(record).not.toHaveBeenCalled();
    });

    test('when a request is made to cognito or sts using an empty exclude list then the requests are recorded', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            recordAllRequests: true,
            urlsToExclude: []
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        await fetch('https://cognito-identity.us-west-2.amazonaws.com');
        await fetch('https://sts.us-west-2.amazonaws.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('when a url is relative then the subsegment name is location.hostname', async () => {
        // Init
        const config: PartialHttpPluginConfig = {};
        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        await fetch('/resource');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            subsegments: [
                {
                    name: 'us-east-1.console.aws.amazon.com'
                }
            ]
        });
    });

    test('when fetch uses request object then trace headers are added to the request object', async () => {
        // Init
        const SIGN_HEADER_KEY = 'x-amzn-security-token';
        const SIGN_HEADER_VAL = 'abc123';

        const config: PartialHttpPluginConfig = {
            addXRayTraceIdHeader: true,
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(xRayOnContext);

        const init: RequestInit = {
            headers: {
                [SIGN_HEADER_KEY]: SIGN_HEADER_VAL
            }
        };

        const request: Request = new Request('https://aws.amazon.com', init);

        // Run
        await fetch(request);
        plugin.disable();

        // Assert
        expect(request.headers.get(X_AMZN_TRACE_ID)).toEqual(TRACE_ID);
        expect(request.headers.get(SIGN_HEADER_KEY)).toEqual(SIGN_HEADER_VAL);
    });
});
