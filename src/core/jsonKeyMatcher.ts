import type { SanitizeRule } from '../types';

const RESOLVE_CACHE_LIMIT = 10_000;

export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_.\s]/g, '');
}

/** Empty and `-` values are placeholders (Windows events use `-` for "not applicable"). */
export function shouldPreserveJsonValue(value: string): boolean {
  return value.length === 0 || value === '-';
}

export interface JsonKeyMatcher {
  /**
   * Finds the rule that owns a field by name. `parent` is the key of the enclosing object, so a
   * nested `{"user": {"name": …}}` resolves like a flat `user_name`. A dotted key such as
   * `source.ip` supplies its own parent.
   */
  resolve(key: string, parent?: string): SanitizeRule | undefined;
}

interface KeyTables {
  exact: Map<string, SanitizeRule>;
  contains: Array<{ fragment: string; rule: SanitizeRule }>;
}

function buildTables(rules: SanitizeRule[]): KeyTables {
  const exact = new Map<string, SanitizeRule>();
  const contains: Array<{ fragment: string; rule: SanitizeRule }> = [];

  for (const rule of rules) {
    for (const key of rule.jsonKeys ?? []) {
      const normalized = normalizeKey(key);

      if (!exact.has(normalized)) {
        exact.set(normalized, rule);
      }
    }

    for (const fragment of rule.jsonKeyContains ?? []) {
      contains.push({ fragment: normalizeKey(fragment), rule });
    }
  }

  return { exact, contains };
}

function lastSegment(key: string): string {
  const dot = key.lastIndexOf('.');
  return dot === -1 ? key : key.slice(dot + 1);
}

function resolveUncached(
  tables: KeyTables,
  key: string,
  parent: string | undefined,
): SanitizeRule | null {
  const dot = key.lastIndexOf('.');
  const leaf = normalizeKey(dot === -1 ? key : key.slice(dot + 1));
  const parentRaw = dot === -1 ? parent : key.slice(0, dot);

  if (leaf.length === 0) {
    return null;
  }

  // The scoped name goes first: `source.address` is an IP and `email.address` a mailbox, while a
  // bare `address` is a street address.
  if (parentRaw !== undefined) {
    const scoped = tables.exact.get(normalizeKey(lastSegment(parentRaw)) + leaf);

    if (scoped) {
      return scoped;
    }
  }

  const exact = tables.exact.get(leaf);

  if (exact) {
    return exact;
  }

  for (const entry of tables.contains) {
    if (leaf.includes(entry.fragment)) {
      return entry.rule;
    }
  }

  return null;
}

function buildMatcher(rules: SanitizeRule[]): JsonKeyMatcher {
  const tables = buildTables(rules);
  // Field names repeat on every record, so resolution is memoized; the bound keeps inputs with
  // generated key names from growing it without limit.
  const cache = new Map<string, SanitizeRule | null>();

  return {
    resolve(key, parent) {
      const cacheKey = parent === undefined ? key : `${parent}\u0000${key}`;
      let rule = cache.get(cacheKey);

      if (rule === undefined) {
        rule = resolveUncached(tables, key, parent);

        if (cache.size >= RESOLVE_CACHE_LIMIT) {
          cache.clear();
        }

        cache.set(cacheKey, rule);
      }

      return rule ?? undefined;
    },
  };
}

const matcherCache = new WeakMap<SanitizeRule[], JsonKeyMatcher>();

export function jsonKeyMatcher(rules: SanitizeRule[]): JsonKeyMatcher {
  const cached = matcherCache.get(rules);

  if (cached) {
    return cached;
  }

  const matcher = buildMatcher(rules);
  matcherCache.set(rules, matcher);
  return matcher;
}
