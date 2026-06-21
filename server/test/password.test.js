const test = require('node:test');
const assert = require('node:assert');
const { generateTempPassword } = require('../utils/password');

test('generates a non-trivial temporary password', () => {
    const pw = generateTempPassword();
    assert.strictEqual(typeof pw, 'string');
    // 9 random bytes -> 12 base64url chars; comfortably above the 6-char minimum.
    assert.ok(pw.length >= 12, `expected >= 12 chars, got ${pw.length}`);
    // base64url alphabet only (no +, /, = padding).
    assert.match(pw, /^[A-Za-z0-9_-]+$/);
});

test('temporary passwords are unique across calls (not a fixed default)', () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) set.add(generateTempPassword());
    assert.strictEqual(set.size, 100);
});
