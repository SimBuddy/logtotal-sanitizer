import type { BuiltinRuleId, SanitizeRule } from '../types';
import { geoLocationRule } from './definitions/geoLocation';
import { govIdentifiersRule } from './definitions/govIdentifiers';
import { healthInfoRule } from './definitions/healthInfo';
import { homePathsRule } from './definitions/homePaths';
import { hostnamesRule } from './definitions/hostnames';
import { ipAddressesRule } from './definitions/ipAddresses';
import { paymentInfoRule } from './definitions/paymentInfo';
import { phoneNumbersRule } from './definitions/phoneNumbers';
import { secretsRule } from './definitions/secrets';
import { sessionCookiesRule } from './definitions/sessionCookies';
import { usersRule } from './definitions/users';

/**
 * Every rule shipped with this package, in default priority order.
 *
 * Order matters: when two rules could match at the same position, the one listed first wins.
 * Credential-shaped rules come first so a token is not partially consumed by a broader
 * identifier rule.
 */
export const builtinRules: readonly SanitizeRule[] = [
  secretsRule,
  sessionCookiesRule,
  paymentInfoRule,
  govIdentifiersRule,
  healthInfoRule,
  phoneNumbersRule,
  ipAddressesRule,
  hostnamesRule,
  usersRule,
  geoLocationRule,
  homePathsRule,
];

/** Identifiers of {@link builtinRules}, in the same order. */
export const builtinRuleIds: readonly BuiltinRuleId[] = builtinRules.map(
  (rule) => rule.id as BuiltinRuleId,
);

const builtinsById = new Map<string, SanitizeRule>(builtinRules.map((rule) => [rule.id, rule]));

/**
 * Looks up a built-in rule by identifier.
 *
 * @returns The rule, or `undefined` when the identifier is not built in.
 */
export function getBuiltinRule(id: string): SanitizeRule | undefined {
  return builtinsById.get(id);
}
