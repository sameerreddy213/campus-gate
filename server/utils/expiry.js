const OutingRequest = require('../models/OutingRequest');

// Grace period (ms) after the planned out date before an un-used approval is
// considered stale and auto-expired.
const STALE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Lazily expire requests that were never acted on. A request that is still in a
 * pre-departure state (pending/approved) well past its planned out date is
 * unlikely to be used, so we move it to 'expired'. Called opportunistically at
 * the start of list/dashboard reads (cheap updateMany, no-op when nothing matches).
 *
 * @param {string|ObjectId} [collegeId] Scope to a single tenant when provided.
 */
const expireStaleRequests = async (collegeId) => {
    try {
        const cutoff = new Date(Date.now() - STALE_GRACE_MS);
        const filter = {
            status: { $in: ['pending-parent', 'parent-approved', 'pending-warden', 'approved'] },
            outDate: { $lt: cutoff }
        };
        if (collegeId) filter.collegeId = collegeId;

        await OutingRequest.updateMany(filter, { $set: { status: 'expired' } });
    } catch (err) {
        console.error('expireStaleRequests failed:', err.message);
    }
};

/**
 * True when a student is currently out past their expected return date.
 * @param {object} request A plain OutingRequest object.
 */
const isOverstay = (request) => {
    if (!request || request.status !== 'out' || !request.returnDate) return false;
    return new Date(request.returnDate).getTime() < Date.now();
};

module.exports = { expireStaleRequests, isOverstay, STALE_GRACE_MS };
