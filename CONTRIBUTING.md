# Contributing

This package is a regex + HMAC redaction engine. Public behaviour lives in `README.md`. This document is for people changing the engine or adding a rule.

## Layout

| Path | Role |
| --- | --- |
| `src/core` | Compile one combined `RegExp`, walk each line, HMAC tokens, reports, streaming |
| `src/rules/definitions` | Built-in rules (data + `validate`) |
| `src/rules/shared` | Shared validators (Luhn, Shannon entropy) |
| `src/io` | Web-standard sources/sinks |
| `src/node` | `node:fs` / `node:stream` adapters |
| `src/cli.ts` | `logtotal-sanitize` |

The root export must not import `node:*`.

## How a line is redacted

1. `compileRules` joins every selected rule's `patterns` (and `aggressivePatterns` when `aggressive` is true) into one regex with a named group per rule id.
2. Alternation order is priority. If two patterns could start at the same offset, the earlier rule wins.
3. `redactLine` walks matches left to right. `validate` returning `false`, or a `neverRedact` hit, leaves the text unchanged and sets `lastIndex` to the end of that span. A later rule that would have matched *inside* the skipped span is not retried. That is intentional (shadowing).
4. Lines that look like JSON (`{` / `[` after trim) go through `redactJsonLine`: `jsonKeys` redact by field name, other strings still use `redactLine`.
5. Replacement is HMAC-SHA-256(`ruleId || NUL || original`) truncated to 16 hex chars. `mask` uses prefix `R`; `pseudo` uses `rule.token`.

`alwaysRedact` is injected as rule id `custom` in front of the selected list. `neverRedact` is checked before replacement and beats every rule.

## Adding a built-in rule

1. `id` must match `/^[A-Za-z_$][A-Za-z0-9_$]*$/`.
2. Use only non-capturing groups in `patterns`. Capturing groups shift named-group indices for every other rule.
3. Prefer a tight regex plus `validate` (Luhn, allowlists, entropy) over a greedy pattern.
4. Put the file in `src/rules/definitions/` and append it to `builtinRules` in `src/rules/registry.ts` at the right priority: specific credential-shaped rules before broad identifiers.
5. Add `jsonKeys` when JSON field names should redact regardless of value shape.
6. Add cases in `tests/` that the rule *must* redact and cases it *must not* (false positives: versions, UUIDs used as ids, loopback, `uid=0(root)`).
7. Do not add comments in implementation files. Public TSDoc belongs only on symbols re-exported from `src/index.ts`, `src/node/index.ts`, and `src/rules/index.ts`.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run verify:pack
```
