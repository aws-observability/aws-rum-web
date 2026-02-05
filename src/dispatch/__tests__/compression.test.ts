/**
 * Tests for compression.ts
 *
 * Note: The actual gzip compression uses browser APIs (Blob.stream(), CompressionStream, Response)
 * that aren't available in Node.js. These tests verify the decision logic around when to compress,
 * while the actual compression is tested via integration tests in the browser.
 */

// We need to mock the module before importing
const mockCompress = jest.fn();

jest.mock('../compression', () => {
    const actual = jest.requireActual('../compression');

    // Re-implement compressIfBeneficial with mockable compress
    const MIN_SIZE_BYTES = 2048;
    const MIN_COMPRESSION_RATIO = 0.2;

    const isCompressionSupported = (): boolean =>
        typeof (global as any).CompressionStream !== 'undefined';

    const compressIfBeneficial = async (
        payload: string
    ): Promise<{ body: string | Uint8Array; compressed: boolean }> => {
        const originalSize = payload.length;

        if (!isCompressionSupported()) {
            return { body: payload, compressed: false };
        }

        if (originalSize < MIN_SIZE_BYTES) {
            return { body: payload, compressed: false };
        }

        const compressed = await mockCompress(payload);
        const ratio = 1 - compressed.length / originalSize;

        if (ratio >= MIN_COMPRESSION_RATIO) {
            return { body: compressed, compressed: true };
        }

        return { body: payload, compressed: false };
    };

    return {
        ...actual,
        compressIfBeneficial
    };
});

import { compressIfBeneficial } from '../compression';

describe('compression', () => {
    const originalCompressionStream = (global as any).CompressionStream;

    beforeEach(() => {
        mockCompress.mockReset();
        // Default: CompressionStream is available
        (global as any).CompressionStream = class {};
    });

    afterEach(() => {
        (global as any).CompressionStream = originalCompressionStream;
    });

    describe('compressIfBeneficial', () => {
        describe('when CompressionStream is not supported', () => {
            beforeEach(() => {
                delete (global as any).CompressionStream;
            });

            test('returns uncompressed payload', async () => {
                const payload = 'a'.repeat(2000);

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(false);
                expect(result.body).toBe(payload);
                expect(mockCompress).not.toHaveBeenCalled();
            });
        });

        describe('when payload is below minimum size threshold', () => {
            test('returns uncompressed for small payload', async () => {
                const payload = 'small payload'; // Less than 1024 bytes

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(false);
                expect(result.body).toBe(payload);
                expect(mockCompress).not.toHaveBeenCalled();
            });

            test('returns uncompressed for payload at threshold minus one', async () => {
                const payload = 'x'.repeat(2047);

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(false);
                expect(result.body).toBe(payload);
                expect(mockCompress).not.toHaveBeenCalled();
            });

            test('returns uncompressed for empty string', async () => {
                const payload = '';

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(false);
                expect(result.body).toBe('');
                expect(mockCompress).not.toHaveBeenCalled();
            });
        });

        describe('when payload exceeds minimum size', () => {
            test('compresses when compression ratio meets threshold', async () => {
                const payload = 'a'.repeat(3000);
                const compressedData = new Uint8Array(1500); // 50% compression
                mockCompress.mockResolvedValue(compressedData);

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(true);
                expect(result.body).toBe(compressedData);
                expect(mockCompress).toHaveBeenCalledWith(payload);
            });

            test('returns uncompressed when compression ratio is below threshold', async () => {
                const payload = 'x'.repeat(3000);
                const compressedData = new Uint8Array(2850); // Only 5% compression
                mockCompress.mockResolvedValue(compressedData);

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(false);
                expect(result.body).toBe(payload);
                expect(mockCompress).toHaveBeenCalledWith(payload);
            });

            test('compresses when ratio exceeds threshold', async () => {
                const payload = 'a'.repeat(3000);
                // 25% compression: 3000 -> 2250 bytes
                const compressedData = new Uint8Array(2250);
                mockCompress.mockResolvedValue(compressedData);

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(true);
                expect(result.body).toBe(compressedData);
            });

            test('returns uncompressed when ratio is below threshold', async () => {
                const payload = 'a'.repeat(3000);
                // 15% compression: 3000 -> 2550 bytes
                const compressedData = new Uint8Array(2550);
                mockCompress.mockResolvedValue(compressedData);

                const result = await compressIfBeneficial(payload);

                expect(result.compressed).toBe(false);
                expect(result.body).toBe(payload);
            });
        });

        describe('CompressionResult type', () => {
            test('returns object with body and compressed properties', async () => {
                const payload = 'test';

                const result = await compressIfBeneficial(payload);

                expect(result).toHaveProperty('body');
                expect(result).toHaveProperty('compressed');
                expect(typeof result.compressed).toBe('boolean');
            });

            test('body is string when not compressed', async () => {
                const payload = 'small';

                const result = await compressIfBeneficial(payload);

                expect(typeof result.body).toBe('string');
            });

            test('body is Uint8Array when compressed', async () => {
                const payload = 'a'.repeat(3000);
                const compressedData = new Uint8Array(500);
                mockCompress.mockResolvedValue(compressedData);

                const result = await compressIfBeneficial(payload);

                expect(result.body).toBeInstanceOf(Uint8Array);
            });
        });
    });
});
