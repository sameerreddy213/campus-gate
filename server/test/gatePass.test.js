// Run with: node --test  (Node's built-in test runner, no dependencies)
const { test } = require('node:test');
const assert = require('node:assert');

// gatePass signs/verifies with JWT_SECRET, so set one before requiring it.
process.env.JWT_SECRET = 'unit-test-secret';
const { signGatePass, verifyGatePass } = require('../utils/gatePass');

const ID = '507f1f77bcf86cd799439011';

test('signs and verifies a valid pass (roundtrip)', () => {
    const token = signGatePass(ID);
    const result = verifyGatePass(token);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.requestId, ID);
});

test('rejects a tampered signature', () => {
    const token = signGatePass(ID);
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    assert.strictEqual(verifyGatePass(tampered).valid, false);
});

test('rejects malformed / garbage tokens', () => {
    assert.strictEqual(verifyGatePass('garbage').valid, false);
    assert.strictEqual(verifyGatePass('').valid, false);
    assert.strictEqual(verifyGatePass(null).valid, false);
});

test('rejects an expired pass', () => {
    const token = signGatePass(ID, Date.now() - 1000); // already expired
    const result = verifyGatePass(token);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'expired');
});

test('rejects a pass signed with a different secret', () => {
    const token = signGatePass(ID);
    process.env.JWT_SECRET = 'a-different-secret';
    // Re-require with a fresh module cache so the new secret is used.
    delete require.cache[require.resolve('../utils/gatePass')];
    const { verifyGatePass: verifyWithOtherSecret } = require('../utils/gatePass');
    assert.strictEqual(verifyWithOtherSecret(token).valid, false);
    // restore
    process.env.JWT_SECRET = 'unit-test-secret';
    delete require.cache[require.resolve('../utils/gatePass')];
});
