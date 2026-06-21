// Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert');

// Stub the model so logSecurityEvent never touches a real database.
const SecurityEvent = require('../models/SecurityEvent');
let writes = 0;
SecurityEvent.create = async () => { writes += 1; };

const { logSecurityEvent } = require('../utils/security');

const req = { ip: '203.0.113.7', method: 'POST', originalUrl: '/api/auth/login', headers: {} };

test('non-throttled event types are always written', async () => {
    writes = 0;
    await logSecurityEvent(req, 'login_failed', { identifier: 'a@b.com' });
    await logSecurityEvent(req, 'login_failed', { identifier: 'a@b.com' });
    await logSecurityEvent(req, 'login_failed', { identifier: 'a@b.com' });
    assert.strictEqual(writes, 3);
});

test('flood-prone event types are coalesced per (type, ip)', async () => {
    writes = 0;
    // Use a fresh ip so this test is independent of the throttle window above.
    const floodReq = { ...req, ip: '203.0.113.99' };
    await logSecurityEvent(floodReq, 'rate_limited', {});
    await logSecurityEvent(floodReq, 'rate_limited', {});
    await logSecurityEvent(floodReq, 'rate_limited', {});
    assert.strictEqual(writes, 1); // only the first within the cooldown window
});
