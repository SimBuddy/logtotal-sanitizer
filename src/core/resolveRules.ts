import { getBuiltinRule } from '../rules/registry';
import { validateRule } from '../rules/validateRule';
import type { RuleSelector, SanitizeRule } from '../types';
import { UnknownRuleError } from './errors';

function toRule(selector: RuleSelector): SanitizeRule {
  if (typeof selector === 'string') {
    const builtin = getBuiltinRule(selector);

    if (!builtin) {
      throw new UnknownRuleError(
        `Unknown rule "${selector}". Pass a rule object for custom rules, or one of the built-in identifiers.`,
      );
    }

    return builtin;
  }

  return validateRule(selector);
}

export function resolveRules(
  selectors: readonly RuleSelector[],
  extraRules: readonly SanitizeRule[] = [],
): SanitizeRule[] {
  const resolved: SanitizeRule[] = [];
  const positions = new Map<string, number>();

  for (const selector of [...selectors, ...extraRules]) {
    const rule = toRule(selector);
    const existing = positions.get(rule.id);

    if (existing === undefined) {
      positions.set(rule.id, resolved.length);
      resolved.push(rule);
    } else {
      resolved[existing] = rule;
    }
  }

  return resolved;
}
