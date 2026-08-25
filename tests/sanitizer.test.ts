import { describe, expect, it } from 'vitest';

import { defineRule, fromString, generateKey, sanitizeStream, sanitizeText, toStringSink } from '../src/index.js';

const KEY = '0123456789abcdef'.repeat(4);

describe('sanitizeText', () => {
  it('redacts an IPv4 address with a stable IP token', () => {
    const { output, report } = sanitizeText('login from 10.0.0.1', {
      key: KEY,
      keyEncoding: 'hex',
      rules: ['ips'],
    });

    expect(output).toMatch(/^login from <IP:[0-9a-f]{16}>$/);
    expect(report.counts.ips).toBe(1);
    expect(report.totalMatches).toBe(1);
  });

  it('keeps the same token for the same value', () => {
    const { output } = sanitizeText('10.0.0.1 and 10.0.0.1', {
      key: KEY,
      keyEncoding: 'hex',
      rules: ['ips'],
    });
    const tokens = output.match(/<IP:[0-9a-f]{16}>/g);
    expect(tokens).toHaveLength(2);
    expect(tokens?.[0]).toBe(tokens?.[1]);
  });

  it('neverRedact values win over rules', () => {
    const { output, report } = sanitizeText('login from 10.0.0.1 and 10.0.0.2', {
      key: KEY,
      keyEncoding: 'hex',
      rules: ['ips'],
      neverRedact: { values: ['10.0.0.1'] },
    });

    expect(output).toMatch(/^login from 10\.0\.0\.1 and <IP:[0-9a-f]{16}>$/);
    expect(report.counts.ips).toBe(1);
  });

  it('neverRedact byRule only skips that rule', () => {
    const { output } = sanitizeText('10.0.0.1 host=app.internal.example', {
      key: KEY,
      keyEncoding: 'hex',
      rules: ['ips', 'hosts'],
      neverRedact: { byRule: [{ ruleId: 'ips', values: ['10.0.0.1'] }] },
    });

    expect(output).toContain('10.0.0.1');
    expect(output).toMatch(/<HOST:[0-9a-f]{16}>/);
  });

  it('alwaysRedact values are redacted even without a matching built-in rule', () => {
    const { output, report } = sanitizeText('seen acme-internal-host in the log', {
      key: KEY,
      keyEncoding: 'hex',
      rules: [],
      alwaysRedact: { values: ['acme-internal-host'] },
    });

    expect(output).toMatch(/^seen <CUSTOM:[0-9a-f]{16}> in the log$/);
    expect(report.counts.custom).toBe(1);
  });

  it('neverRedact wins over alwaysRedact', () => {
    const { output, report } = sanitizeText('keep acme-internal-host here', {
      key: KEY,
      keyEncoding: 'hex',
      rules: [],
      alwaysRedact: { values: ['acme-internal-host'] },
      neverRedact: { values: ['acme-internal-host'] },
    });

    expect(output).toBe('keep acme-internal-host here');
    expect(report.totalMatches).toBe(0);
  });

  it('redacts JSON fields by name', () => {
    const { report, output } = sanitizeText(
      JSON.stringify({ password: 'correct-horse', token: 'correct-horse' }),
      { key: KEY, keyEncoding: 'hex', rules: ['secrets'] },
    );

    const parsed = JSON.parse(output) as { password: string; token: string };
    expect(parsed.password).toMatch(/^<R:[0-9a-f]{16}>$/);
    expect(parsed.token).toBe(parsed.password);
    expect(report.counts.secrets).toBe(2);
  });

  it('accepts a custom rule via defineRule', () => {
    const ticket = defineRule({
      id: 'ticket',
      label: 'Tickets',
      description: 'Synthetic ticket ids',
      mode: 'pseudo',
      token: 'TICKET',
      patterns: ['(?:CASE-\\d{6})'],
    });

    const { output, report } = sanitizeText('opened CASE-123456 today', {
      key: KEY,
      keyEncoding: 'hex',
      rules: [ticket],
    });

    expect(output).toMatch(/^opened <TICKET:[0-9a-f]{16}> today$/);
    expect(report.counts.ticket).toBe(1);
  });

  it('rejects an invalid custom rule id', () => {
    expect(() =>
      defineRule({
        id: 'not-valid',
        label: 'Bad',
        description: '',
        mode: 'pseudo',
        token: 'BAD',
        patterns: ['(?:x)'],
      }),
    ).toThrow(/identifier/);
  });

  it('omits replacement context unless report.contextChars is set', () => {
    const without = sanitizeText('10.0.0.1', { key: KEY, keyEncoding: 'hex', rules: ['ips'] });
    expect(without.report.replacements[0]?.contextBefore).toBeUndefined();

    const withCtx = sanitizeText('pre 10.0.0.1 post', {
      key: KEY,
      keyEncoding: 'hex',
      rules: ['ips'],
      report: { contextChars: 10 },
    });
    expect(withCtx.report.replacements[0]?.contextBefore).toBe('pre ');
  });
});

describe('sanitizeStream', () => {
  it('matches sanitizeText for the same input', async () => {
    const text = 'connect 10.0.0.1\nconnect 10.0.0.2\n';
    const options = { key: KEY, keyEncoding: 'hex' as const, rules: ['ips'] as const };
    const inMemory = sanitizeText(text, options);
    const sink = toStringSink();
    const report = await sanitizeStream(fromString(text), sink, options);

    expect(sink.text).toBe(inMemory.output);
    expect(report.totalMatches).toBe(inMemory.report.totalMatches);
  });
});

describe('generateKey', () => {
  it('returns 64 hex characters', () => {
    const key = generateKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
