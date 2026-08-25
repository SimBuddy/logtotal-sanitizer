import type { SanitizeSegment } from '../types';
import { isAllowed } from './allowlist';
import { buildReplacement, type RuleContext } from './compile';

export interface RedactMatch {
  ruleId: string;
  original: string;
  replacement: string;
  contextBefore?: string;
  contextAfter?: string;
}

export interface RedactResult {
  output: string;
  counts: Record<string, number>;
  matches: RedactMatch[];
  segments?: {
    before: SanitizeSegment[];
    after: SanitizeSegment[];
  };
}

export interface RedactOptions {
  withSegments?: boolean;
  withMatches?: boolean;
}

export function sliceContext(
  text: string,
  index: number,
  length: number,
  chars: number,
): { contextBefore: string; contextAfter: string } {
  return {
    contextBefore: text.slice(Math.max(0, index - chars), index),
    contextAfter: text.slice(index + length, index + length + chars),
  };
}

function matchedRuleId(
  ruleIds: string[],
  groups: Record<string, string | undefined>,
): string | undefined {
  for (const id of ruleIds) {
    if (groups[id] !== undefined) {
      return id;
    }
  }

  return undefined;
}

export function redactLine(
  line: string,
  ctx: RuleContext,
  options: RedactOptions = {},
): RedactResult {
  const { compiled, ruleIds, rulesById, allow, contextChars } = ctx;
  const withSegments = options.withSegments ?? false;
  const withMatches = options.withMatches ?? false;

  if (!compiled) {
    return {
      output: line,
      counts: {},
      matches: [],
      segments: withSegments
        ? { before: [{ text: line, changed: false }], after: [{ text: line, changed: false }] }
        : undefined,
    };
  }

  compiled.lastIndex = 0;

  const counts: Record<string, number> = {};
  const matches: RedactMatch[] = [];
  const before: SanitizeSegment[] = [];
  const after: SanitizeSegment[] = [];
  let output = '';
  let cursor = 0;
  let match = compiled.exec(line);

  while (match !== null) {
    const ruleId = match.groups ? matchedRuleId(ruleIds, match.groups) : undefined;
    const rule = ruleId === undefined ? undefined : rulesById.get(ruleId);
    const original = match[0];

    if (rule === undefined || ruleId === undefined) {
      compiled.lastIndex = match.index + Math.max(original.length, 1);
      match = compiled.exec(line);
      continue;
    }

    const rejected =
      (rule.validate !== undefined && !rule.validate(original)) ||
      isAllowed(allow, ruleId, original);

    if (rejected) {
      compiled.lastIndex = match.index + Math.max(original.length, 1);
      match = compiled.exec(line);
      continue;
    }

    const replacement = buildReplacement(ctx, ruleId, original);

    if (withSegments) {
      if (match.index > cursor) {
        const gap = line.slice(cursor, match.index);
        before.push({ text: gap, changed: false });
        after.push({ text: gap, changed: false });
      }

      before.push({ text: original, changed: true });
      after.push({ text: replacement, changed: true });
    }

    output += line.slice(cursor, match.index) + replacement;
    cursor = match.index + original.length;
    counts[ruleId] = (counts[ruleId] ?? 0) + 1;

    if (withMatches) {
      matches.push({
        ruleId,
        original,
        replacement,
        ...(contextChars > 0 ? sliceContext(line, match.index, original.length, contextChars) : {}),
      });
    }

    if (original.length === 0) {
      compiled.lastIndex += 1;
    }

    match = compiled.exec(line);
  }

  output += line.slice(cursor);

  if (withSegments && cursor < line.length) {
    const tail = line.slice(cursor);
    before.push({ text: tail, changed: false });
    after.push({ text: tail, changed: false });
  }

  return {
    output,
    counts,
    matches,
    segments: withSegments ? { before, after } : undefined,
  };
}
