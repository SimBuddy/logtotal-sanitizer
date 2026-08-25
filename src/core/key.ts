import type { KeyEncoding } from '../types';
import { DEFAULT_KEY_BYTES } from './constants';
import { InvalidKeyError } from './errors';
import { bytesToHex } from './hmac';

const HEX_PATTERN = /^(?:[0-9a-fA-F]{2})+$/;

/**
 * Generates a random hex-encoded key for token derivation.
 *
 * Persist the returned value if tokens have to stay comparable across runs or files; discard it if
 * they should not. There is no way to recover the original values from the tokens, with or without
 * the key — the key only determines which token a given value maps to.
 *
 * @param byteLength Key length in bytes, at least 16.
 * @throws {InvalidKeyError} When `byteLength` is too small or no secure random source is available.
 *
 * @example
 * ```ts
 * const key = generateKey();
 * const sanitizer = createSanitizer({ key });
 * ```
 */
export function generateKey(byteLength: number = DEFAULT_KEY_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength < 16) {
    throw new InvalidKeyError(`Key length must be an integer of at least 16 bytes, got ${byteLength}.`);
  }

  const source = globalThis.crypto;

  if (typeof source?.getRandomValues !== 'function') {
    throw new InvalidKeyError(
      'No secure random source available. Pass an explicit `key` or provide a Web Crypto implementation on globalThis.crypto.',
    );
  }

  const bytes = new Uint8Array(byteLength);
  source.getRandomValues(bytes);

  return bytesToHex(bytes);
}

export function assertKey(key: string, encoding: KeyEncoding): void {
  if (key.length === 0) {
    throw new InvalidKeyError('Key must not be empty.');
  }

  if (encoding === 'hex' && !HEX_PATTERN.test(key)) {
    throw new InvalidKeyError(
      'A hex key must contain an even number of hexadecimal characters. Pass `keyEncoding: "utf8"` for a passphrase.',
    );
  }
}
