const SecurityEvent = require('../models/SecurityEvent');

// Default severity per event type. Callers can override via opts.severity.
const SEVERITY_BY_TYPE = {
    login_failed: 'medium',
    otp_failed: 'medium',
    unauthorized: 'low',
    forbidden: 'high',
    rate_limited: 'high',
    injection_blocked: 'high',
    other: 'low'
};

// Cap stored strings so a malicious client can't bloat the collection.
const truncate = (val, max = 256) =>
    typeof val === 'string' ? val.slice(0, max) : val;

// High-volume event types are coalesced per (type, ip): during a flood we must
// not turn every blocked request into a DB write (that would amplify a DoS into
// our own database). We log at most one event per key per cooldown window and
// carry the suppressed count forward into the next stored event.
const THROTTLE_MS = 60 * 1000;
const THROTTLE_TYPES = new Set(['rate_limited', 'unauthorized', 'injection_blocked']);
const MAX_THROTTLE_KEYS = 5000; // bound memory under a distributed flood
const lastLogged = new Map();

// Returns { skip, suppressed } — skip=true means do not write this event.
const throttle = (type, ip) => {
    if (!THROTTLE_TYPES.has(type)) return { skip: false, suppressed: 0 };
    const key = `${type}:${ip || 'unknown'}`;
    const now = Date.now();
    const prev = lastLogged.get(key);
    if (prev && now - prev.ts < THROTTLE_MS) {
        prev.suppressed += 1;
        return { skip: true, suppressed: 0 };
    }
    // Cheap eviction so the map can't grow without bound.
    if (lastLogged.size > MAX_THROTTLE_KEYS) lastLogged.clear();
    const suppressed = prev ? prev.suppressed : 0;
    lastLogged.set(key, { ts: now, suppressed: 0 });
    return { skip: false, suppressed };
};

/**
 * Record a security-relevant event (failed login, blocked request, etc.).
 *
 * Fire-and-forget: it swallows its own errors so a logging failure can never
 * break the request being logged. Safe to `await` or not.
 *
 * @param {object} req               Express request (for ip / path / UA)
 * @param {string} type              One of SecurityEvent.EVENT_TYPES
 * @param {object} [opts]
 * @param {string} [opts.identifier] Email/phone that was targeted (never a secret)
 * @param {string} [opts.severity]   Override the default severity for this type
 * @param {object} [opts.details]    Extra context
 */
const logSecurityEvent = async (req, type, opts = {}) => {
    try {
        const { identifier, severity, details } = opts;
        const ip = req && req.ip;

        const { skip, suppressed } = throttle(type, ip);
        if (skip) return;

        await SecurityEvent.create({
            type,
            severity: severity || SEVERITY_BY_TYPE[type] || 'low',
            // req.ip honours the configured 'trust proxy' hop.
            ip,
            identifier: truncate(identifier),
            method: req && req.method,
            path: truncate(req && (req.originalUrl || req.url), 256),
            userAgent: truncate(req && req.headers && req.headers['user-agent'], 256),
            userId: req && req.user ? req.user.id : undefined,
            // Record how many further events were coalesced into this one.
            details: suppressed > 0 ? { ...details, coalescedSincePrevious: suppressed } : details
        });
    } catch (err) {
        // Never throw from the security logger.
        console.error('Security event log failed:', err.message);
    }
};

module.exports = { logSecurityEvent };
