import { compressIfBeneficial } from '@aws-rum/web-core/dispatch/compression';
import * as zlib from 'zlib';

const setupCompressionPolyfill = () => {
    (global as any).CompressionStream = function () {};

    // Blob.stream() returns an object with pipeThrough that produces compressed data
    // Override the compress function's pipeline:
    // Source does: new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'))
    // then: new Uint8Array(await new Response(stream).arrayBuffer())
    //
    // jsdom's Blob lacks stream()/text()/arrayBuffer(), so we intercept at Blob construction
    const OrigBlob = global.Blob;
    (global as any).__capturedPayload = '';
    (global as any).Blob = function (parts: any[]) {
        (global as any).__capturedPayload = parts.join('');
        return {
            stream() {
                return {
                    pipeThrough() {
                        return '__compressed_stream__';
                    }
                };
            }
        };
    };

    const OrigResponse = global.Response;
    (global as any).Response = class {
        async arrayBuffer() {
            const payload = (global as any).__capturedPayload;
            const compressed = zlib.gzipSync(Buffer.from(payload));
            return compressed.buffer.slice(
                compressed.byteOffset,
                compressed.byteOffset + compressed.byteLength
            );
        }
    };
};

describe('compression', () => {
    const originalCS = (global as any).CompressionStream;
    const OrigBlob = global.Blob;
    const OrigResponse = global.Response;

    beforeEach(() => {
        setupCompressionPolyfill();
    });

    afterEach(() => {
        global.Blob = OrigBlob;
        global.Response = OrigResponse;
        if (originalCS) {
            (global as any).CompressionStream = originalCS;
        } else {
            delete (global as any).CompressionStream;
        }
    });

    test('when CompressionStream is not supported then returns uncompressed', async () => {
        delete (global as any).CompressionStream;
        const payload = 'a'.repeat(3000);
        const result = await compressIfBeneficial(payload);
        expect(result.compressed).toBe(false);
        expect(result.body).toBe(payload);
    });

    test('when payload is below minimum size then returns uncompressed', async () => {
        const result = await compressIfBeneficial('small');
        expect(result.compressed).toBe(false);
        expect(result.body).toBe('small');
    });

    test('when payload is at threshold minus one then returns uncompressed', async () => {
        const payload = 'x'.repeat(2047);
        const result = await compressIfBeneficial(payload);
        expect(result.compressed).toBe(false);
        expect(result.body).toBe(payload);
    });

    test('when payload is empty then returns uncompressed', async () => {
        const result = await compressIfBeneficial('');
        expect(result.compressed).toBe(false);
        expect(result.body).toBe('');
    });

    test('when payload is large and compressible then returns compressed', async () => {
        const payload = '{"key":"value","data":"test"}'.repeat(200);
        const result = await compressIfBeneficial(payload);
        expect(result.compressed).toBe(true);
        expect(result.body).toBeInstanceOf(Uint8Array);
        expect((result.body as Uint8Array).length).toBeLessThan(
            payload.length * 0.8
        );
    });

    test('when payload is at exact threshold and compressible then returns compressed', async () => {
        const payload = '{"a":"b"}'.repeat(228);
        const result = await compressIfBeneficial(payload);
        expect(result.compressed).toBe(true);
        expect(result.body).toBeInstanceOf(Uint8Array);
    });

    test('result has body and compressed properties', async () => {
        const result = await compressIfBeneficial('test');
        expect(result).toHaveProperty('body');
        expect(result).toHaveProperty('compressed');
        expect(typeof result.compressed).toBe('boolean');
    });
});
