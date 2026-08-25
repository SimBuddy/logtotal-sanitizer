import type { TextSink } from '../types';

/** A sink that accumulates everything in memory. */
export interface StringSink extends TextSink {
  /** Everything written so far, joined. */
  readonly text: string;
}

/**
 * Collects sanitized output into a string.
 *
 * Only appropriate when the output is known to fit in memory — the point of the streaming API is
 * usually to avoid that.
 *
 * @example
 * ```ts
 * const sink = toStringSink();
 * const report = await sanitizer.sanitizeStream(fromString(input), sink);
 * console.log(sink.text, report.totalMatches);
 * ```
 */
export function toStringSink(): StringSink {
  const chunks: string[] = [];

  return {
    write(chunk: string): void {
      chunks.push(chunk);
    },
    get text(): string {
      return chunks.join('');
    },
  };
}

/**
 * Sends sanitized output to a callback, one line at a time.
 *
 * The callback may return a promise; it is awaited before the next line is written, so
 * backpressure propagates to the source.
 */
export function toCallbackSink(
  onChunk: (chunk: string) => void | Promise<void>,
  onClose?: () => void | Promise<void>,
): TextSink {
  return {
    write: onChunk,
    ...(onClose ? { close: onClose } : {}),
  };
}

/** A sink that discards everything, for report-only runs. */
export function toNullSink(): TextSink {
  return { write: () => undefined };
}
