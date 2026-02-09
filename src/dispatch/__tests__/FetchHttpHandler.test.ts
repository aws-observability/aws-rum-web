import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { FetchHttpHandler } from '../FetchHttpHandler';

// jsdom does not provide Request — polyfill for tests
global.Request = jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method,
    headers: options?.headers,
    body: options?.body
})) as any;

const createRequest = (overrides: Partial<HttpRequest> = {}): HttpRequest => {
    return new HttpRequest({
        method: 'POST',
        protocol: 'https:',
        hostname: 'example.com',
        path: '/appmonitors/test',
        headers: { 'content-type': 'application/json' },
        body: '{"test":true}',
        ...overrides
    });
};

const createMockFetch = (overrides: Record<string, any> = {}) => {
    const headers = new Headers({ 'x-amzn-requestid': '123' });
    return jest.fn().mockResolvedValue({
        status: 200,
        headers,
        body: 'stream-body',
        blob: jest.fn().mockResolvedValue(new Blob(['blob-body'])),
        ...overrides
    });
};

describe('FetchHttpHandler', () => {
    beforeEach(() => {
        (global.Request as unknown as jest.Mock).mockClear();
    });

    test('when handle is called then fetch is invoked with correct URL', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await handler.handle(createRequest());

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const req = (global.Request as unknown as jest.Mock).mock.calls[0];
        expect(req[0]).toBe('https://example.com/appmonitors/test');
    });

    test('when request has port then URL includes port', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await handler.handle(
            createRequest({ hostname: 'localhost', port: 8080 })
        );

        const req = (global.Request as unknown as jest.Mock).mock.calls[0];
        expect(req[0]).toBe('https://localhost:8080/appmonitors/test');
    });

    test('when request has query params then URL includes query string', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await handler.handle(
            createRequest({ query: { foo: 'bar', baz: '1' } })
        );

        const url: string = (global.Request as unknown as jest.Mock).mock
            .calls[0][0];
        expect(url).toContain('?');
        expect(url).toContain('foo=bar');
        expect(url).toContain('baz=1');
    });

    test('when method is GET then body is undefined', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await handler.handle(
            createRequest({ method: 'GET', body: 'should-be-dropped' })
        );

        const opts = (global.Request as unknown as jest.Mock).mock.calls[0][1];
        expect(opts.body).toBeUndefined();
        expect(opts.method).toBe('GET');
    });

    test('when method is HEAD then body is undefined', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await handler.handle(
            createRequest({ method: 'HEAD', body: 'should-be-dropped' })
        );

        const opts = (global.Request as unknown as jest.Mock).mock.calls[0][1];
        expect(opts.body).toBeUndefined();
    });

    test('when method is POST then body is included', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await handler.handle(createRequest({ body: 'payload' }));

        const opts = (global.Request as unknown as jest.Mock).mock.calls[0][1];
        expect(opts.body).toBe('payload');
    });

    test('when response has streaming body then body is returned directly', async () => {
        const mockFetch = createMockFetch({ body: 'stream-data' });
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        const { response } = await handler.handle(createRequest());

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('stream-data');
    });

    test('when response has no streaming body then blob fallback is used', async () => {
        const mockBlob = new Blob(['fallback']);
        const mockFetch = createMockFetch({
            body: undefined,
            blob: jest.fn().mockResolvedValue(mockBlob)
        });
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        const { response } = await handler.handle(createRequest());

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe(mockBlob);
    });

    test('when response has headers then they are transformed to plain object', async () => {
        const mockFetch = createMockFetch({
            headers: new Headers({
                'content-type': 'application/json',
                'x-custom': 'value'
            })
        });
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        const { response } = await handler.handle(createRequest());

        expect(response.headers['content-type']).toBe('application/json');
        expect(response.headers['x-custom']).toBe('value');
    });

    test('when abortSignal is already aborted then rejects immediately', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });
        const abortSignal = { aborted: true } as AbortSignal;

        await expect(
            handler.handle(createRequest(), { abortSignal })
        ).rejects.toMatchObject({
            name: 'AbortError',
            message: 'Request aborted'
        });

        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('when abortSignal fires during request then rejects with AbortError', async () => {
        let capturedOnAbort: (() => void) | undefined;
        const abortSignal = {
            aborted: false,
            set onabort(fn: () => void) {
                capturedOnAbort = fn;
            }
        } as unknown as AbortSignal;

        // Fetch that never resolves — simulates slow request
        const mockFetch = jest.fn(
            () =>
                new Promise<Response>(() => {
                    setTimeout(() => capturedOnAbort?.(), 0);
                })
        );
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await expect(
            handler.handle(createRequest(), { abortSignal })
        ).rejects.toMatchObject({
            name: 'AbortError',
            message: 'Request aborted'
        });
    });

    test('when requestTimeout is set and fetch is slow then rejects with TimeoutError', async () => {
        jest.useFakeTimers();

        const mockFetch = jest.fn(
            () =>
                new Promise<Response>(() => {
                    // Never resolves - simulates slow fetch
                })
        );
        const handler = new FetchHttpHandler({
            fetchFunction: mockFetch,
            requestTimeout: 50
        });

        const promise = handler.handle(createRequest());
        jest.advanceTimersByTime(50);

        await expect(promise).rejects.toMatchObject({
            name: 'TimeoutError'
        });

        jest.useRealTimers();
    });

    test('when requestTimeout is 0 then no timeout is applied', async () => {
        const mockFetch = createMockFetch();
        const handler = new FetchHttpHandler({
            fetchFunction: mockFetch,
            requestTimeout: 0
        });

        const { response } = await handler.handle(createRequest());

        expect(response.statusCode).toBe(200);
    });

    test('when fetch rejects then error propagates', async () => {
        const mockFetch = jest
            .fn()
            .mockRejectedValue(new Error('Network error'));
        const handler = new FetchHttpHandler({ fetchFunction: mockFetch });

        await expect(handler.handle(createRequest())).rejects.toThrow(
            'Network error'
        );
    });
});
