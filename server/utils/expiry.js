const OutingRequest = require('../models/OutingRequest');

// Grace period (ms) after the planned out date before an un-acted-on request is
// considered stale and auto-expired.
const STALE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Lazily expire requests that were never acted on. Only PRE-departure approval
 * states are expired — never 'approved', because an approved request is a valid,
 * still-actionable pass that the gate must be able to mark "out" even if the
 * student leaves later than the planned out date. Called opportunistically at
 * the start of list/dashboard reads (cheap updateMany, no-op when nothing matches).
 *
 * @param {string|ObjectId} [collegeId] Scope to a single tenant when provided.
 */
const expireStaleRequests = async (collegeId) => {
    try {
        const cutoff = new Date(Date.now() - STALE_GRACE_MS);
        const filter = {
            // Pre-departure approval states only ('parent-approved' is transient and
            // never persists — parent approval moves straight to 'pending-warden').
            status: { $in: ['pending-parent', 'pending-warden'] },
            outDate: { $lt: cutoff }
        };
        if (collegeId) filter.collegeId = collegeId;

        await OutingRequest.updateMany(filter, { $set: { status: 'expired' } });
    } catch (err) {
        console.error('expireStaleRequests failed:', err.message);
    }
};

module.exports = { expireStaleRequests, STALE_GRACE_MS };
