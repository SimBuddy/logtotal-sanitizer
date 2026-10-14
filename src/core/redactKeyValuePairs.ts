import type { SanitizeRule } from '../types';
import { jsonKeyMatcher, shouldPreserveJsonValue } from './jsonKeyMatcher';

/**
 * A value whose field name alone decides its rule, found in a line that is not a whole JSON
 * document: a pretty-printed record, JSON embedded in a text line, or a Python dict repr.
 */
export interface KeyValueMatch {
  /** Offset of the raw value in the line. */
  start: number;
  /** Offset just past the raw value. */
  end: number;
  /** The value with its string escapes decoded, used for tokens, allowlists and reports. */
  value: string;
  rule: SanitizeRule;
  /** Quote to wrap the token in, so a bare number stays a valid literal once replaced. */
  quote: string;
}

const NUMBER = '(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)(?![\\w.:+-])';

// "key": "value" | "key": 1.5. The lookbehind skips quotes that are themselves escaped.
const DOUBLE_QUOTED = new RegExp(
  `(?<![\\\\\\w])"((?:[^"\\\\\\r\\n]|\\\\.){1,128})"\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|${NUMBER})`,
  'g',
);

// \"key\": \"value\" — JSON serialized inside another JSON string. Inside the value, \\\" is an
// escaped quote of the inner document and \\\\ an escaped backslash.
const ESCAPED = new RegExp(
  `\\\\"((?:[^"\\\\\\r\\n]|\\\\\\\\){1,128})\\\\"\\s*:\\s*(?:\\\\"((?:\\\\\\\\\\\\"|\\\\\\\\|\\\\[^"\\\\]|[^"\\\\])*)\\\\"|${NUMBER})`,
  'g',
);

// 'key': 'value' | 'key': "value" | 'key': 1.5 — Python dict repr.
const SINGLE_QUOTED = new RegExp(
  `(?<![\\\\\\w])'((?:[^'\\\\\\r\\n]|\\\\.){1,128})'\\s*:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|${NUMBER})`,
  'g',
);

function decodeJsonString(raw: string): string {
  if (!raw.includes('\\')) {
    return raw;
  }

  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}

function decodeEscapedJsonString(raw: string): string {
  return decodeJsonString(decodeJsonString(raw));
}

function decodePythonString(raw: string): string {
  return raw.includes('\\') ? raw.replace(/\\(['"\\])/g, '$1') : raw;
}

interface Candidate {
  keyStart: number;
  match: KeyValueMatch;
}

function collect(
  line: string,
  regex: RegExp,
  rules: SanitizeRule[],
  decode: (raw: string) => string,
  numberQuote: string,
  out: Candidate[],
): void {
  const matcher = jsonKeyMatcher(rules);
  regex.lastIndex = 0;

  for (let found = regex.exec(line); found !== null; found = regex.exec(line)) {
    const rawKey = found[1]!;
    let rawValue: string | undefined;
    let quote = '';

    for (let group = 2; group < found.length; group += 1) {
      if (found[group] !== undefined) {
        rawValue = found[group];
        quote = group === found.length - 1 ? numberQuote : '';
        break;
      }
    }

    if (rawValue === undefined) {
      continue;
    }

    const value = quote === '' ? decode(rawValue) : rawValue;

    if (shouldPreserveJsonValue(value)) {
      continue;
    }

    const rule = matcher.resolve(decode(rawKey));

    if (!rule) {
      continue;
    }

    const end = found.index + found[0].length - (quote === '' ? 1 : 0);
    const valueEnd = quote === '' && regex === ESCAPED ? end - 1 : end;

    out.push({
      keyStart: found.index,
      match: { start: valueEnd - rawValue.length, end: valueEnd, value, rule, quote },
    });
  }
}

/**
 * Finds `"key": value` pairs whose key belongs to a rule, in a line that is not a whole JSON
 * document. Returns matches sorted by offset, without overlaps.
 */
export function findKeyValueMatches(line: string, rules: SanitizeRule[]): KeyValueMatch[] {
  const doubleQuoted = line.includes('":') || line.includes('" :');
  const singleQuoted = line.includes("':") || line.includes("' :");

  if (!doubleQuoted && !singleQuoted) {
    return [];
  }

  const candidates: Candidate[] = [];

  if (doubleQuoted) {
    collect(line, DOUBLE_QUOTED, rules, decodeJsonString, '"', candidates);

    if (line.includes('\\"')) {
      collect(line, ESCAPED, rules, decodeEscapedJsonString, '\\"', candidates);
    }
  }

  if (singleQuoted) {
    collect(line, SINGLE_QUOTED, rules, decodePythonString, "'", candidates);
  }

  if (candidates.length === 0) {
    return [];
  }

  candidates.sort((left, right) => left.keyStart - right.keyStart);

  const matches: KeyValueMatch[] = [];
  let floor = 0;

  for (const { keyStart, match } of candidates) {
    if (keyStart >= floor) {
      matches.push(match);
      floor = match.end;
    }
  }

  return matches;
}
