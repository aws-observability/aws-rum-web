import { JsErrorPlugin } from '../JsErrorPlugin';
import { context, getSession, record } from '../../../test-utils/test-utils';
import { JS_ERROR_EVENT_TYPE } from '../../utils/constant';

declare global {
    namespace jest {
        interface Expect {
            toBePositive(): any;
        }
    }
}

expect.extend({
    toBePositive(recieved) {
        const pass = recieved > 0;
        if (pass) {
            return {
                message: () =>
                    `expected ${recieved} not to be a positive integer`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${recieved} to be a positive integer`,
                pass: false
            };
        }
    }
});

describe('JsErrorPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
        getSession.mockClear();
    });

    test('when a TypeError is thrown then the plugin records the name, message and stack', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="null.foo">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'TypeError',
                message: expect.stringContaining('Cannot read'),
                stack: expect.stringContaining('at HTMLButtonElement.onclick')
            })
        );
    });

    test('when an Error is thrown then the plugin records the name, message and stack', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="throw new Error(\'Something went wrong!\')">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'Error',
                message: 'Something went wrong!',
                lineno: expect.toBePositive(),
                colno: expect.toBePositive(),
                filename:
                    'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback',
                stack: expect.stringContaining('at HTMLButtonElement.onclick')
            })
        );
    });

    test('when an unhandled rejection is thrown then the plugin records the name, message', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        // JSDOM has not implemented PromiseRejectionEvent, so we 'extend'
        // Event to have the same functionality
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: 'Something went wrong!'
            })
        );
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'unhandledrejection',
                message: 'Something went wrong!'
            })
        );
    });

    test('when stackTraceLength is zero then the plugin does not record the stack trace', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="null.foo">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            stackTraceLength: 0
        });

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect((record.mock.calls[0][1] as any).stack).toEqual(undefined);
    });

    test('when an object without a name, message and stack is thrown then type, message and stack default values', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="throw {}"> Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            stackTraceLength: 150
        });

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            version: '1.0.0',
            type: 'error',
            message: expect.stringMatching(
                /(undefined|uncaught exception: {})/
            ),
            lineno: 0,
            colno: 0,
            filename:
                'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback'
        });
    });

    test('when a string is thrown then the plugin records the name and message', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="throw \'mystringerror\'">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            version: '1.0.0',
            type: 'mystringerror',
            message: 'mystringerror',
            lineno: 0,
            colno: 0,
            filename:
                'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback'
        });
    });

    test('when number is thrown then the plugin records the error as a string', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="throw 5">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            version: '1.0.0',
            type: '5',
            message: '5',
            lineno: 0,
            colno: 0,
            filename:
                'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback'
        });
    });

    test('when boolean is thrown then the plugin records the error as a string', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="throw false">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            version: '1.0.0',
            type: 'false',
            message: 'false',
            lineno: 0,
            colno: 0,
            filename:
                'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback'
        });
    });

    test('when plugin disabled then plugin does not record events', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="null.foo">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        plugin.disable();

        // So that the error doesn't cause the test to fail.
        window.addEventListener('error', () => ({}));

        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when plugin disabled then plugin does not record unhandled rejection events', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();
        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;

        // Run
        plugin.load(context);

        // So that the error doesn't cause the test to fail.
        window.addEventListener('error', () => ({}));
        plugin.disable();
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: 'Something went wrong!'
            })
        );

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when enabled then plugin records events', async () => {
        // Init
        document.body.innerHTML =
            '<button id="createJSError" onclick="null.foo">  Create JS Error </button>';
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        plugin.disable();
        plugin.enable();
        document.getElementById('createJSError').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when the application records a caught primitive then the plugin records the error', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        plugin.record('MyPrimitiveError');
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'MyPrimitiveError',
                message: 'MyPrimitiveError'
            })
        );
    });

    test('when the application records a caught Error object then the plugin records the error', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        plugin.record(new Error('Error message'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'Error',
                message: 'Error message'
            })
        );
    });

    test('when the application records a caught ErrorEvent object then the plugin records the error', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        const errorEvent = new ErrorEvent('error', {
            colno: 1,
            error: new Error('Something went wrong!'),
            filename: 'main.js',
            lineno: 2,
            message: 'This should be overwritten by the error message.'
        });

        // Run
        plugin.load(context);
        plugin.record(errorEvent);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'Error',
                message: 'Something went wrong!',
                filename: 'main.js',
                colno: 1,
                lineno: 2
            })
        );
    });

    test('when the application records a caught empty object then defaults are used', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        plugin.record({});
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'error',
                message: 'undefined'
            })
        );
    });

    test('when the application records a caught Error object then the fileName, lineNumber and columnNumber are used', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        plugin.record({
            name: 'Error',
            message: 'Something went wrong!',
            fileName: 'main.js',
            lineNumber: 1,
            columnNumber: 2
        });
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'Error',
                message: 'Something went wrong!',
                filename: 'main.js',
                lineno: 1,
                colno: 2
            })
        );
    });

    test('when unhandledrejection error event outputs empty object as reason then message is recorded as undefined', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        // JSDOM has not implemented PromiseRejectionEvent, so we 'extend'
        // Event to have the same functionality
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: {}
            })
        );
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'unhandledrejection',
                message: 'undefined'
            })
        );
    });

    test('when unhandledrejection error event outputs null object as reason then message is recorded as undefined', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        // JSDOM has not implemented PromiseRejectionEvent, so we 'extend'
        // Event to have the same functionality
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: null
            })
        );
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'unhandledrejection',
                message: 'undefined'
            })
        );
    });

    test('when unhandledrejection error event outputs error object as reason then error object is used', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);
        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        // JSDOM has not implemented PromiseRejectionEvent, so we 'extend'
        // Event to have the same functionality
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: {
                    name: 'TypeError',
                    message: 'NetworkError when attempting to fetch resource.',
                    stack: 't/n.fetch@mock_client.js:2:104522t/n.fetchWrapper'
                }
            })
        );
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(JS_ERROR_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                type: 'TypeError',
                message: 'NetworkError when attempting to fetch resource.',
                stack: 't/n.fetch@mock_client.js:2:104522t/n.fetchWrapper'
            })
        );
    });

    test('when record is used then errors are not passed to the ignore function', async () => {
        // Init
        const mockIgnore = jest.fn();
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            ignore: mockIgnore
        });

        // Run
        plugin.load(context);
        plugin.record({
            message: 'ResizeObserver loop limit exceeded'
        });
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
        expect(mockIgnore).not.toHaveBeenCalled();
    });

    test('by default ErrorEvents are not ignored', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);

        const ignoredError = new ErrorEvent('error', {
            error: new Error('Something went wrong!')
        });
        window.dispatchEvent(ignoredError);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('by default PromiseRejectionEvents are not ignored', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Run
        plugin.load(context);

        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: {
                    name: 'TypeError',
                    message: 'NetworkError when attempting to fetch resource.',
                    stack: 't/n.fetch@mock_client.js:2:104522t/n.fetchWrapper'
                }
            })
        );
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when errors are ignored then ErrorEvents are not recorded', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            ignore: (e) => !!(e as ErrorEvent).error // true
        });

        // Run
        plugin.load(context);

        const ignoredError = new ErrorEvent('error', {
            error: new Error('Something went wrong!')
        });
        window.dispatchEvent(ignoredError);
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when errors are ignored then PromiseRejectionEvents are not recorded', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            ignore: (e) => !!(e as PromiseRejectionEvent).reason // true
        });

        // Run
        plugin.load(context);

        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: {
                    name: 'TypeError',
                    message: 'NetworkError when attempting to fetch resource.',
                    stack: 't/n.fetch@mock_client.js:2:104522t/n.fetchWrapper'
                }
            })
        );
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when errors are explicitly not ignored then ErrorEvents are recorded', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            ignore: (e) => !(e as ErrorEvent).error // false
        });

        // Run
        plugin.load(context);

        const ignoredError = new ErrorEvent('error', {
            error: new Error('Something went wrong!')
        });
        window.dispatchEvent(ignoredError);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when errors are explicitly not ignored then PromiseRejectionEvents are recorded', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin({
            ignore: (e) => !(e as PromiseRejectionEvent).reason // false
        });

        // Run
        plugin.load(context);

        const promiseRejectionEvent: PromiseRejectionEvent = new Event(
            'unhandledrejection'
        ) as PromiseRejectionEvent;
        window.dispatchEvent(
            Object.assign(promiseRejectionEvent, {
                promise: new Promise(() => ({})),
                reason: {
                    name: 'TypeError',
                    message: 'NetworkError when attempting to fetch resource.',
                    stack: 't/n.fetch@mock_client.js:2:104522t/n.fetchWrapper'
                }
            })
        );
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when an Error has a nested cause chain then all causes are captured', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();
        const rootCause = new TypeError('null is not an object');
        const midError = new Error('Database query failed');
        (midError as any).cause = rootCause;
        const topError = new Error('Request handler failed');
        (topError as any).cause = midError;

        // Run
        plugin.load(context);
        plugin.record(topError);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        const event = record.mock.calls[0][1] as any;
        expect(event.cause).toHaveLength(2);
        expect(event.cause[0]).toMatchObject({
            type: 'Error',
            message: 'Database query failed'
        });
        expect(event.cause[1]).toMatchObject({
            type: 'TypeError',
            message: 'null is not an object'
        });
    });

    test('when an Error has a primitive cause then the cause message is the stringified value', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();
        const error = new Error('Something failed');
        (error as any).cause = 'root cause string';

        // Run
        plugin.load(context);
        plugin.record(error);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                cause: [{ message: 'root cause string' }]
            })
        );
    });

    test('when an Error has a circular cause reference then the chain stops without duplicates', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();
        const error = new Error('circular');
        (error as any).cause = error; // points back to itself

        // Run
        plugin.load(context);
        plugin.record(error);
        plugin.disable();

        // Assert — the first cause is recorded, then the cycle is detected
        expect(record).toHaveBeenCalledTimes(1);
        const event = record.mock.calls[0][1] as any;
        expect(event.cause).toHaveLength(1);
        expect(event.cause[0]).toMatchObject({
            type: 'Error',
            message: 'circular'
        });
    });

    test('when a cause is a plain object with no Error fields then a fallback message is used', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();
        const error = new Error('wrapper');
        (error as any).cause = { code: 'ENOENT', path: '/tmp/foo' };

        // Run
        plugin.load(context);
        plugin.record(error);
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        const event = record.mock.calls[0][1] as any;
        expect(event.cause).toHaveLength(1);
        expect(event.cause[0].message).toBeDefined();
        expect(event.cause[0].message.length).toBeGreaterThan(0);
    });

    test('when a cause chain exceeds the max depth then it is truncated', async () => {
        // Init
        const plugin: JsErrorPlugin = new JsErrorPlugin();

        // Build a chain of 8 errors (deeper than the max depth of 5)
        let current = new Error('cause-7');
        for (let i = 6; i >= 0; i--) {
            const next = new Error(`cause-${i}`);
            (next as any).cause = current;
            current = next;
        }
        const top = new Error('top');
        (top as any).cause = current;

        // Run
        plugin.load(context);
        plugin.record(top);
        plugin.disable();

        // Assert — only 5 causes should be captured
        expect(record).toHaveBeenCalledTimes(1);
        const event = record.mock.calls[0][1] as any;
        expect(event.cause).toHaveLength(5);
        expect(event.cause[0].message).toBe('cause-0');
        expect(event.cause[4].message).toBe('cause-4');
    });
});
