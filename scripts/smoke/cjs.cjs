const assert = require('node:assert/strict');
const path = require('node:path');

const distDir = path.resolve(__dirname, '../../dist');

const { createSanitizer, builtinRuleIds, isSanitizerError } = require(
  path.join(distDir, 'index.cjs'),
);
const nodeEntry = require(path.join(distDir, 'node.cjs'));
const rulesEntry = require(path.join(distDir, 'rules.cjs'));

assert.equal(typeof createSanitizer, 'function', 'index.cjs must export createSanitizer');
assert.ok(builtinRuleIds.length > 0, 'index.cjs must export a non-empty builtinRuleIds');
assert.equal(typeof nodeEntry.sanitizeFile, 'function', 'node.cjs must export sanitizeFile');
assert.ok(rulesEntry.builtinRules.length > 0, 'rules.cjs must export builtinRules');

const sanitizer = createSanitizer({ key: 'ab'.repeat(16), rules: ['ips'] });
const { output, report } = sanitizer.sanitizeText('connect from 203.0.113.42 ok\n');

assert.ok(!output.includes('203.0.113.42'), 'the address must be replaced');
assert.equal(report.counts.ips, 1, 'the report must count one match');

let caught;

try {
  createSanitizer({ rules: ['definitely-not-a-rule'] });
} catch (error) {
  caught = error;
}

assert.ok(caught !== undefined, 'an unknown rule must throw');
assert.ok(isSanitizerError(caught), 'isSanitizerError must recognize errors across entry points');
assert.equal(caught.code, 'UNKNOWN_RULE', 'the error must carry a stable code');

console.log('CJS smoke test passed.');
