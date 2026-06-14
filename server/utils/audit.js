const AuditLog = require('../models/AuditLog');

/**
 * Record an audit log entry. Fire-and-forget: never throws, so it can be
 * awaited or not without breaking the request it is logging.
 *
 * @param {object} req       Express request (used for the acting user + IP)
 * @param {string} action    Short machine-ish action name, e.g. 'request.approve'
 * @param {object} [details] Arbitrary context (ids, before/after, etc.)
 */
const logAudit = async (req, action, details = {}) => {
    try {
        await AuditLog.create({
            userId: req.user ? req.user.id : undefined,
            action,
            details,
            // req.ip honours the configured 'trust proxy' hop; prefer it over the
            // raw, client-spoofable X-Forwarded-For header.
            ip: req.ip,
            collegeId: req.user ? req.user.collegeId : undefined
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

module.exports = { logAudit };
