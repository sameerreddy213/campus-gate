const crypto = require('crypto');

// A gate pass is a compact, signed, self-expiring token that encodes a single
// outing request id. The student's QR code carries this token (not the raw id),
// and the watchman's /verify endpoint validates the signature + expiry server-side
// before a mark-out/return is allowed. This stops a student from fabricating or
// replaying a pass for a request that isn't theirs / isn't currently actionable.
//
// Format:  base64url(payload).base64url(hmacSha256(payload, JWT_SECRET))
// payload: "<requestId>.<expiryEpochMs>"

const b64url = (buf) => Buffer.from(buf).toString('base64url');

const sign = (payload) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET || '')
        .update(payload)
        .digest('base64url');

// Default validity window for a pass once issued.
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Issue a signed gate pass for a request.
 * @param {string} requestId         The OutingRequest _id.
 * @param {number} [expiresAtMs]     Absolute expiry (defaults to now + 12h).
 * @returns {string} the token to embed in the QR code.
 */
const signGatePass = (requestId, expiresAtMs) => {
    const exp = expiresAtMs || Date.now() + DEFAULT_TTL_MS;
    const payload = `${requestId}.${exp}`;
    return `${b64url(payload)}.${sign(payload)}`;
};

/**
 * Verify a gate pass token.
 * @param {string} token
 * @returns {{ valid: boolean, requestId?: string, reason?: string }}
 */
const verifyGatePass = (token) => {
    if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'missing' };
    }
    const parts = token.split('.');
    if (parts.length !== 2) {
        return { valid: false, reason: 'malformed' };
    }
    const [encodedPayload, providedSig] = parts;

    let payload;
    try {
        payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    } catch (e) {
        return { valid: false, reason: 'malformed' };
    }

    const expectedSig = sign(payload);
    // Constant-time comparison to avoid signature timing oracles.
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { valid: false, reason: 'bad_signature' };
    }

    const [requestId, expStr] = payload.split('.');
    const exp = Number(expStr);
    if (!requestId || !Number.isFinite(exp)) {
        return { valid: false, reason: 'malformed' };
    }
    if (Date.now() > exp) {
        return { valid: false, reason: 'expired' };
    }

    return { valid: true, requestId };
};

module.exports = { signGatePass, verifyGatePass, DEFAULT_TTL_MS };
