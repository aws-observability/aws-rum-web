import { InternalLogger } from '../utils/InternalLogger';

// Compression thresholds - hardcoded for now
// To make configurable: add to CompressionStrategy type and pass as parameter
const MIN_SIZE_BYTES = 1024; // Only compress payloads larger than 1KB
const MIN_COMPRESSION_RATIO = 0.2; // Only use compressed if at least 20% smaller

export type CompressionResult = {
    body: string | Uint8Array;
    compressed: boolean;
};

const isCompressionSupported = (): boolean =>
    typeof CompressionStream !== 'undefined';

const compress = async (payload: string): Promise<Uint8Array> => {
    const stream = new Blob([payload])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
};

export const compressIfBeneficial = async (
    payload: string
): Promise<CompressionResult> => {
    const originalSize = payload.length;

    if (!isCompressionSupported()) {
        InternalLogger.debug(
            'CompressionStream not supported, skipping compression'
        );
        return { body: payload, compressed: false };
    }

    if (originalSize < MIN_SIZE_BYTES) {
        InternalLogger.debug(
            `Payload size ${originalSize}B below threshold ${MIN_SIZE_BYTES}B, skipping compression`
        );
        return { body: payload, compressed: false };
    }

    const compressed = await compress(payload);
    const ratio = 1 - compressed.length / originalSize;

    if (ratio >= MIN_COMPRESSION_RATIO) {
        InternalLogger.debug(
            `Compressed ${originalSize}B -> ${compressed.length}B (${(
                ratio * 100
            ).toFixed(1)}% reduction)`
        );
        return { body: compressed, compressed: true };
    }

    InternalLogger.debug(
        `Compression ratio ${(ratio * 100).toFixed(1)}% below threshold ${
            MIN_COMPRESSION_RATIO * 100
        }%, skipping`
    );
    return { body: payload, compressed: false };
};
