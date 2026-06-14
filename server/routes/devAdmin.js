const express = require('express');
const {
    createCollege,
    getColleges,
    createCollegeAdmin,
    getGlobalAnalytics,
    getAnalyticsBreakdown,
    getAuditLogs,
    deleteCollege,
    updateCollege,
    toggleCollegeStatus
} = require('../controllers/devAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected and restricted to dev-admin
router.use(protect);
router.use(authorize('dev-admin'));

router.route('/colleges')
    .get(getColleges)
    .post(createCollege);

router.route('/colleges/:id')
    .put(updateCollege)
    .delete(deleteCollege);

router.post('/create-admin', createCollegeAdmin);
router.get('/analytics', getGlobalAnalytics);
router.get('/analytics/breakdown', getAnalyticsBreakdown);
router.get('/audit-logs', getAuditLogs);
router.put('/colleges/:id/status', toggleCollegeStatus);

module.exports = router;
