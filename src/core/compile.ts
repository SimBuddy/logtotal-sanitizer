import type { SanitizeRule } from '../types';
import type { AllowList } from './allowlist';
import { InvalidRuleError } from './errors';
import { replacementPrefix, type Pseudonymizer } from './pseudonymize';

export interface RuleContext {
  compiled: RegExp | null;
  rules: SanitizeRule[];
  ruleIds: string[];
  rulesById: Map<string, SanitizeRule>;
  prefixById: Map<string, string>;
  pseudonymize: Pseudonymizer;
  allow: AllowList;
  contextChars: number;
  json: boolean;
}

export function compileRules(rules: SanitizeRule[], aggressive: boolean): RegExp | null {
  const parts = rules
    .map((rule) => ({
      id: rule.id,
      patterns: aggressive ? [...rule.patterns, ...(rule.aggressivePatterns ?? [])] : rule.patterns,
    }))
    .filter(({ patterns }) => patterns.length > 0)
    .map(({ id, patterns }) => `(?<${id}>${patterns.join('|')})`);

  if (parts.length === 0) {
    return null;
  }

  try {
    return new RegExp(parts.join('|'), 'gu');
  } catch (cause) {
    throw new InvalidRuleError(`Failed to compile the combined rule pattern: ${String(cause)}`);
  }
}

export interface RuleContextInput {
  rules: SanitizeRule[];
  aggressive: boolean;
  pseudonymize: Pseudonymizer;
  allow: AllowList;
  contextChars: number;
  json: boolean;
}

export function createRuleContext(input: RuleContextInput): RuleContext {
  const { rules } = input;

  return {
    compiled: compileRules(rules, input.aggressive),
    rules,
    ruleIds: rules.map((rule) => rule.id),
    rulesById: new Map(rules.map((rule) => [rule.id, rule])),
    prefixById: new Map(rules.map((rule) => [rule.id, replacementPrefix(rule)])),
    pseudonymize: input.pseudonymize,
    allow: input.allow,
    contextChars: input.contextChars,
    json: input.json,
  };
}

export function buildReplacement(ctx: RuleContext, ruleId: string, value: string): string {
  return `<${ctx.prefixById.get(ruleId) ?? ruleId.toUpperCase()}:${ctx.pseudonymize(ruleId, value)}>`;
}
