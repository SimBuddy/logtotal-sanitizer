import { describe, expect, it } from 'vitest';
import { bytesToHex, createHmacSha256, hexToBytes, sha256 } from '../src/core/hmac.js';

const textEncoder = new TextEncoder();

function hmac(keyHex: string, messageHex: string): string {
  return bytesToHex(createHmacSha256(hexToBytes(keyHex))(hexToBytes(messageHex)));
}

describe('sha256', () => {
  it('matches the known digest of "abc"', () => {
    expect(bytesToHex(sha256(textEncoder.encode('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the known digest of the empty string', () => {
    expect(bytesToHex(sha256(new Uint8Array(0)))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('createHmacSha256', () => {
  it('matches RFC 4231 test case 1', () => {
    expect(hmac('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', bytesToHex(textEncoder.encode('Hi There')))).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
  });

  it('matches RFC 4231 test case 2', () => {
    expect(
      hmac(bytesToHex(textEncoder.encode('Jefe')), bytesToHex(textEncoder.encode('what do ya want for nothing?'))),
    ).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });

  it('is deterministic for the same key and message', () => {
    const key = hexToBytes('00'.repeat(32));
    const message = textEncoder.encode('same input every time');
    const sign = createHmacSha256(key);
    expect(bytesToHex(sign(message))).toBe(bytesToHex(sign(message)));
  });
});
