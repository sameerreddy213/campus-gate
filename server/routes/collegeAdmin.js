const express = require('express');
const multer = require('multer');
const {
    getDashboardStats,
    addWarden,
    getWardens,
    addStudent,
    getStudents,
    bulkUploadStudents,
    assignStudentsToWarden,
    getRequests,
    getReports,
    addWatchman,
    getWatchmen,
    deleteWatchman,
    getAuditLogs,
    deleteWarden,
    deleteStudent,
    getSettings,
    updateSettings
} = require('../controllers/collegeAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');

// Configure Multer for CSV upload (in-memory: serverless filesystems are read-only)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

const router = express.Router();

router.use(protect);
router.use(authorize('college-admin'));
router.use(tenant);

const { check } = require('express-validator');
const { validate } = require('../middleware/validationMiddleware');

router.get('/dashboard', getDashboardStats);

router.route('/wardens')
    .get(getWardens)
    .post([
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('phone', 'Phone number is required').not().isEmpty(),
        validate
    ], addWarden);

router.route('/wardens/:id')
    .delete(deleteWarden);

router.route('/students')
    .get(getStudents)
    .post([
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('phone', 'Phone number is required').not().isEmpty(),
        check('rollNumber', 'Roll number is required').not().isEmpty(),
        check('department', 'Department is required').not().isEmpty(),
        check('year', 'Year is required').not().isEmpty(),
        validate
    ], addStudent);

router.route('/students/:id')
    .delete(deleteStudent);

router.post('/students/bulk', upload.single('file'), bulkUploadStudents);

router.post('/assign', assignStudentsToWarden);

router.get('/requests', getRequests);
router.get('/reports', getReports);
router.get('/audit-logs', getAuditLogs);

router.route('/watchmen')
    .get(getWatchmen)
    .post(addWatchman);

router.route('/watchmen/:id')
    .delete(deleteWatchman);


router.route('/settings')
    .get(getSettings)
    .put(updateSettings);

module.exports = router;
