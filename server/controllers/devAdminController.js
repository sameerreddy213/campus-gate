const College = require('../models/College');
const User = require('../models/User');
const OutingRequest = require('../models/OutingRequest');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { logAudit } = require('../utils/audit');

// @desc    Create a new college
// @route   POST /api/dev-admin/colleges
// @access  Private (Dev Admin)
exports.createCollege = asyncHandler(async (req, res, next) => {
    const { name, code, city } = req.body;
    const college = await College.create({ name, code, city });

    await logAudit(req, 'college.create', { collegeId: college._id, name: college.name });

    res.status(201).json({
        success: true,
        data: college
    });
});

// @desc    Get all colleges
// @route   GET /api/dev-admin/colleges
// @access  Private (Dev Admin)
exports.getColleges = asyncHandler(async (req, res, next) => {
    const colleges = await College.find();

    // Enhance with counts
    // This could be optimized with aggregation
    const populatedColleges = await Promise.all(colleges.map(async (college) => {
        const studentCount = await User.countDocuments({ collegeId: college._id, role: 'student' }); // User role student isn't the Student model count
        // Wait, User has role 'student', but Student model has the details. 
        // Student model doesn't have role, it links to User.
        // Actually the prompt says "Student" model.
        // Let's count 'Student' documents for studentCount.
        const Student = require('../models/Student');
        const sCount = await Student.countDocuments({ collegeId: college._id });
        const wCount = await User.countDocuments({ collegeId: college._id, role: 'warden' });

        // Find admin name
        const admin = await User.findOne({ collegeId: college._id, role: 'college-admin' });

        return {
            ...college.toObject(),
            studentCount: sCount,
            wardenCount: wCount,
            adminName: admin ? admin.name : 'N/A',
            adminId: admin ? admin._id : null
        };
    }));

    res.status(200).json({
        success: true,
        data: populatedColleges
    });
});

// @desc    Create college admin
// @route   POST /api/dev-admin/create-admin
// @access  Private (Dev Admin)
exports.createCollegeAdmin = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, collegeId } = req.body;

    const user = await User.create({
        name,
        email,
        password,
        phone,
        collegeId,
        role: 'college-admin'
    });

    const userData = user.toObject();
    delete userData.password;

    await logAudit(req, 'admin.create', { userId: user._id, email: user.email, collegeId });

    res.status(201).json({
        success: true,
        data: userData
    });
});

// @desc    Global Analytics
// @route   GET /api/dev-admin/analytics
// @access  Private (Dev Admin)
exports.getGlobalAnalytics = asyncHandler(async (req, res, next) => {
    const collegesCount = await College.countDocuments();
    const Student = require('../models/Student');
    const studentsCount = await Student.countDocuments();
    const wardensCount = await User.countDocuments({ role: 'warden' });
    const requestsCount = await OutingRequest.countDocuments();

    res.status(200).json({
        success: true,
        data: {
            colleges: collegesCount,
            students: studentsCount,
            wardens: wardensCount,
            totalRequests: requestsCount
        }
    });
});

// @desc    Detailed analytics (status breakdown, per-college, monthly trend)
// @route   GET /api/dev-admin/analytics/breakdown
// @access  Private (Dev Admin)
exports.getAnalyticsBreakdown = asyncHandler(async (req, res, next) => {
    // Status breakdown
    const statusAgg = await OutingRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusData = statusAgg.map(s => ({ status: s._id, count: s.count }));

    // Per-college request counts (top 8)
    const perCollegeAgg = await OutingRequest.aggregate([
        { $group: { _id: '$collegeId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
    ]);
    const collegeIds = perCollegeAgg.map(c => c._id);
    const colleges = await College.find({ _id: { $in: collegeIds } }).select('name code');
    const collegeMap = {};
    colleges.forEach(c => { collegeMap[c._id.toString()] = c.code || c.name; });
    const collegeData = perCollegeAgg.map(c => ({
        college: c._id ? (collegeMap[c._id.toString()] || 'Unknown') : 'Unknown',
        requests: c.count
    }));

    // Monthly trend for the last 6 months
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthAgg = await OutingRequest.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 }
            }
        }
    ]);
    const monthLookup = {};
    monthAgg.forEach(m => { monthLookup[`${m._id.year}-${m._id.month}`] = m.count; });
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData.push({
            month: monthNames[d.getMonth()],
            requests: monthLookup[`${d.getFullYear()}-${d.getMonth() + 1}`] || 0
        });
    }

    res.status(200).json({
        success: true,
        data: { statusData, collegeData, monthlyData }
    });
});

// @desc    View audit logs (global)
// @route   GET /api/dev-admin/audit-logs
// @access  Private (Dev Admin)
exports.getAuditLogs = asyncHandler(async (req, res, next) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const logs = await AuditLog.find(filter)
        .populate('userId', 'name email role')
        .populate('collegeId', 'name code')
        .sort({ createdAt: -1 })
        .limit(limit);

    res.status(200).json({ success: true, data: logs });
});

// @desc    Delete College
// @route   DELETE /api/dev-admin/colleges/:id
// @access  Private (Dev Admin)
exports.deleteCollege = asyncHandler(async (req, res, next) => {
    const college = await College.findById(req.params.id);

    if (!college) {
        return next(new ErrorResponse('College not found', 404));
    }

    // Delete all associated data
    await User.deleteMany({ collegeId: college._id });
    // Dynamically require to avoid circular deps if any
    const Student = require('../models/Student');
    await Student.deleteMany({ collegeId: college._id });
    await OutingRequest.deleteMany({ collegeId: college._id });

    await college.deleteOne();

    await logAudit(req, 'college.delete', { collegeId: college._id, name: college.name });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Toggle college status (active/suspended)
// @route   PUT /api/dev-admin/colleges/:id/status
// @access  Private (Dev Admin)
exports.toggleCollegeStatus = asyncHandler(async (req, res, next) => {
    const college = await College.findById(req.params.id);

    if (!college) {
        return next(new ErrorResponse(`College not found with id of ${req.params.id}`, 404));
    }

    // Toggle status
    college.status = college.status === 'active' ? 'suspended' : 'active';
    await college.save();

    await logAudit(req, 'college.status_toggle', { collegeId: college._id, status: college.status });

    res.status(200).json({
        success: true,
        data: college
    });
});

// @desc    Update College
// @route   PUT /api/dev-admin/colleges/:id
// @access  Private (Dev Admin)
exports.updateCollege = asyncHandler(async (req, res, next) => {
    const { name, code, city, status } = req.body;

    let college = await College.findById(req.params.id);

    if (!college) {
        return next(new ErrorResponse(`College not found with id of ${req.params.id}`, 404));
    }

    // Update fields
    if (name) college.name = name;
    if (code) college.code = code;
    if (city) college.city = city;
    if (status) college.status = status;

    await college.save();

    res.status(200).json({
        success: true,
        data: college
    });
});
