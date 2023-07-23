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
 * Mapping of decompression algorithms to their function calls.
 */
const decompressionAlgorithms: Record<string, (buf: Buffer) => Buffer> = {
  gzip: gunzipSync,
  deflate: inflateSync,
};

export const compress = (
  body: string,
  acceptEncoding?: string,
): {
  body: string;
  method?: string;
} => {
  if (body.length > MIN_COMPRESSION_SIZE) {
    if (acceptEncoding !== undefined) {
      if (acceptEncoding !== "") {
        // If accept-encoding is present and not empty,
        // prioritize gzip over deflate.
        // Unfortunately API Gateway does not currently support Brotli :(
        for (const [name, func] of Object.entries(compressionAlgorithms)) {
          if (acceptEncoding.includes(name)) {
            return {
              body: func(body).toString("base64"),
              method: name,
            };
          }
        }
      }
    } else {
      // Otherwise, we default to using gzip if
      // the body size is greater than the threshold.
      return {
        body: gzipSync(body).toString("base64"),
        method: "gzip",
      };
    }
  }
  return { body };
};

export const decompress = (body: string, contentEncoding: string): string =>
  decompressionAlgorithms[contentEncoding](Buffer.from(body, "base64")).toString();
