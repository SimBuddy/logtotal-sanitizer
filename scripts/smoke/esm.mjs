import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');

const { createSanitizer, defineRule, builtinRuleIds } = await import(
  pathToFileURL(path.join(distDir, 'index.js')).href
);
const nodeEntry = await import(pathToFileURL(path.join(distDir, 'node.js')).href);
const rulesEntry = await import(pathToFileURL(path.join(distDir, 'rules.js')).href);

assert.equal(typeof createSanitizer, 'function', 'index.js must export createSanitizer');
assert.equal(typeof defineRule, 'function', 'index.js must export defineRule');
assert.ok(builtinRuleIds.length > 0, 'index.js must export a non-empty builtinRuleIds');
assert.equal(typeof nodeEntry.sanitizeFile, 'function', 'node.js must export sanitizeFile');
assert.equal(typeof nodeEntry.createSanitizer, 'function', 'node.js must re-export the core');
assert.ok(rulesEntry.builtinRules.length > 0, 'rules.js must export builtinRules');

const sanitizer = createSanitizer({ key: 'ab'.repeat(16), rules: ['ips'] });
const { output, report } = sanitizer.sanitizeText('connect from 203.0.113.42 ok\n');

assert.ok(!output.includes('203.0.113.42'), 'the address must be replaced');
assert.equal(report.counts.ips, 1, 'the report must count one match');

console.log('ESM smoke test passed.');
