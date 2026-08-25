import { ALWAYS_REDACT_RULE_ID, ALWAYS_REDACT_TOKEN } from '../core/constants';
import { InvalidOptionError } from '../core/errors';
import type { AlwaysRedactOptions, SanitizeRule } from '../types';

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeValues(values: readonly string[]): string[] {
  const unique = new Set(values.map((value) => value.trim()).filter((value) => value.length > 0));

  return [...unique].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function normalizePatterns(patterns: readonly (string | RegExp)[]): string[] {
  return patterns.map((pattern) => {
    const source = typeof pattern === 'string' ? pattern : pattern.source;

    try {
      new RegExp(source, 'u');
    } catch (cause) {
      throw new InvalidOptionError(
        `alwaysRedact.patterns contains an invalid regular expression: ${String(cause)}`,
      );
    }

    return `(?:${source})`;
  });
}

export function createAlwaysRedactRule(
  options: AlwaysRedactOptions | undefined,
): SanitizeRule | null {
  if (!options) {
    return null;
  }

  const patterns = [
    ...normalizeValues(options.values ?? []).map((value) => `(?:${escapeRegExp(value)})`),
    ...normalizePatterns(options.patterns ?? []),
  ];

  if (patterns.length === 0) {
    return null;
  }

  return {
    id: options.ruleId ?? ALWAYS_REDACT_RULE_ID,
    label: 'Always redacted',
    description: 'Values and patterns the caller marked as always sensitive.',
    mode: options.mode ?? 'pseudo',
    token: options.token ?? ALWAYS_REDACT_TOKEN,
    patterns,
  };
}
