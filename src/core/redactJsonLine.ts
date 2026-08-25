import type { SanitizeRule, SanitizeSegment } from '../types';
import { isAllowed } from './allowlist';
import { buildReplacement, type RuleContext } from './compile';
import {
  redactLine,
  sliceContext,
  type RedactMatch,
  type RedactOptions,
  type RedactResult,
} from './redactLine';

const REPLACEMENT_TOKEN_RE = /<[A-Z][A-Z0-9]*:[0-9a-f]+>/g;

export function looksLikeJson(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && (trimmed.startsWith('{') || trimmed.startsWith('['));
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

function buildJsonKeyIndex(rules: SanitizeRule[]): Map<string, SanitizeRule> {
  const index = new Map<string, SanitizeRule>();

  for (const rule of rules) {
    for (const key of rule.jsonKeys ?? []) {
      const normalized = normalizeKey(key);

      if (!index.has(normalized)) {
        index.set(normalized, rule);
      }
    }
  }

  return index;
}

const jsonKeyIndexCache = new WeakMap<SanitizeRule[], Map<string, SanitizeRule>>();

function jsonKeyIndex(rules: SanitizeRule[]): Map<string, SanitizeRule> {
  const cached = jsonKeyIndexCache.get(rules);

  if (cached) {
    return cached;
  }

  const index = buildJsonKeyIndex(rules);
  jsonKeyIndexCache.set(rules, index);
  return index;
}

function mergeCounts(target: Record<string, number>, source: Record<string, number>): void {
  for (const [id, count] of Object.entries(source)) {
    target[id] = (target[id] ?? 0) + count;
  }
}

function highlightReplacements(text: string): SanitizeSegment[] {
  const segments: SanitizeSegment[] = [];
  let cursor = 0;

  REPLACEMENT_TOKEN_RE.lastIndex = 0;
  let match = REPLACEMENT_TOKEN_RE.exec(text);

  while (match !== null) {
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index), changed: false });
    }

    segments.push({ text: match[0], changed: true });
    cursor = match.index + match[0].length;
    match = REPLACEMENT_TOKEN_RE.exec(text);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), changed: false });
  }

  return segments.length > 0 ? segments : [{ text, changed: false }];
}

export function redactJsonLine(
  line: string,
  ctx: RuleContext,
  options: RedactOptions = {},
): RedactResult | null {
  const terminatorMatch = /(\r\n|\r|\n)$/.exec(line);
  const terminator = terminatorMatch ? terminatorMatch[0] : '';
  const content = terminator ? line.slice(0, -terminator.length) : line;

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const withSegments = options.withSegments ?? false;
  const withMatches = options.withMatches ?? false;
  const keyIndex = jsonKeyIndex(ctx.rules);
  const counts: Record<string, number> = {};
  const matches: RedactMatch[] = [];

  const contextFor = (value: string): Partial<RedactMatch> => {
    if (ctx.contextChars <= 0) {
      return {};
    }

    const index = content.indexOf(value);

    if (index < 0) {
      return { contextBefore: '', contextAfter: '' };
    }

    return sliceContext(content, index, value.length, ctx.contextChars);
  };

  const redactValue = (value: unknown, key?: string): unknown => {
    if (typeof value === 'string') {
      const fieldRule = key === undefined ? undefined : keyIndex.get(normalizeKey(key));

      if (fieldRule) {
        if (isAllowed(ctx.allow, fieldRule.id, value)) {
          return value;
        }

        const replacement = buildReplacement(ctx, fieldRule.id, value);
        counts[fieldRule.id] = (counts[fieldRule.id] ?? 0) + 1;

        if (withMatches) {
          matches.push({
            ruleId: fieldRule.id,
            original: value,
            replacement,
            ...contextFor(value),
          });
        }

        return replacement;
      }

      const result = redactLine(value, ctx, { withMatches });
      mergeCounts(counts, result.counts);

      if (withMatches) {
        for (const match of result.matches) {
          matches.push({ ...match, ...contextFor(match.original) });
        }
      }

      return result.output;
    }

    if (Array.isArray(value)) {
      return value.map((item: unknown) => redactValue(item));
    }

    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};

      for (const [entryKey, entryValue] of Object.entries(value)) {
        out[entryKey] = redactValue(entryValue, entryKey);
      }

      return out;
    }

    return value;
  };

  const output = JSON.stringify(redactValue(parsed)) + terminator;

  if (!withSegments) {
    return { output, counts, matches };
  }

  const preview = redactLine(line, ctx, { withSegments: true });

  return {
    output,
    counts,
    matches,
    segments: {
      before: preview.segments?.before ?? [{ text: line, changed: false }],
      after: highlightReplacements(output),
    },
  };
}
