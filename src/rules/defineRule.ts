import type { SanitizeRule } from '../types';
import { validateRule } from './validateRule';

/**
 * Validates a rule and returns it unchanged.
 *
 * Use it instead of a plain object literal: the shape is checked once, at module load, so a typo in
 * a pattern surfaces immediately rather than as a silent miss during a run.
 *
 * @throws {InvalidRuleError} When the rule is malformed.
 *
 * @example
 * ```ts
 * const ticketRule = defineRule({
 *   id: 'acme_ticket',
 *   label: 'Support ticket IDs',
 *   description: 'Internal ticket references such as ACME-123456.',
 *   mode: 'pseudo',
 *   token: 'TICKET',
 *   patterns: ['(?:\\bACME-\\d{6}\\b)'],
 *   jsonKeys: ['ticketId'],
 * });
 *
 * const sanitizer = createSanitizer({ extraRules: [ticketRule] });
 * ```
 */
export function defineRule(rule: SanitizeRule): SanitizeRule {
  return validateRule(rule);
}
