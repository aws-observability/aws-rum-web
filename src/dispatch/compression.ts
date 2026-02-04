import { InternalLogger } from '../utils/InternalLogger';

/**
 * Gzip compression for RUM payloads using the browser's CompressionStream API.
 *
 * Strategy:
 * - RUM payloads are JSON with repeated keys/structure, typically achieving 60-80% compression
 * - We compress opportunistically: attempt compression, then verify it's worthwhile
 * - This "compress then check" approach is efficient since CompressionStream is fast (~1-2ms for small payloads)
 *
 * Safety checks:
 * - MIN_SIZE_BYTES: Skip compression for small payloads where overhead outweighs benefit
 * (gzip adds ~20 byte header, so compressing tiny payloads can increase size)
 * - MIN_COMPRESSION_RATIO: Only use compressed output if we achieve meaningful reduction
 * (protects against edge cases like already-compressed or high-entropy data)
 */

// Only compress payloads larger than 2KB - smaller payloads have minimal absolute savings
// and gzip header overhead (~20 bytes) becomes proportionally significant
// At 2KB threshold: compresses payloads with ~10+ RUM events
const MIN_SIZE_BYTES = 2048;

// Require at least 20% size reduction to use compressed output
// This threshold ensures compression is worthwhile after accounting for:
// - CPU cost of decompression on the server
// - Risk of compressed size being larger for incompressible data
const MIN_COMPRESSION_RATIO = 0.2;

export type CompressionResult = {
    body: string | Uint8Array;
    compressed: boolean;
};

/** Check if browser supports CompressionStream API (Chrome 80+, Edge 80+, Safari 16.4+) */
const isCompressionSupported = (): boolean =>
    typeof CompressionStream !== 'undefined';

/** Compress payload using gzip via streaming API */
const compress = async (payload: string): Promise<Uint8Array> => {
    const stream = new Blob([payload])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
};

/**
 * Compress payload if compression would be beneficial.
 * Returns original payload if compression is unsupported, payload is too small,
 * or compression ratio doesn't meet threshold.
 */
export const compressIfBeneficial = async (
    payload: string
): Promise<CompressionResult> => {
    const originalSize = payload.length;

    // Guard: browser support check
    if (!isCompressionSupported()) {
        InternalLogger.debug(
            'CompressionStream not supported, skipping compression'
        );
        return { body: payload, compressed: false };
    }

    // Guard: minimum size check - skip small payloads where overhead outweighs benefit
    if (originalSize < MIN_SIZE_BYTES) {
        InternalLogger.debug(
            `Payload size ${originalSize}B below threshold ${MIN_SIZE_BYTES}B, skipping compression`
        );
        return { body: payload, compressed: false };
    }

    // Attempt compression and measure actual ratio
    const compressed = await compress(payload);
    const ratio = 1 - compressed.length / originalSize;

    // Guard: minimum ratio check - only use compressed if meaningfully smaller
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
