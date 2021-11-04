import { FetchPlugin } from '../FetchPlugin';
import { HttpPluginConfig } from '../../utils/http-utils';
import { advanceTo } from 'jest-date-mock';
import {
    context,
    record,
    recordPageView
} from '../../../test-utils/test-utils';
import { GetSession, PluginContext } from '../../Plugin';
import { XRAY_TRACE_EVENT_TYPE, HTTP_EVENT_TYPE } from '../../utils/constant';
import { DEFAULT_CONFIG } from '../../../test-utils/test-utils';

// Mock getRandomValues -- since it does nothing, the 'random' number will be 0.
jest.mock('../../../utils/random');

const mockFetch = jest.fn((input: RequestInfo, init?: RequestInit) =>
    Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: {},
        body: '{}',
        ok: true
    })
);

const mockFetchWith500 = jest.fn((input: RequestInfo, init?: RequestInit) =>
    Promise.resolve({
        status: 500,
        statusText: 'InternalError',
        headers: {},
        body: '',
        ok: false
    })
);

const mockFetchWithError = jest.fn((input: RequestInfo, init?: RequestInit) =>
    Promise.reject('Timeout')
);

const mockFetchWithErrorObject = jest.fn(
    (input: RequestInfo, init?: RequestInit) =>
        Promise.reject(new Error('Timeout'))
);

const mockFetchWithErrorObjectAndStack = jest.fn(
    (input: RequestInfo, init?: RequestInit) =>
        Promise.reject({
            name: 'FetchError',
            message: 'timeout',
            stack: 'stack trace'
        })
);

// @ts-ignore
global.fetch = mockFetch;

describe('JsErrorPlugin tests', () => {
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
        const config: HttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            trace: false,
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                url: 'https://aws.amazon.com'
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
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        // @ts-ignore
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithError).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                url: 'https://aws.amazon.com'
            },
            error: {
                type: 'Timeout'
            }
        });
    });

    test('when fetch throws an error object then the plugin adds the error object to the http event', async () => {
        // Init
        global.fetch = mockFetchWithErrorObject;
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        // @ts-ignore
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithErrorObject).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                url: 'https://aws.amazon.com'
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
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            http: {
                request: {
                    method: 'GET',
                    traced: true,
                    url: 'https://aws.amazon.com'
                },
                response: { status: 200 }
            }
        });
    });

    test('when fetch throws an error then the plugin adds the error to the trace', async () => {
        // Init
        global.fetch = mockFetchWithError;
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
        });
        plugin.disable();
        // @ts-ignore
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithError).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            http: {
                request: {
                    method: 'GET',
                    traced: true,
                    url: 'https://aws.amazon.com'
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
        });
    });

    test('when plugin is disabled then the plugin does not record a trace', async () => {
        // Init
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);
        plugin.disable();

        // Run
        await fetch('https://aws.amazon.com');

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('when plugin is re-enabled then the plugin records a trace', async () => {
        // Init
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);
        plugin.disable();
        plugin.enable();

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
    });

    test('X-Amzn-Trace-Id header is added to the HTTP request', async () => {
        // Init
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        const init: RequestInit = {};

        // Run
        await fetch('https://aws.amazon.com', init);
        plugin.disable();

        // Assert
        expect(
            (init.headers['X-Amzn-Trace-Id'] =
                'Root=1-0-000000000000000000000000;Parent=0000000000000000;Sampled=1')
        );
    });

    test('when trace is disabled then the plugin does not record a trace', async () => {
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

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
        const context: PluginContext = {
            applicationId: 'b',
            applicationVersion: '1.0',
            config: DEFAULT_CONFIG,
            record,
            recordPageView,
            getSession
        };
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            trace: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

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
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/]
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
            console.log(error);
        });
        plugin.disable();
        // @ts-ignore
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithErrorObjectAndStack).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                url: 'https://aws.amazon.com'
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
        const config: HttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/aws\.amazon\.com/],
            stackTraceLength: 0
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com').catch((error) => {
            // Expected
            console.log(error);
        });
        plugin.disable();
        // @ts-ignore
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWithErrorObjectAndStack).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        // @ts-ignore
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                url: 'https://aws.amazon.com'
            },
            error: {
                type: 'FetchError',
                message: 'timeout'
            }
        });
        // @ts-ignore
        expect(record.mock.calls[0][1].error.stack).toEqual(undefined);
    });

    test('when recordAllRequests is true then the plugin records a request with status OK', async () => {
        // Init
        const config: HttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when recordAllRequests is false then the plugin does not record a request with status OK', async () => {
        // Init
        const config: HttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when recordAllRequests is false then the plugin records a request with status 500', async () => {
        // Init
        // @ts-ignore
        global.fetch = mockFetchWith500;
        const config: HttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            recordAllRequests: false
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();
        // @ts-ignore
        global.fetch = mockFetch;

        // Assert
        expect(mockFetchWith500).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when a url is excluded then the plugin does not record a request to that url', async () => {
        // Init
        const config: HttpPluginConfig = {
            urlsToInclude: [/aws\.amazon\.com/],
            urlsToExclude: [/aws\.amazon\.com/],
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).not.toHaveBeenCalled();
    });

    test('all urls are included by default', async () => {
        // Init
        const config: HttpPluginConfig = {
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://aws.amazon.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(record).toHaveBeenCalled();
    });

    test('when a request is made to cognito or sts using default exclude list then the requests are not recorded', async () => {
        // Init
        const config: HttpPluginConfig = {
            recordAllRequests: true
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

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
        const config: HttpPluginConfig = {
            recordAllRequests: true,
            urlsToExclude: []
        };

        const plugin: FetchPlugin = new FetchPlugin(config);
        plugin.load(context);

        // Run
        await fetch('https://cognito-identity.us-west-2.amazonaws.com');
        await fetch('https://sts.us-west-2.amazonaws.com');
        plugin.disable();

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});
