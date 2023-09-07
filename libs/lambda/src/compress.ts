import { deflateSync, gunzipSync, gzipSync, inflateSync } from "node:zlib";

/**
 * The payload size above which we want to start compressing the response.
 * Default: 128 KiB
 */
const MIN_COMPRESSION_SIZE = 128 * 1024;

/**
 * Mapping of compression algorithms to their function calls.
 */
const compressionAlgorithms: Record<string, (buf: string) => Buffer> = {
  gzip: gzipSync,
  deflate: deflateSync,
};

/**
 * Pre-calculated entries for the compression algorithms.
 */
const compressionAlgorithmEntries = Object.entries(compressionAlgorithms);

/**
 * Mapping of decompression algorithms to their function calls.
 */
const decompressionAlgorithms: Record<string, (buf: Buffer) => Buffer> = {
  gzip: gunzipSync,
  deflate: inflateSync,
};

export interface CompressionResult {
  body: string;
  method?: string;
}

export function compress(body: string, acceptEncoding?: string): CompressionResult {
  // Default to using gzip if the body size is greater than the threshold.
  if (acceptEncoding === "" || body.length <= MIN_COMPRESSION_SIZE) {
    return { body };
  }

  const matchingAlgorithm = compressionAlgorithmEntries.find(
    (algorithm) => acceptEncoding?.includes(algorithm[0]),
  );

  // If accept-encoding is present and not empty, prioritize gzip over deflate.
  // Unfortunately API Gateway does not currently support Brotli :(
  if (matchingAlgorithm) {
    return {
      body: matchingAlgorithm[1](body).toString("base64"),
      method: matchingAlgorithm[0],
    };
  }

  return { body };
}

export function decompress(body: string, contentEncoding: string): string {
  return decompressionAlgorithms[contentEncoding](Buffer.from(body, "base64")).toString();
}
