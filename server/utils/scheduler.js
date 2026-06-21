const cron = require('node-cron');
const OutingRequest = require('../models/OutingRequest');
const { expireStaleRequests } = require('./expiry');
const { createNotification, notifyParent } = require('../controllers/notificationController');

// Background maintenance that must happen independent of anyone opening a page:
//   1. Expire stale, un-acted-on requests (previously only ran lazily on reads).
//   2. Detect overstays (students still 'out' past their expected return), flag
//      them on the request, and notify the warden + parent exactly once.

const sweepOverstays = async () => {
    const now = new Date();
    const overdue = await OutingRequest.find({
        status: 'out',
        returnDate: { $lt: now },
        overstayNotified: { $ne: true }
    }).populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } });

    for (const request of overdue) {
        try {
            request.overstay = true;
            request.overstayNotified = true;
            await request.save();

            const student = request.studentId;
            const name = student?.userId?.name || 'A student';

            if (request.wardenId) {
                await createNotification(
                    request.wardenId,
                    `${name} is overdue — not returned by the expected time`,
                    'warning',
                    request._id
                );
            }
            if (student) {
                await notifyParent(
                    student,
                    `${name} has not returned to campus by the expected time`,
                    'warning',
                    request._id
                );
            }
        } catch (err) {
            console.error('Overstay sweep failed for request', request._id, err.message);
        }
    }

    return overdue.length;
};

// Run one maintenance pass. Exported so it can be unit-tested / triggered manually.
const runMaintenance = async () => {
    await expireStaleRequests(); // global (all tenants)
    await sweepOverstays();
};

// Schedule the recurring job. Disabled in serverless (no long-lived process) and
// opt-out-able via ENABLE_SCHEDULER=false. Safe to call once at server boot.
const startScheduler = () => {
    if (process.env.ENABLE_SCHEDULER === 'false') {
        console.log('Scheduler disabled via ENABLE_SCHEDULER=false');
        return null;
    }
    // Every 15 minutes.
    const task = cron.schedule('*/15 * * * *', () => {
        runMaintenance().catch((err) => console.error('Scheduled maintenance error:', err.message));
    });
    console.log('Maintenance scheduler started (every 15 minutes)');
    return task;
};

module.exports = { startScheduler, runMaintenance, sweepOverstays };
