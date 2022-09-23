import { PartialHttpPluginConfig } from '../../utils/http-utils';
import { advanceTo } from 'jest-date-mock';
import { XhrPlugin } from '../XhrPlugin';
import {
    xRayOffContext,
    xRayOnContext,
    record,
    recordPageView
} from '../../../test-utils/test-utils';
import mock from 'xhr-mock';
import { GetSession, PluginContext } from '../../types';
import { XRAY_TRACE_EVENT_TYPE, HTTP_EVENT_TYPE } from '../../utils/constant';
import { DEFAULT_CONFIG } from '../../../test-utils/test-utils';
import { MockHeaders } from 'xhr-mock/lib/types';

// Mock getRandomValues -- since it does nothing, the 'random' number will be 0.
jest.mock('../../../utils/random');

describe('XhrPlugin tests', () => {
    beforeEach(() => {
        advanceTo(0);
        mock.setup();
        record.mockClear();
    });

    test('when XHR is called then the plugin records the http request/response', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/],
            recordAllRequests: true
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET',
                url: './response.json'
            },
            response: {
                status: 200,
                statusText: 'OK'
            }
        });
    });

    test('when XHR is called then the plugin records a trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' }),
            headers: { 'Content-Length': '125' } as MockHeaders
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            in_progress: false,
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            subsegments: [
                {
                    id: '0000000000000000',
                    start_time: 0,
                    end_time: 0,
                    namespace: 'remote',
                    http: {
                        request: {
                            method: 'GET',
                            traced: true,
                            url: './response.json'
                        },
                        response: { status: 200, content_length: 125 }
                    }
                }
            ]
        });
    });

    test('when plugin is disabled then the plugin does not record any events', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/],
            recordAllRequests: true
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);
        plugin.disable();

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when plugin is re-enabled then the plugin records a trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);
        plugin.disable();
        plugin.enable();

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
    });

    test('when XHR returns an error code then the plugin adds the error to the trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            ...DEFAULT_CONFIG,
            ...{
                logicalServiceName: 'sample.rum.aws.amazon.com',
                urlsToInclude: [/response\.json/]
            }
        };

        mock.get(/.*/, () => Promise.reject(new Error()));

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            in_progress: false,
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            fault: true,
            subsegments: [
                {
                    id: '0000000000000000',
                    start_time: 0,
                    end_time: 0,
                    fault: true,
                    http: {
                        request: {
                            method: 'GET',
                            traced: true
                        }
                    },
                    cause: {
                        exceptions: [
                            {
                                type: 'XMLHttpRequest error'
                            }
                        ]
                    }
                }
            ]
        });
    });

    test('when XHR returns an error code then the plugin adds the error to the http event', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, () => Promise.reject(new Error('Network failure')));

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET',
                url: './response.json'
            },
            error: {
                version: '1.0.0',
                type: 'XMLHttpRequest error',
                message: '0'
            }
        });
    });

    test('when XHR times out then the plugin adds the error to the trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, () => new Promise(() => ({})));

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.timeout = 1;
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            in_progress: false,
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            subsegments: [
                {
                    cause: {
                        exceptions: [
                            {
                                type: 'XMLHttpRequest timeout'
                            }
                        ]
                    }
                }
            ]
        });
    });

    test('when XHR times out then the plugin adds the error to the http event', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, () => new Promise(() => ({})));

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.timeout = 1;
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            error: {
                version: '1.0.0',
                type: 'XMLHttpRequest timeout'
            }
        });
    });

    test('when XHR aborts then the plugin adds the error to the trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();
        xhr.abort();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            in_progress: false,
            name: 'sample.rum.aws.amazon.com',
            id: '0000000000000000',
            start_time: 0,
            trace_id: '1-0-000000000000000000000000',
            end_time: 0,
            subsegments: [
                {
                    cause: {
                        exceptions: [
                            {
                                type: 'XMLHttpRequest abort'
                            }
                        ]
                    }
                }
            ]
        });
    });

    test('when XHR aborts then the plugin adds the error to the http event', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();
        xhr.abort();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(HTTP_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            request: {
                method: 'GET'
            },
            error: {
                version: '1.0.0',
                type: 'XMLHttpRequest abort'
            }
        });
    });

    test('when default config is used then X-Amzn-Trace-Id header is not to the HTTP request', async () => {
        // Init
        let header: string;
        const config: PartialHttpPluginConfig = {};

        mock.get(/.*/, (req, res) => {
            header = req.header('X-Amzn-Trace-Id');
            return res
                .status(200)
                .body(JSON.stringify({ message: 'Hello World!' }));
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.setRequestHeader('Blarb', 'gurggle');
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(header).toEqual(null);
    });

    test('X-Amzn-Trace-Id header is added to the HTTP request', async () => {
        // Init
        let header: string;
        const config: PartialHttpPluginConfig = { addXRayTraceIdHeader: true };

        mock.get(/.*/, (req, res) => {
            header = req.header('X-Amzn-Trace-Id');
            return res
                .status(200)
                .body(JSON.stringify({ message: 'Hello World!' }));
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.setRequestHeader('Blarb', 'gurggle');
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(header).toEqual(
            'Root=1-0-000000000000000000000000;Parent=0000000000000000;Sampled=1'
        );
    });

    test('when trace is disabled then the plugin does not record a trace', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when session is not being recorded then the plugin does not record a trace', async () => {
        // Init
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
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(context);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when getSession returns undefined then the plugin does not record a trace', async () => {
        // Init
        const getSession: jest.MockedFunction<GetSession> = jest.fn();
        const context: PluginContext = {
            applicationId: 'b',
            applicationVersion: '1.0',
            config: { ...DEFAULT_CONFIG, ...{ enableXRay: true } },
            record,
            recordPageView,
            getSession
        };
        const config: PartialHttpPluginConfig = {
            logicalServiceName: 'sample.rum.aws.amazon.com',
            urlsToInclude: [/response\.json/],
            recordAllRequests: true
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(context);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when recordAllRequests is false then the plugin does record a request with status OK', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/],
            recordAllRequests: true
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when recordAllRequests is false then the plugin does not record a request with status OK', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/],
            recordAllRequests: false
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when recordAllRequests is false then the plugin records a request with status 500', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/],
            recordAllRequests: false
        };

        mock.get(/.*/, {
            status: 500,
            body: 'InternalError'
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when a url is excluded then the plugin does not record a request to that url', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            urlsToInclude: [/response\.json/],
            urlsToExclude: [/response\.json/]
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('all urls are included by default', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            recordAllRequests: true
        };

        mock.get(/.*/, {
            body: JSON.stringify({ message: 'Hello World!' })
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when a request is made to cognito or sts using default exclude list then the requests are not recorded', async () => {
        // Init
        const config: PartialHttpPluginConfig = {
            recordAllRequests: true
        };

        mock.get(/.*/, {
            body: JSON.stringify({})
        });

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOffContext);

        // Run
        const xhrCognito = new XMLHttpRequest();
        xhrCognito.open(
            'GET',
            'https://cognito-identity.us-west-2.amazonaws.com',
            true
        );
        xhrCognito.send();

        const xhrSts = new XMLHttpRequest();
        xhrSts.open('GET', 'https://sts.us-west-2.amazonaws.com', true);
        xhrSts.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when a url is relative then the subsegment name is location.hostname', async () => {
        // Init
        const config: PartialHttpPluginConfig = {};

        mock.get(/.*/, () => Promise.reject(new Error()));

        const plugin: XhrPlugin = new XhrPlugin(config);
        plugin.load(xRayOnContext);

        // Run
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './response.json', true);
        xhr.send();

        // Yield to the event queue so the event listeners can run
        await new Promise((resolve) => setTimeout(resolve, 0));

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        expect(record.mock.calls[0][0]).toEqual(XRAY_TRACE_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            subsegments: [
                {
                    name: 'us-east-1.console.aws.amazon.com'
                }
            ]
        });
    });
});
