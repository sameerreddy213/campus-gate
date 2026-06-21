const express = require('express');
const {
    getDashboardStats,
    getAssignedStudents,
    getRequests,
    updateRequestStatus,
    markStudentOut,
    markStudentReturned,
    getHistory
} = require('../controllers/wardenController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('warden'));
router.use(tenant);

router.get('/dashboard', getDashboardStats);
router.get('/students', getAssignedStudents);
router.get('/requests', getRequests);
router.get('/history', getHistory);
router.get('/settings', require('../controllers/wardenController').getSettings);

router.put('/requests/:id', updateRequestStatus);
router.put('/requests/:id/out', markStudentOut);
router.put('/requests/:id/returned', markStudentReturned);

module.exports = router;
