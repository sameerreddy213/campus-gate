const express = require('express');
const {
    getDashboardStats,
    getApprovedRequests,
    getOutRequests,
    markStudentOut,
    markStudentReturned,
    verifyPass
} = require('../controllers/watchmanController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('watchman'));
router.use(tenant);

router.get('/dashboard', getDashboardStats);
router.get('/requests/approved', getApprovedRequests);
router.get('/requests/out', getOutRequests);

router.post('/verify', verifyPass);

router.put('/requests/:id/out', markStudentOut);
router.put('/requests/:id/returned', markStudentReturned);

module.exports = router;
