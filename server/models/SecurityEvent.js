const mongoose = require('mongoose');

// Recognised security-event types. Anything unexpected falls back to 'other'.
const EVENT_TYPES = [
    'login_failed',       // bad email/password on /auth/login
    'otp_failed',         // bad/expired parent OTP
    'unauthorized',       // missing/invalid JWT on a protected route (401)
    'forbidden',          // valid JWT but wrong role for the route (403)
    'rate_limited',       // request blocked by a rate limiter (429)
    'injection_blocked',  // NoSQL-operator payload stripped by the sanitizer
    'other'
];

// Severity buckets used by the dev-admin dashboard for colour-coding.
const SEVERITY = ['low', 'medium', 'high'];

const securityEventSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: EVENT_TYPES,
        default: 'other',
        required: true
    },
    severity: {
        type: String,
        enum: SEVERITY,
        default: 'low'
    },
    // The IP the request came from (honours 'trust proxy').
    ip: {
        type: String,
        index: true
    },
    // Best-effort identifier of who/what was targeted (email or phone attempted,
    // never a password). Helps spot which accounts are being probed.
    identifier: {
        type: String
    },
    method: String,
    path: String,
    userAgent: String,
    // Set only when the request carried a valid token (e.g. a forbidden attempt).
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    details: {
        type: Object
    }
}, {
    timestamps: true
});

// The dashboard queries are time-windowed and grouped by type/ip, so index those.
securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ ip: 1, createdAt: -1 });

// Keep the collection from growing without bound: auto-expire events after 90 days.
// (TTL deletes are best-effort/background, which is fine for security telemetry.)
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
SecurityEvent.EVENT_TYPES = EVENT_TYPES;
SecurityEvent.SEVERITY = SEVERITY;

module.exports = SecurityEvent;
