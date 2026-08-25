import type { BlobLike, ReadableStreamLike, TextSource } from '../types';

const DEFAULT_CHUNK_BYTES = 4 * 1024 * 1024;

/**
 * Wraps a string as a source, split into fixed-size chunks.
 *
 * Useful for exercising the streaming path in tests and for feeding text that is already in memory
 * without copying it in one piece.
 */
export function fromString(text: string, chunkChars = DEFAULT_CHUNK_BYTES): TextSource {
  return {
    *[Symbol.iterator](): Iterator<string> {
      for (let offset = 0; offset < text.length; offset += chunkChars) {
        yield text.slice(offset, offset + chunkChars);
      }
    },
  };
}

/**
 * Reads a `Blob` or `File` as UTF-8 text, one chunk at a time.
 *
 * Multi-byte characters split across a chunk boundary are decoded correctly. Accepts any object
 * with `size`, `slice` and `arrayBuffer`, so browser `File`, browser `Blob` and Node's `Blob` all
 * work.
 *
 * @example
 * ```ts
 * const report = await sanitizer.sanitizeStream(fromBlob(file), toStringSink());
 * ```
 */
export function fromBlob(blob: BlobLike, chunkBytes = DEFAULT_CHUNK_BYTES): TextSource {
  return {
    async *[Symbol.asyncIterator](): AsyncIterator<string> {
      const decoder = new TextDecoder('utf-8');

      for (let offset = 0; offset < blob.size; offset += chunkBytes) {
        const slice = blob.slice(offset, Math.min(offset + chunkBytes, blob.size));
        const buffer = await slice.arrayBuffer();
        const text = decoder.decode(new Uint8Array(buffer), { stream: true });

        if (text.length > 0) {
          yield text;
        }
      }

      const tail = decoder.decode();

      if (tail.length > 0) {
        yield tail;
      }
    },
  };
}

/**
 * Reads a `ReadableStream` of text or bytes.
 *
 * Byte chunks are decoded as UTF-8 across chunk boundaries. Accepts web streams from `fetch`,
 * `Blob.stream()` and `node:stream/web`.
 */
export function fromWebStream(stream: ReadableStreamLike<string | Uint8Array>): TextSource {
  return {
    async *[Symbol.asyncIterator](): AsyncIterator<string> {
      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8');

      try {
        for (;;) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (value === undefined) {
            continue;
          }

          const text = typeof value === 'string' ? value : decoder.decode(value, { stream: true });

          if (text.length > 0) {
            yield text;
          }
        }

        const tail = decoder.decode();

        if (tail.length > 0) {
          yield tail;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
