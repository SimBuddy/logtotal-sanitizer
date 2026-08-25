import type { KeyEncoding, SanitizeRule } from '../types';
import { MASK_TOKEN_PREFIX } from './constants';
import { bytesToHex, createHmacSha256, hexToBytes } from './hmac';

const TOKEN_HEX_LENGTH = 16;
const TOKEN_BYTES = TOKEN_HEX_LENGTH / 2;

const textEncoder = new TextEncoder();

export type Pseudonymizer = (ruleId: string, value: string) => string;

export function createPseudonymizer(key: string, encoding: KeyEncoding): Pseudonymizer {
  const keyBytes = encoding === 'utf8' ? textEncoder.encode(key) : hexToBytes(key);
  const sign = createHmacSha256(keyBytes);
  const cache = new Map<string, string>();

  return (ruleId, value) => {
    const cacheKey = `${ruleId}\u0000${value}`;
    const cached = cache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const digest = sign(textEncoder.encode(cacheKey));
    const token = bytesToHex(digest.subarray(0, TOKEN_BYTES));

    cache.set(cacheKey, token);
    return token;
  };
}

export function replacementPrefix(rule: SanitizeRule): string {
  if (rule.mode === 'mask') {
    return MASK_TOKEN_PREFIX;
  }

  return rule.token ?? rule.id.toUpperCase();
}
