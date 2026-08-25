import { describe, expect, it } from 'vitest';
import { compileRules } from '../src/core/compile.js';
import { type SanitizeRule } from '../src/types.js';

const ruleWithAggressive: SanitizeRule = {
  id: 'ips',
  label: 'IP addresses',
  description: '',
  mode: 'pseudo',
  token: 'IP',
  patterns: ['(?:\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)'],
  aggressivePatterns: ['(?:\\bwide-\\w+\\b)'],
};

describe('compileRules', () => {
  it('omits aggressivePatterns by default', () => {
    const regex = compileRules([ruleWithAggressive], false);
    expect(regex!.test('10.0.0.1')).toBe(true);
    regex!.lastIndex = 0;
    expect(regex!.test('wide-thing')).toBe(false);
  });

  it('includes aggressivePatterns when aggressive is true', () => {
    const regex = compileRules([ruleWithAggressive], true);
    regex!.lastIndex = 0;
    expect(regex!.test('wide-thing')).toBe(true);
  });

  it('does not throw on a duplicate id; createSanitizer replaces by identifier', () => {
    expect(() => compileRules([ruleWithAggressive, { ...ruleWithAggressive }], false)).not.toThrow();
  });

  it('throws on an invalid id', () => {
    expect(() => compileRules([{ ...ruleWithAggressive, id: 'not-valid' }], false)).toThrow(
      /compile|capture group|identifier/i,
    );
  });
});
